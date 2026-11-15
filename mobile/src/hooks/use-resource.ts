import { useCallback, useEffect, useState } from 'react';
import { resourceCache } from '@/lib/cache';

export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: unknown[]) {
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([...dependencies, version]);
  const baseKey = JSON.stringify(dependencies);

  const [result, setResult] = useState<{ key: string; data?: T; error: string }>(() => {
    const cached = resourceCache.peek<T>(baseKey);
    if (cached) {
      return { key, data: cached.data, error: '' };
    }
    return { key: '', error: '' };
  });

  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    const cached = resourceCache.peek<T>(baseKey);
    if (cached) {
      setResult({ key, data: cached.data, error: '' });
    }
  }

  const retry = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const cached = resourceCache.peek<T>(baseKey);

    if (cached && !cached.isStale && version === 0) {
      return;
    }

    loader(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          resourceCache.set(baseKey, data);
          setResult({ key, data, error: '' });
        }
      })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setResult(prev => ({
            key,
            data: prev.data,
            error: reason instanceof Error ? reason.message : 'Something went wrong. Please try again.',
          }));
        }
      });

    return () => controller.abort();
    // Loaders are keyed explicitly by the supplied dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    data: result.key === key ? result.data : undefined,
    loading: result.key !== key,
    error: result.key === key ? result.error : '',
    retry,
  };
}
