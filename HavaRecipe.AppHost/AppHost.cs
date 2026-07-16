var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume();

var recipeDb = postgres.AddDatabase("recipedb");
var cache = builder.AddRedis("cache");

builder.AddProject<Projects.HavaRecipe_Api>("api")
    .WithReference(recipeDb).WaitFor(recipeDb)
    .WithReference(cache).WaitFor(cache);

builder.Build().Run();
