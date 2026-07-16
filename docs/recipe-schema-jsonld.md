# Recipe Structured Data: JSON-LD Schema & Schema.NET

## The schema.org Recipe type

Recipe pages use the schema.org `Recipe` type, embedded as JSON-LD in a `<script type="application/ld+json">` tag. It sits in the hierarchy `Thing > CreativeWork > HowTo > Recipe`, inheriting properties from all three.

Google (the main driver of real-world adoption, since it determines rich-result eligibility in Search/Images) only *requires* two properties:

- `name` — the dish name
- `image` — one or more photos of the finished dish

Everything else is recommended, not required, but improves how the recipe displays:

- `author`, `datePublished`, `description`
- `prepTime`, `cookTime`, `totalTime` — ISO 8601 duration format, e.g. `PT15M`
- `recipeYield`, `recipeCategory`, `recipeCuisine`, `keywords`
- `recipeIngredient` — array of ingredient strings
- `recipeInstructions` — recommended as an array of `HowToStep` objects (each with `name`, `text`, `url`, `image`), optionally grouped into `HowToSection` if the recipe has multiple parts (crust vs. filling, etc.)
- `nutrition` — nested `NutritionInformation` object (e.g. `calories`)
- `aggregateRating`, `video`

Beyond Google's subset, schema.org also defines `cookingMethod`, `suitableForDiet` (vegan, gluten-free, diabetic, etc.), `estimatedCost`, `tool`, and `supply` — valid structured data, just not surfaced in Google rich results.

For a full recipe collection/list page, `ItemList` structured data (with `ListItem.position` and `ListItem.url`) makes the collection eligible for a host carousel.

### Example

```json
{
  "@context": "https://schema.org/",
  "@type": "Recipe",
  "name": "Non-Alcoholic Piña Colada",
  "image": ["https://example.com/photo.jpg"],
  "author": { "@type": "Person", "name": "Mary Stone" },
  "prepTime": "PT1M",
  "cookTime": "PT2M",
  "totalTime": "PT3M",
  "recipeYield": "4 servings",
  "recipeIngredient": ["400ml pineapple juice", "100ml cream of coconut", "ice"],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Blend pineapple juice and cream of coconut until smooth." },
    { "@type": "HowToStep", "text": "Fill a glass with ice and pour mixture over it." }
  ]
}
```

Sources: [schema.org/Recipe](https://schema.org/Recipe), [Google Recipe structured data docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)

## Schema.NET (NuGet package)

[Schema.NET](https://github.com/RehanSaeed/Schema.NET) (by RehanSaeed) provides strongly-typed C# POCO classes for schema.org types, including `Recipe`, with properties matching the vocabulary above (`RecipeIngredient`, `RecipeInstructions`, `PrepTime`, `Nutrition`, etc.).

- Serializes objects to JSON-LD (`.ToString()` or `.ToHtmlEscapedString()` to avoid XSS when embedding in a `<script>` tag)
- Also supports deserializing JSON-LD back into typed objects (added after community request — see [GitHub issue #3](https://github.com/RehanSaeed/Schema.NET/issues/3))
- MIT licensed, ~3.6M downloads, mature and stable (latest release 13.0.0, Dec 2023 — not under heavy active development, but not abandoned either)

**Compatibility with .NET 10**: the package targets .NET Standard 2.0 and .NET 6.0+ (net6.0/net7.0 explicitly listed as compatible; net8.0/net9.0/net10.0 shown on NuGet as "computed" — i.e., not a dedicated build, but resolved via the netstandard2.0/net6.0 target, which .NET 10 supports without issue). In practice this means it installs and runs cleanly on .NET 10; there's just no net10.0-specific build being tested by the maintainer.

```csharp
using Schema.NET;

// Deserialize JSON-LD scraped from a page into a typed Recipe
var recipe = Newtonsoft.Json.JsonConvert.DeserializeObject<Recipe>(jsonLdString);
Console.WriteLine(recipe.Name);
Console.WriteLine(string.Join(", ", recipe.RecipeIngredient));
```

*(Exact deserialization API may vary — check the current README/tests before relying on the snippet above.)*

### Alternatives considered

- **json-ld.net** — a true W3C JSON-LD 1.0 processor (expansion/compaction/framing), lower-level and not schema.org-specific. Last updated 2022, only implements JSON-LD 1.0 (not 1.1). Better suited if you need generic JSON-LD graph operations rather than typed Recipe objects.
- **No .NET equivalent of Python's `recipe-scrapers`** exists (a maintained multi-site recipe scraper). To pull recipes from arbitrary sites, plan to combine HtmlAgilityPack or AngleSharp (extract the embedded JSON-LD `<script>` block) with Schema.NET (deserialize into `Recipe`).
- **RecipeIngredientParser.Core** — a small, separate NuGet package for parsing free-text ingredient lines ("2 cups flour") into structured quantity/unit/ingredient data. Unrelated to JSON-LD but likely useful for a recipe backend.

## Recommendation

Use **Schema.NET** for typed `Recipe` modeling and JSON-LD serialization/deserialization on the server. Pair it with HtmlAgilityPack/AngleSharp if recipes need to be scraped from external sites rather than authored directly in your own system.
