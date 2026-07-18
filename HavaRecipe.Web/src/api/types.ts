// Mirror of the backend records:
//   HavaRecipe.Api/Features/Recipes/ListRecipes.cs  (RecipeSummary)
//   HavaRecipe.Api/Features/Recipes/ImportRecipe.cs (Response)
//   HavaRecipe.Api/Features/Recipes/CreateRecipe.cs (Request/Response)

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

export interface CreateRecipeRequest {
  slug: string
  name: string
  recipeJsonLd: Record<string, unknown>
}

export interface CreateRecipeResponse {
  id: string
  slug: string
  name: string
  createdAt: string
}
