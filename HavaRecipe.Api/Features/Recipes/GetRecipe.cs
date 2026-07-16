using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace HavaRecipe.Api.Features.Recipes;

public static class GetRecipe
{
    public record Response(Guid Id, string Slug, string Name, DateTimeOffset CreatedAt, string RecipeJsonLd);

    public static RouteGroupBuilder MapGetRecipe(this RouteGroupBuilder group)
    {
        group.MapGet("/{slug}", HandleAsync);
        return group;
    }

    private static async Task<Results<Ok<Response>, NotFound>> HandleAsync(
        string slug, RecipeDbContext db, CancellationToken ct)
    {
        var recipe = await db.Recipes.AsNoTracking().FirstOrDefaultAsync(r => r.Slug == slug, ct);
        return recipe is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(new Response(recipe.Id, recipe.Slug, recipe.Name, recipe.CreatedAt, recipe.RecipeJsonLd));
    }
}
