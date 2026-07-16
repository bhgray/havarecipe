using Microsoft.EntityFrameworkCore;

namespace HavaRecipe.Api.Data;

public class RecipeEntity
{
    public Guid Id { get; set; }
    public required string Slug { get; set; }
    public required string Name { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Schema.org Recipe JSON-LD payload (from Schema.NET), stored as Postgres jsonb.
    public required string RecipeJsonLd { get; set; }
}

public class RecipeDbContext(DbContextOptions<RecipeDbContext> options) : DbContext(options)
{
    public DbSet<RecipeEntity> Recipes => Set<RecipeEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RecipeEntity>(e =>
        {
            e.ToTable("recipes");
            e.HasKey(r => r.Id);
            e.Property(r => r.Slug).IsRequired().HasMaxLength(200);
            e.HasIndex(r => r.Slug).IsUnique();
            e.Property(r => r.Name).IsRequired().HasMaxLength(500);
            e.Property(r => r.CreatedAt).IsRequired();
            e.Property(r => r.RecipeJsonLd).HasColumnType("jsonb").IsRequired();
        });
    }
}
