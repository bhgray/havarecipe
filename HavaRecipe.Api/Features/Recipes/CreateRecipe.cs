using System.Text.Json;
using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HavaRecipe.Api.Features.Recipes;

public static class CreateRecipe
{
    // RecipeJsonLd is accepted as raw JSON rather than typed Schema.NET.Recipe: that type's
    // deeply self-referential interface properties (ICreativeWork, IThing, etc.) make the
    // ASP.NET Core OpenAPI schema generator recurse past System.Text.Json's max depth (64)
    // and fail with a 500 on /openapi/v1.json. Deserializing into Schema.NET.Recipe happens
    // internally instead, after the OpenAPI schema for this endpoint has already been built
    // from the plain JsonElement type.
    public record Request(string Slug, string Name, JsonElement RecipeJsonLd);
    public record Response(Guid Id, string Slug, string Name, DateTimeOffset CreatedAt);

    public static RouteGroupBuilder MapCreateRecipe(this RouteGroupBuilder group)
    {
        group.MapPost("/", HandleAsync);
        return group;
    }

    private static async Task<Results<Created<Response>, ValidationProblem, ProblemHttpResult>> HandleAsync(
        Request request, RecipeDbContext db, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Slug)) errors["slug"] = ["Slug is required."];
        if (string.IsNullOrWhiteSpace(request.Name)) errors["name"] = ["Name is required."];

        // Validate the payload really is a schema.org Recipe. Deserialize can also throw on
        // malformed JSON-LD, which would otherwise surface as a 500.
        try
        {
            if (JsonSerializer.Deserialize<Schema.NET.Recipe>(request.RecipeJsonLd.GetRawText()) is null)
            {
                errors["recipeJsonLd"] = ["A valid schema.org Recipe JSON-LD payload is required."];
            }
        }
        catch (JsonException)
        {
            errors["recipeJsonLd"] = ["A valid schema.org Recipe JSON-LD payload is required."];
        }

        if (errors.Count > 0) return TypedResults.ValidationProblem(errors);

        if (await db.Recipes.AnyAsync(r => r.Slug == request.Slug, ct))
        {
            return SlugConflict(request.Slug);
        }

        var entity = new RecipeEntity
        {
            Id = Guid.NewGuid(),
            Slug = request.Slug,
            Name = request.Name,
            CreatedAt = DateTimeOffset.UtcNow,
            // Store the caller's JSON as-is. (This used to persist Schema.NET's
            // ToHtmlEscapedString(), which is meant for embedding in a <script> tag and left
            // HTML entities like &#39; in the stored data.)
            RecipeJsonLd = request.RecipeJsonLd.GetRawText()
        };

        db.Recipes.Add(entity);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: "23505" })
        {
            // Lost a race against a concurrent insert of the same slug.
            return SlugConflict(request.Slug);
        }

        return TypedResults.Created($"/recipes/{entity.Slug}",
            new Response(entity.Id, entity.Slug, entity.Name, entity.CreatedAt));
    }

    private static ProblemHttpResult SlugConflict(string slug) =>
        TypedResults.Problem(
            title: "Slug already in use",
            detail: $"A recipe with the slug '{slug}' already exists. Choose a different slug.",
            statusCode: StatusCodes.Status409Conflict);
}
