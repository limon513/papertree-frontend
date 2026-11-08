import { API_URL } from 'astro:env/server';
import type { Catalog, HomeData, ProductList } from './types';

const API = API_URL.replace(/\/$/, '');

export class NotFound extends Error {}

/**
 * Reads the store API from the website server. Answers are kept in memory for `ttl` seconds; after
 * that the old answer is still served while a fresh one is fetched, so visitors never wait for the API.
 */
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/v1/store${path}`);
  if (res.status === 404) throw new NotFound(path);
  if (!res.ok) throw new Error(`The shop API answered ${res.status} for ${path}`);
  return (await res.json()) as T;
}

function get<T>(path: string, ttl = 60): Promise<T> {
  const hit = cache.get(path);
  const now = Date.now();
  if (hit) {
    if (now - hit.at > ttl * 1000) {
      // Stale: refresh in the background, keep serving the old answer meanwhile.
      const fresh = fetchJson<T>(path);
      fresh.then(() => cache.set(path, { at: Date.now(), value: fresh }), () => undefined);
      hit.at = now;
    }
    return hit.value as Promise<T>;
  }
  const value = fetchJson<T>(path);
  cache.set(path, { at: now, value });
  value.catch(() => cache.delete(path));
  return value;
}

export const getCatalog = () => get<Catalog>('/catalog', 300);
export const getHome = () => get<HomeData>('/home', 60);

export function getProducts(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
    query.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return get<ProductList>(`/products?${query}`);
}
