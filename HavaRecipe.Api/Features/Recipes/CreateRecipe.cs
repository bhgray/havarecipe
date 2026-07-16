using System.Text.Json;
using HavaRecipe.Api.Data;
using Microsoft.AspNetCore.Http.HttpResults;

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

    private static async Task<Results<Created<Response>, ValidationProblem>> HandleAsync(
        Request request, RecipeDbContext db, CancellationToken ct)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Slug)) errors["slug"] = ["Slug is required."];
        if (string.IsNullOrWhiteSpace(request.Name)) errors["name"] = ["Name is required."];

        var recipe = JsonSerializer.Deserialize<Schema.NET.Recipe>(request.RecipeJsonLd.GetRawText());
        if (recipe is null) errors["recipeJsonLd"] = ["A valid schema.org Recipe JSON-LD payload is required."];

        if (errors.Count > 0) return TypedResults.ValidationProblem(errors);

        var entity = new RecipeEntity
        {
            Id = Guid.NewGuid(),
            Slug = request.Slug,
            Name = request.Name,
            CreatedAt = DateTimeOffset.UtcNow,
            RecipeJsonLd = recipe!.ToHtmlEscapedString()
        };

        db.Recipes.Add(entity);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/recipes/{entity.Slug}",
            new Response(entity.Id, entity.Slug, entity.Name, entity.CreatedAt));
    }
}
