import { API_URL } from 'astro:env/server';
import type { Catalog, ContentPage, HomeData, PlacedOrder, Product, ProductList, ReviewList } from './types';

const API = API_URL.replace(/\/$/, '');

export class NotFound extends Error {}

/**
 * Reads the store API from the website server. Answers are kept in memory for `ttl` seconds; after
 * that the old answer is still served while a fresh one is fetched, so visitors rarely wait for the API.
 *
 * Only finished answers are kept, never a request still on its way. On Cloudflare Workers a request
 * belongs to the visit that started it: when that visit ends first, the request can never finish, and
 * every later visit waiting on it would fail ("This promise was created by a request that has since ended").
 * For the same reason a background refresh may be dropped there, so an answer older than `ttl` x 5
 * is not served any more: that visit waits for a fresh one.
 */
const cache = new Map<string, { at: number; value: unknown; refreshing?: number }>();
/** Searches and filters make many different addresses: keep the most recent ones only. */
const MAX_ENTRIES = 1000;
/** A background refresh is tried at most this often per address. */
const REFRESH_GAP = 10_000;

function remember(path: string, value: unknown) {
  cache.delete(path);
  cache.set(path, { at: Date.now(), value });
  // A Map keeps insertion order: the first entries are the oldest.
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/v1/store${path}`);
  if (res.status === 404) throw new NotFound(path);
  if (!res.ok) throw new Error(`The shop API answered ${res.status} for ${path}`);
  return (await res.json()) as T;
}

async function get<T>(path: string, ttl = 60): Promise<T> {
  const hit = cache.get(path);
  const now = Date.now();
  const age = hit ? now - hit.at : Infinity;
  if (hit && age <= ttl * 1000) return hit.value as T;
  if (hit && age <= ttl * 5000) {
    // Stale: serve the old answer, refresh in the background (once in a while, not on every visit).
    if (!hit.refreshing || now - hit.refreshing > REFRESH_GAP) {
      hit.refreshing = now;
      fetchJson<T>(path).then(
        (value) => remember(path, value),
        () => undefined,
      );
    }
    return hit.value as T;
  }
  const value = await fetchJson<T>(path);
  remember(path, value);
  return value;
}

export const getCatalog = () => get<Catalog>('/catalog', 300);
export const getHome = () => get<HomeData>('/home', 60);
export const getProduct = (slug: string) => get<Product>(`/products/${encodeURIComponent(slug)}`, 60);
export const getPage = (slug: string) => get<ContentPage>(`/pages/${encodeURIComponent(slug)}`, 60);
/** A product's approved reviews (first page) and the summary. */
export const getReviews = (slug: string) => get<ReviewList>(`/products/${encodeURIComponent(slug)}/reviews`, 60);
/** A placed order (thank-you page). Personal: never kept in the cache. */
export const getOrder = (token: string) => fetchJson<PlacedOrder>(`/orders/${encodeURIComponent(token)}`);

export function getProducts(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
    query.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return get<ProductList>(`/products?${query}`);
}
