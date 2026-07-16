using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HavaRecipe.Api.Data;

// Used only by `dotnet ef` CLI tooling to build the model for migrations,
// without needing the Aspire AppHost or a live Postgres connection.
// The runtime app never uses this - it resolves its connection string
// via Aspire service discovery through AddNpgsqlDbContext in Program.cs.
public class RecipeDbContextFactory : IDesignTimeDbContextFactory<RecipeDbContext>
{
    public RecipeDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<RecipeDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=recipedb;Username=postgres;Password=postgres");
        return new RecipeDbContext(optionsBuilder.Options);
    }
}
