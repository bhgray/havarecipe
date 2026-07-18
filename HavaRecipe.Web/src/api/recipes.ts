import { apiFetch } from './client'
import type { ImportRecipeResponse, RecipeSummary } from './types'

export const listRecipes = (): Promise<RecipeSummary[]> => apiFetch<RecipeSummary[]>('/recipes')

export const importRecipe = (url: string): Promise<ImportRecipeResponse> =>
  apiFetch<ImportRecipeResponse>('/recipes/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
