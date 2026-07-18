// Portable, UI-free normalization of an arbitrary schema.org Recipe JSON-LD blob into a stable
// shape for rendering. schema.org is loosely typed and sites vary wildly, so every accessor is
// defensive and this module never throws. Reusable as-is by the future mobile app.

export interface NormalizedRecipe {
  name?: string
  description?: string
  imageUrl?: string
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string
  ingredients: string[]
  instructions: string[]
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined
}

// First usable string from a string, or (recursively) from an array of candidates.
function firstString(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item)
      if (s) return s
    }
  }
  return undefined
}

// Minimal HTML-entity decode for display (no DOM dependency — this module stays portable).
function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}

function text(v: unknown): string | undefined {
  const s = firstString(v)
  return s ? decodeEntities(s) : undefined
}

// image: string | { url } | array of either → first URL.
function extractImageUrl(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined
  if (Array.isArray(v)) {
    for (const item of v) {
      const u = extractImageUrl(item)
      if (u) return u
    }
    return undefined
  }
  const rec = asRecord(v)
  return rec ? firstString(rec.url) : undefined
}

// recipeIngredient: string | string[] → cleaned string[].
function extractStringList(v: unknown): string[] {
  if (typeof v === 'string') return v.trim() ? [decodeEntities(v.trim())] : []
  if (Array.isArray(v)) {
    return v
      .map(firstString)
      .filter((s): s is string => Boolean(s))
      .map((s) => decodeEntities(s.trim()))
  }
  return []
}

// recipeInstructions: HowToStep {text} | plain strings | HowToSection {itemListElement} | nested
// arrays → flat list of step texts.
function extractInstructions(v: unknown): string[] {
  const out: string[] = []
  const visit = (node: unknown): void => {
    const s = typeof node === 'string' ? node.trim() : ''
    if (s) {
      out.push(decodeEntities(s))
      return
    }
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    const rec = asRecord(node)
    if (!rec) return
    const type = firstString(rec['@type'])?.toLowerCase() ?? ''
    if (type.includes('section') || rec.itemListElement) {
      visit(rec.itemListElement)
      return
    }
    const step = firstString(rec.text) ?? firstString(rec.name)
    if (step) out.push(decodeEntities(step.trim()))
  }
  visit(v)
  return out
}

// ISO-8601 duration (PT1H15M) → "1 hr 15 min". Non-ISO strings pass through unchanged.
function formatDuration(v: unknown): string | undefined {
  const iso = firstString(v)
  if (!iso) return undefined
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso.trim())
  if (!m) return iso
  const [, d, h, min] = m
  const parts: string[] = []
  if (d) parts.push(`${d} day${Number(d) > 1 ? 's' : ''}`)
  if (h) parts.push(`${h} hr`)
  if (min) parts.push(`${min} min`)
  return parts.length ? parts.join(' ') : undefined
}

export function normalizeRecipeJsonLd(
  jsonLd: Record<string, unknown>,
  fallbackName?: string,
): NormalizedRecipe {
  return {
    name: text(jsonLd.name) ?? fallbackName,
    description: text(jsonLd.description),
    imageUrl: extractImageUrl(jsonLd.image),
    prepTime: formatDuration(jsonLd.prepTime),
    cookTime: formatDuration(jsonLd.cookTime),
    totalTime: formatDuration(jsonLd.totalTime),
    recipeYield: text(jsonLd.recipeYield),
    ingredients: extractStringList(jsonLd.recipeIngredient),
    instructions: extractInstructions(jsonLd.recipeInstructions),
  }
}
