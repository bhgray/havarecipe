var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume();

var recipeDb = postgres.AddDatabase("recipedb");
var cache = builder.AddRedis("cache");

var api = builder.AddProject<Projects.HavaRecipe_Api>("api")
    .WithReference(recipeDb).WaitFor(recipeDb)
    .WithReference(cache).WaitFor(cache);

// Vite web frontend. Aspire runs `npm install` (WithNpm) then `npm run dev`, augments the
// Vite config for HTTPS, and injects the API's live URL as VITE_API_URL so the browser code
// (import.meta.env.VITE_API_URL) always targets the right dynamic port.
builder.AddViteApp("web", "../HavaRecipe.Web")
    .WithNpm()
    .WithReference(api)
    .WaitFor(api)
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("https"));

builder.Build().Run();
