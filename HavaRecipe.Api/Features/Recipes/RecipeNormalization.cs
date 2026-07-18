using System.Globalization;
using System.Net;
using System.Text.Json.Nodes;
using System.Xml;

namespace HavaRecipe.Api.Features.Recipes;

// A stable, rendering-ready view of a schema.org Recipe. Clients get this instead of re-parsing
// the raw JSON-LD themselves, which previously had to be reimplemented per client.
//
// Durations are minutes rather than preformatted text so clients can localise them.
public record RecipeView(
    string? Name,
    string? Description,
    string? ImageUrl,
    int? PrepMinutes,
    int? CookMinutes,
    int? TotalMinutes,
    string? RecipeYield,
    IReadOnlyList<string> Ingredients,
    IReadOnlyList<string> Steps);

// schema.org is loosely typed and sites vary wildly (image as a string/object/array,
// instructions as steps/sections/plain strings), so every accessor here is defensive and this
// never throws - a page with junk structured data yields empty fields, not a 500.
public static class RecipeNormalization
{
    public static RecipeView Normalize(JsonNode? jsonLd, string? fallbackName = null)
    {
        var recipe = jsonLd as JsonObject;

        return new RecipeView(
            Name: Text(recipe?["name"]) ?? fallbackName,
            Description: Text(recipe?["description"]),
            ImageUrl: ExtractImageUrl(recipe?["image"]),
            PrepMinutes: DurationMinutes(recipe?["prepTime"]),
            CookMinutes: DurationMinutes(recipe?["cookTime"]),
            TotalMinutes: DurationMinutes(recipe?["totalTime"]),
            RecipeYield: Text(recipe?["recipeYield"]),
            Ingredients: ExtractStringList(recipe?["recipeIngredient"]),
            Steps: ExtractInstructions(recipe?["recipeInstructions"]));
    }

    // First usable string from a value, or (recursively) from an array of candidates.
    private static string? FirstString(JsonNode? node)
    {
        switch (node)
        {
            case JsonValue value:
                if (value.TryGetValue<string>(out var text))
                {
                    return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
                }
                if (value.TryGetValue<double>(out var number))
                {
                    return number.ToString(CultureInfo.InvariantCulture);
                }
                return null;

            case JsonArray array:
                foreach (var item in array)
                {
                    if (FirstString(item) is { } found) return found;
                }
                return null;

            default:
                return null;
        }
    }

    // Sites routinely emit HTML entities inside JSON-LD strings (&#39;, &amp;).
    private static string? Text(JsonNode? node) =>
        FirstString(node) is { } value ? WebUtility.HtmlDecode(value) : null;

    // image: string | { url } | array of either -> first URL.
    private static string? ExtractImageUrl(JsonNode? node) => node switch
    {
        JsonValue => FirstString(node),
        JsonArray array => array.Select(ExtractImageUrl).FirstOrDefault(url => url is not null),
        JsonObject obj => FirstString(obj["url"]),
        _ => null,
    };

    // recipeIngredient: string | string[] -> cleaned list.
    private static IReadOnlyList<string> ExtractStringList(JsonNode? node)
    {
        switch (node)
        {
            case JsonValue:
                return Text(node) is { } single ? [single] : [];

            case JsonArray array:
                return array.Select(Text).OfType<string>().ToList();

            default:
                return [];
        }
    }

    // recipeInstructions: HowToStep { text } | plain strings | HowToSection { itemListElement }
    // | nested arrays -> flat list of step texts.
    private static IReadOnlyList<string> ExtractInstructions(JsonNode? node)
    {
        var steps = new List<string>();
        Visit(node, steps);
        return steps;

        static void Visit(JsonNode? current, List<string> steps)
        {
            switch (current)
            {
                case JsonValue:
                    if (Text(current) is { } line) steps.Add(line);
                    return;

                case JsonArray array:
                    foreach (var item in array) Visit(item, steps);
                    return;

                case JsonObject obj:
                    var type = FirstString(obj["@type"])?.ToLowerInvariant() ?? string.Empty;
                    if (type.Contains("section") || obj["itemListElement"] is not null)
                    {
                        Visit(obj["itemListElement"], steps);
                        return;
                    }
                    if ((Text(obj["text"]) ?? Text(obj["name"])) is { } step) steps.Add(step);
                    return;
            }
        }
    }

    // ISO-8601 duration (PT1H15M) -> total minutes. Anything unparseable (some sites write
    // "15 mins") yields null rather than a bogus number.
    private static int? DurationMinutes(JsonNode? node)
    {
        if (FirstString(node) is not { } iso) return null;

        try
        {
            var minutes = (int)Math.Round(XmlConvert.ToTimeSpan(iso).TotalMinutes);
            return minutes > 0 ? minutes : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
