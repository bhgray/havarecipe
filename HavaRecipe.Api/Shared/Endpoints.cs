using HavaRecipe.Api.Features.Recipes;

namespace HavaRecipe.Api.Shared;

public static class Endpoints
{
    public static void MapRecipeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/recipes").WithTags("Recipes");
        group.MapCreateRecipe();
        group.MapGetRecipe();
        group.MapListRecipes();
        group.MapImportRecipe();
        group.MapDeleteRecipe();
    }
}
