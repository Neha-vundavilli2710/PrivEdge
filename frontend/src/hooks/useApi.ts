import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

/** GET helper: { data, loading, error, reload } */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api.get<T>(path).then(d => { setData(d); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [path]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [load, ...deps]);
  return { data, loading, error, reload: load };
}
