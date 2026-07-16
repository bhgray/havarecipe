using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace HavaRecipe.Api.Features.Recipes;

public static class ListRecipes
{
    public record RecipeSummary(Guid Id, string Slug, string Name, DateTimeOffset CreatedAt);

    public static RouteGroupBuilder MapListRecipes(this RouteGroupBuilder group)
    {
        group.MapGet("/", HandleAsync);
        return group;
    }

    private static async Task<Ok<List<RecipeSummary>>> HandleAsync(RecipeDbContext db, CancellationToken ct)
    {
        var recipes = await db.Recipes.AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RecipeSummary(r.Id, r.Slug, r.Name, r.CreatedAt))
            .ToListAsync(ct);

        return TypedResults.Ok(recipes);
    }
}
