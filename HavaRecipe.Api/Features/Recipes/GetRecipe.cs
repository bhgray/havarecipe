using System.Text.Json;
using System.Text.Json.Nodes;
using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace HavaRecipe.Api.Features.Recipes;

public static class GetRecipe
{
    // Recipe is the normalized, rendering-ready view. RecipeJsonLd is returned as JSON rather
    // than a JSON-encoded string, matching /recipes/import, and is kept so callers can still
    // inspect the original structured data.
    public record Response(
        Guid Id,
        string Slug,
        string Name,
        DateTimeOffset CreatedAt,
        JsonElement RecipeJsonLd,
        RecipeView Recipe);

    public static RouteGroupBuilder MapGetRecipe(this RouteGroupBuilder group)
    {
        group.MapGet("/{slug}", HandleAsync);
        return group;
    }

    private static async Task<Results<Ok<Response>, NotFound>> HandleAsync(
        string slug, RecipeDbContext db, CancellationToken ct)
    {
        var recipe = await db.Recipes.AsNoTracking().FirstOrDefaultAsync(r => r.Slug == slug, ct);
        if (recipe is null) return TypedResults.NotFound();

        // Parse once, then serve both shapes from it.
        var jsonLd = JsonNode.Parse(recipe.RecipeJsonLd);

        return TypedResults.Ok(new Response(
            recipe.Id,
            recipe.Slug,
            recipe.Name,
            recipe.CreatedAt,
            JsonSerializer.SerializeToElement(jsonLd),
            RecipeNormalization.Normalize(jsonLd, recipe.Name)));
    }
}
