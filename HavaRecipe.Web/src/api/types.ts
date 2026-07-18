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

// Normalized by the server (RecipeNormalization) so no client has to parse schema.org's
// loose shapes itself. Durations are minutes; formatting is the client's job.
export interface RecipeView {
  name?: string
  description?: string
  imageUrl?: string
  prepMinutes?: number
  cookMinutes?: number
  totalMinutes?: number
  recipeYield?: string
  ingredients: string[]
  steps: string[]
}

export interface ImportRecipeResponse {
  suggestedSlug: string
  suggestedName: string
  // Arbitrary schema.org Recipe JSON-LD — shape varies per source page. Kept for the Raw
  // JSON view and for re-posting to /recipes.
  recipeJsonLd: Record<string, unknown>
  recipe: RecipeView
}

export interface GetRecipeResponse {
  id: string
  slug: string
  name: string
  createdAt: string
  recipeJsonLd: Record<string, unknown>
  recipe: RecipeView
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
