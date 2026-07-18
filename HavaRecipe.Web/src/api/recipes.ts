import { apiFetch } from './client'
import type {
  CreateRecipeRequest,
  CreateRecipeResponse,
  ImportRecipeResponse,
  RecipeSummary,
} from './types'

export const listRecipes = (): Promise<RecipeSummary[]> => apiFetch<RecipeSummary[]>('/recipes')

export const importRecipe = (url: string): Promise<ImportRecipeResponse> =>
  apiFetch<ImportRecipeResponse>('/recipes/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })

// Throws ApiError with status 409 if the slug is already taken.
export const createRecipe = (recipe: CreateRecipeRequest): Promise<CreateRecipeResponse> =>
  apiFetch<CreateRecipeResponse>('/recipes', {
    method: 'POST',
    body: JSON.stringify(recipe),
  })
