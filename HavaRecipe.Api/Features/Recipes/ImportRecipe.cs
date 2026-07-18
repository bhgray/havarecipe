using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using HtmlAgilityPack;
using Microsoft.AspNetCore.Http.HttpResults;
using Schema.NET;

namespace HavaRecipe.Api.Features.Recipes;

// Fetches a recipe page, extracts its embedded schema.org Recipe JSON-LD (from a
// <script type="application/ld+json"> tag), and returns it in the shape CreateRecipe's
// RecipeJsonLd field expects. Read-only: it does not write to the database, so the
// caller can review the result before POSTing it to /recipes.
public static class ImportRecipe
{
    public record Request(string Url);

    // Recipe is the normalized, rendering-ready view; RecipeJsonLd is kept alongside it so
    // callers can still inspect (and re-post) the original structured data.
    public record Response(
        string SuggestedSlug,
        string SuggestedName,
        JsonElement RecipeJsonLd,
        RecipeView Recipe);

    public static RouteGroupBuilder MapImportRecipe(this RouteGroupBuilder group)
    {
        group.MapPost("/import", HandleAsync);
        return group;
    }

    private static async Task<Results<Ok<Response>, ValidationProblem, ProblemHttpResult>> HandleAsync(
        Request request, IHttpClientFactory httpClientFactory, CancellationToken ct)
    {
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["url"] = ["A valid absolute http(s) URL is required."]
            });
        }

        if (!await IsSafeToFetchAsync(uri, ct))
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["url"] = ["That host cannot be fetched."]
            });
        }

        var httpClient = httpClientFactory.CreateClient("RecipeImport");
        string html;
        try
        {
            using var response = await httpClient.GetAsync(uri, ct);
            if (!response.IsSuccessStatusCode)
            {
                return TypedResults.Problem(
                    detail: $"The page responded with {(int)response.StatusCode} {response.StatusCode}.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            // Best-effort cap against very large pages; not a substitute for server-level limits.
            if (response.Content.Headers.ContentLength is > 5_000_000)
            {
                return TypedResults.Problem(
                    detail: "The page is too large to import.",
                    statusCode: StatusCodes.Status502BadGateway);
            }

            html = await response.Content.ReadAsStringAsync(ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return TypedResults.Problem(
                detail: $"Could not fetch that URL: {ex.Message}",
                statusCode: StatusCodes.Status502BadGateway);
        }

        var recipeNode = FindRecipeJsonLd(html);
        var recipe = recipeNode?.Deserialize<Recipe>();
        if (recipe is null)
        {
            return TypedResults.Problem(
                detail: "No schema.org Recipe JSON-LD was found on that page.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var name = recipe.Name.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(name))
        {
            return TypedResults.Problem(
                detail: "The Recipe JSON-LD on that page has no name.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        // Schema.NET's converters write an explicit JSON null for every schema.org property
        // the source page didn't set - and some of those same converters (e.g. AdditionalType's
        // Values<string, Uri>) can't read an explicit null back in, which breaks a straight
        // round-trip through CreateRecipe. Stripping nulls here sidesteps that and also keeps
        // the output close to what a real page's JSON-LD looks like.
        var cleaned = StripNulls(JsonSerializer.SerializeToNode(recipe));

        // Reviews are third-party content tied to the source site, not part of the recipe
        // itself - omit them from the imported payload.
        if (cleaned is JsonObject cleanedObj) cleanedObj.Remove("review");

        var recipeJsonLd = JsonSerializer.SerializeToElement(cleaned);
        var view = RecipeNormalization.Normalize(cleaned, name);

        return TypedResults.Ok(new Response(Slugify(name), name, recipeJsonLd, view));
    }

    private static JsonNode? StripNulls(JsonNode? node)
    {
        switch (node)
        {
            case JsonObject obj:
                var cleanedObj = new JsonObject();
                foreach (var (key, value) in obj)
                {
                    var stripped = StripNulls(value);
                    if (stripped is not null) cleanedObj[key] = stripped;
                }
                return cleanedObj.Count > 0 ? cleanedObj : null;

            case JsonArray arr:
                var cleanedArr = new JsonArray();
                foreach (var item in arr)
                {
                    var stripped = StripNulls(item);
                    if (stripped is not null) cleanedArr.Add(stripped);
                }
                return cleanedArr.Count > 0 ? cleanedArr : null;

            default:
                return node?.DeepClone();
        }
    }

    // Recursively searches parsed JSON-LD for a node shaped like a schema.org Recipe -
    // handles a bare Recipe object, an array of nodes, and an "@graph" wrapper, which
    // covers the common shapes sites use to embed JSON-LD.
    private static JsonNode? FindRecipeJsonLd(string html)
    {
        var htmlDoc = new HtmlDocument();
        htmlDoc.LoadHtml(html);
        var scriptNodes = htmlDoc.DocumentNode.SelectNodes("//script[@type='application/ld+json']");
        if (scriptNodes is null) return null;

        foreach (var script in scriptNodes)
        {
            JsonNode? parsed;
            try
            {
                parsed = JsonNode.Parse(script.InnerText);
            }
            catch (JsonException)
            {
                continue;
            }

            var recipeNode = FindRecipeNode(parsed);
            if (recipeNode is not null) return recipeNode;
        }

        return null;
    }

    private static JsonNode? FindRecipeNode(JsonNode? node) => node switch
    {
        JsonObject obj when IsRecipeType(obj["@type"]) => obj,
        JsonObject obj when obj["@graph"] is JsonArray graph => graph.Select(FindRecipeNode).FirstOrDefault(n => n is not null),
        JsonArray arr => arr.Select(FindRecipeNode).FirstOrDefault(n => n is not null),
        _ => null
    };

    private static bool IsRecipeType(JsonNode? typeNode) => typeNode switch
    {
        JsonValue v when v.TryGetValue<string>(out var s) => string.Equals(s, "Recipe", StringComparison.OrdinalIgnoreCase),
        JsonArray arr => arr.Any(t => t is JsonValue v && v.TryGetValue<string>(out var s) && string.Equals(s, "Recipe", StringComparison.OrdinalIgnoreCase)),
        _ => false
    };

    private static string Slugify(string input)
    {
        var sb = new StringBuilder();
        var lastWasHyphen = false;
        foreach (var c in input.ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(c))
            {
                sb.Append(c);
                lastWasHyphen = false;
            }
            else if (!lastWasHyphen && sb.Length > 0)
            {
                sb.Append('-');
                lastWasHyphen = true;
            }
        }

        return sb.ToString().TrimEnd('-');
    }

    // Basic SSRF guard: blocks loopback, private, and link-local addresses (including the
    // 169.254.169.254 cloud metadata address) so this endpoint can't be used to probe the
    // Docker network or the host. Not a complete defense - it checks the resolved address
    // before connecting, so it doesn't protect against DNS rebinding between check and fetch.
    private static async Task<bool> IsSafeToFetchAsync(Uri uri, CancellationToken ct)
    {
        IPAddress[] addresses;
        try
        {
            addresses = await Dns.GetHostAddressesAsync(uri.Host, ct);
        }
        catch (SocketException)
        {
            return false;
        }

        return addresses.Length > 0 && addresses.All(IsPublicAddress);
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();

        if (IPAddress.IsLoopback(address)) return false;

        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            if (b[0] == 10) return false; // 10.0.0.0/8
            if (b[0] == 172 && b[1] is >= 16 and <= 31) return false; // 172.16.0.0/12
            if (b[0] == 192 && b[1] == 168) return false; // 192.168.0.0/16
            if (b[0] == 169 && b[1] == 254) return false; // 169.254.0.0/16 (incl. cloud metadata)
            if (b[0] == 0) return false;
            return true;
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return !address.IsIPv6LinkLocal && !address.IsIPv6SiteLocal && !address.IsIPv6UniqueLocal;
        }

        return false;
    }
}
