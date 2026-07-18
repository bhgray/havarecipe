// Mirror of the backend response records:
//   HavaRecipe.Api/Features/Recipes/ListRecipes.cs  (RecipeSummary)
//   HavaRecipe.Api/Features/Recipes/ImportRecipe.cs (Response)

export interface RecipeSummary {
  id: string
  slug: string
  name: string
  createdAt: string
}

export interface ImportRecipeResponse {
  suggestedSlug: string
  suggestedName: string
  // Arbitrary schema.org Recipe JSON-LD — shape varies per source page.
  recipeJsonLd: Record<string, unknown>
}
