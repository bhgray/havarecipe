using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace HavaRecipe.Api.Features.Recipes;

public static class DeleteRecipe
{
    public static RouteGroupBuilder MapDeleteRecipe(this RouteGroupBuilder group)
    {
        group.MapDelete("/{slug}", HandleAsync);
        return group;
    }

    private static async Task<Results<NoContent, NotFound>> HandleAsync(
        string slug, RecipeDbContext db, CancellationToken ct)
    {
        // Single DELETE statement - no need to load the entity just to remove it.
        var deleted = await db.Recipes.Where(r => r.Slug == slug).ExecuteDeleteAsync(ct);

        return deleted > 0 ? TypedResults.NoContent() : TypedResults.NotFound();
    }
}
