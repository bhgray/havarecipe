using HavaRecipe.Api.Data;
using HavaRecipe.Api.Shared;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddOpenApi(options =>
{
    // Vertical-slice features each declare their own nested Request/Response records
    // (CreateRecipe.Request, ImportRecipe.Request, etc). The default schema ID is just
    // the short type name, so those collide across features and the OpenAPI doc silently
    // points one endpoint's schema at another's. Prefix nested types with their declaring
    // feature class to keep them distinct.
    options.CreateSchemaReferenceId = jsonTypeInfo =>
        jsonTypeInfo.Type.DeclaringType is { } declaringType
            ? $"{declaringType.Name}{jsonTypeInfo.Type.Name}"
            : OpenApiOptions.CreateDefaultSchemaReferenceId(jsonTypeInfo);
});

builder.AddNpgsqlDbContext<RecipeDbContext>("recipedb");

builder.Services.AddHttpClient("RecipeImport", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    // Many recipe sites block requests with no/generic User-Agent.
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (compatible; HavaRecipeBot/1.0; +https://github.com/havarecipe)");
});

// Dev-only CORS so the Vite frontend (its own Aspire-assigned origin) can call the API.
// AllowAnyOrigin is fine here because no credentials are sent; production should tighten
// this to the real web origin.
const string DevCorsPolicy = "dev-web";
builder.Services.AddCors(options =>
    options.AddPolicy(DevCorsPolicy, policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => options.WithTitle("HavaRecipe API"));

    // Dev-only: apply pending EF Core migrations on startup. Replace with an explicit
    // deploy-time migration step once this moves beyond early scaffolding.
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
    await db.Database.MigrateAsync();
}

app.UseHttpsRedirection();

if (app.Environment.IsDevelopment())
{
    app.UseCors(DevCorsPolicy);
}

app.MapRecipeEndpoints();

app.Run();
