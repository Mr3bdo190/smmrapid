import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One way to load something from the API, so every page reports loading, failure and retry the same
 * way instead of inventing its own three states.
 *
 * The details that matter:
 *  - a reload after unmount, or a slow first response landing after a faster second one, must not
 *    overwrite what the user is looking at (hence the request counter);
 *  - `keepPrevious` leaves the old data on screen while refreshing, which is what a "refresh" button
 *    should do instead of blanking the page;
 *  - `reload` is stable, so it can be handed straight to a retry button.
 */
export type AsyncState<T> = {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload: () => void;
};

export function useAsync<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  options: { skip?: boolean; keepPrevious?: boolean } = {},
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [nonce, setNonce] = useState(0);

  const requestId = useRef(0);
  const mounted = useRef(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const { skip, keepPrevious } = options;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }
    const id = (requestId.current += 1);
    setLoading(true);
    if (!keepPrevious) setError(null);

    loadRef
      .current()
      .then((result) => {
        if (!mounted.current || id !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((failure) => {
        if (!mounted.current || id !== requestId.current) return;
        setError(failure);
      })
      .finally(() => {
        if (!mounted.current || id !== requestId.current) return;
        setLoading(false);
      });
    // deps are the caller's list plus the reload nonce — deliberately not derived, so a caller
    // controls exactly when a refetch happens
  }, [...deps, nonce, skip]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, error, loading, reload };
}
