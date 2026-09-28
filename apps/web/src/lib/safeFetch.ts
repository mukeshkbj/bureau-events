import {sanityClient} from 'sanity:client'

/**
 * Fetch wrapper that degrades to an empty archive instead of crashing the
 * static build when Sanity credentials are unset or the dataset is
 * unreachable. Real content errors still surface as loud warnings.
 */
export async function safeFetch<T>(query: string, params: Record<string, unknown> = {}, fallback: T): Promise<T> {
  try {
    const result = await sanityClient.fetch<T>(query, params)
    return result ?? fallback
  } catch (err) {
    console.warn(
      `[bureau] Sanity fetch failed (${err instanceof Error ? err.message : String(err)}). ` +
        'Rendering the empty-archive state.',
    )
    return fallback
  }
}
