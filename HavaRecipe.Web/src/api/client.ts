// Portable API core — no UI-framework imports. When a mobile (Expo) app is added later,
// this folder lifts into a shared workspace package used by both web and native.

export const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'https://localhost:7162'

// Turns an RFC 9457 ProblemDetails body into something worth showing a user, instead of
// dumping the raw JSON envelope.
function problemMessage(status: number, statusText: string, body: string): string {
  try {
    const problem = JSON.parse(body) as {
      detail?: string
      title?: string
      errors?: Record<string, string[]>
    }
    if (problem.errors) {
      const flattened = Object.values(problem.errors).flat().filter(Boolean)
      if (flattened.length > 0) return flattened.join(' ')
    }
    if (problem.detail) return problem.detail
    if (problem.title) return problem.title
  } catch {
    // Not JSON (e.g. an unhandled exception page) — fall through to the raw body.
  }
  return body || `${status} ${statusText}`
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, statusText: string, body: string) {
    super(problemMessage(status, statusText, body))
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    // Carries the status so callers can branch on it (e.g. 409 slug conflict).
    throw new ApiError(res.status, res.statusText, await res.text())
  }

  return (await res.json()) as T
}
