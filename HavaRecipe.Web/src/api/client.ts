// Portable API core — no UI-framework imports. When a mobile (Expo) app is added later,
// this folder lifts into a shared workspace package used by both web and native.

export const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'https://localhost:7162'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    // Surface ProblemDetails/validation bodies (400/422/502) instead of a bare status.
    const body = await res.text()
    throw new Error(`${res.status} ${res.statusText}${body ? `: ${body}` : ''}`)
  }

  return (await res.json()) as T
}
