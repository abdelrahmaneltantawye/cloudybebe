interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, Promise<unknown>>();

export const resourceCache = {
  get<T>(key: string, maxAgeMs = 5 * 60 * 1000): T | undefined {
    const entry = memoryCache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > maxAgeMs) {
      return undefined;
    }
    return entry.data as T;
  },

  peek<T>(key: string, staleTimeMs = 3 * 60 * 1000): { data: T; isStale: boolean } | undefined {
    const entry = memoryCache.get(key);
    if (!entry) return undefined;
    const isStale = Date.now() - entry.timestamp > staleTimeMs;
    return { data: entry.data as T, isStale };
  },

  set<T>(key: string, data: T): void {
    memoryCache.set(key, { data, timestamp: Date.now() });
  },

  delete(key: string): void {
    memoryCache.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  },

  async prefetch<T>(
    key: string,
    loader: (signal: AbortSignal) => Promise<T>,
    staleTimeMs = 3 * 60 * 1000
  ): Promise<T | undefined> {
    const cached = resourceCache.peek<T>(key, staleTimeMs);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    if (pendingRequests.has(key)) {
      return pendingRequests.get(key) as Promise<T>;
    }

    const controller = new AbortController();
    const promise = loader(controller.signal)
      .then(data => {
        resourceCache.set(key, data);
        return data;
      })
      .catch(() => undefined)
      .finally(() => {
        pendingRequests.delete(key);
      });

    pendingRequests.set(key, promise);
    return promise;
  },
};
