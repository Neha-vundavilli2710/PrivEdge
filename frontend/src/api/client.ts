// Thin fetch wrapper for the PrivEdge FastAPI backend.
// Base URL: set VITE_API_URL in frontend/.env.local (default http://localhost:8000).
const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
const TOKEN_KEY = 'privedge_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'Cannot reach the PrivEdge server. Is the backend running?');
  }
  if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('privedge:unauthorized'));
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data as any)?.detail;
    const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map((x: any) => x.msg).join('; ') : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  patch: <T>(p: string, b: unknown) => request<T>('PATCH', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
  upload: <T>(p: string, form: FormData) => request<T>('POST', p, form, true),
};
