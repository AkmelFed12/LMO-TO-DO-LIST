const rawBase = (import.meta as any).env?.VITE_API_BASE;
const API_BASE = rawBase === undefined ? '/api' : rawBase;

const buildUrl = (path: string) => {
  if (!API_BASE) return path;
  return `${API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(buildUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export const apiGet = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, body?: any) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body || {}) });
export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });

export const hasApiBase = () => Boolean(API_BASE);
