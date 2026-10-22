// Simple in-memory client-side cache to enable instant page transitions and eliminate refetch waterfalls
const memoryCache = new Map<string, { timestamp: number; data: any }>();
const pendingPromises = new Map<string, Promise<any>>();
// Bumped by invalidateCache. A response is only cached if its URL wasn't invalidated while the
// request was in flight — otherwise a request that started before a mutation (e.g. a hover
// prefetch racing a notes save) would put pre-mutation data back into the cache.
const generations = new Map<string, number>();

/**
 * Fetch JSON with in-memory caching and in-flight request deduplication.
 * @param url Request URL
 * @param ttlMs Cache Time-To-Live in milliseconds (default 60 seconds)
 * @param init Optional fetch options (only used when a network request is made)
 */
export async function fetchWithCache<T = any>(
  url: string,
  ttlMs: number = 60000,
  init?: RequestInit
): Promise<T> {
  const cached = memoryCache.get(url);
  const now = Date.now();

  // Return fresh cache immediately
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  // Deduplicate in-flight requests to avoid redundant simultaneous network calls
  if (pendingPromises.has(url)) {
    return pendingPromises.get(url)! as Promise<T>;
  }

  const generation = generations.get(url) ?? 0;
  const promise = fetch(url, init)
    .then(async (res) => {
      if (res.status === 401 && typeof window !== "undefined") {
        // Session ended (signed out elsewhere or expired): log in again, then come back here
        window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      if ((generations.get(url) ?? 0) === generation) {
        memoryCache.set(url, { timestamp: Date.now(), data });
      }
      return data;
    })
    .finally(() => {
      if (pendingPromises.get(url) === promise) pendingPromises.delete(url);
    });

  pendingPromises.set(url, promise);
  return promise;
}

/**
 * Return the cached response for a URL regardless of its age (for stale-while-revalidate
 * rendering), or undefined if nothing is cached.
 */
export function getCached<T = any>(url: string): T | undefined {
  return memoryCache.get(url)?.data as T | undefined;
}

/**
 * Warm the cache for a URL the user is likely to open next (e.g. on hover).
 * Sends `x-prefetch: 1` so API routes can skip expensive side effects. Errors are ignored.
 */
export function prefetchData(url: string, ttlMs: number = 30000): void {
  fetchWithCache(url, ttlMs, { headers: { "x-prefetch": "1" } }).catch(() => {});
}

/**
 * Invalidate cached URLs matching a given prefix, or clear the entire cache.
 */
export function invalidateCache(urlPrefix?: string) {
  const keys = new Set([...memoryCache.keys(), ...pendingPromises.keys()]);
  for (const key of keys) {
    if (!urlPrefix || key.startsWith(urlPrefix)) {
      memoryCache.delete(key);
      // In-flight requests may hold pre-invalidation data: don't cache them or hand them to new callers
      pendingPromises.delete(key);
      generations.set(key, (generations.get(key) ?? 0) + 1);
    }
  }
}
