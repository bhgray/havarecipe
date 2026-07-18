using System.Text.Json;
using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace HavaRecipe.Api.Features.Recipes;

public static class GetRecipe
{
    // RecipeJsonLd is returned as JSON rather than a JSON-encoded string, so it matches what
    // /recipes/import returns and clients can use it directly instead of parsing a string.
    public record Response(Guid Id, string Slug, string Name, DateTimeOffset CreatedAt, JsonElement RecipeJsonLd);

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

        // Clone so the element outlives the JsonDocument being disposed.
        using var document = JsonDocument.Parse(recipe.RecipeJsonLd);

        return TypedResults.Ok(new Response(
            recipe.Id, recipe.Slug, recipe.Name, recipe.CreatedAt, document.RootElement.Clone()));
    }
}
