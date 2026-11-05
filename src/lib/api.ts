import 'server-only';
import { notFound } from 'next/navigation';
import type { Catalog, HomeData, Product, ProductList } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Reads the store API from the website server. Answers are kept for `revalidate` seconds and then
 * refreshed in the background, so visitors never wait for the API.
 *
 * `missing: 'not-found'` shows the 404 page when the API says the thing does not exist (a product,
 * a category). Anything else that goes wrong is an error, shown by app/error.tsx.
 */
async function get<T>(path: string, { revalidate = 60, missing = 'error' }: { revalidate?: number; missing?: 'not-found' | 'error' } = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/store${path}`, { next: { revalidate, tags: ['store'] } });
  } catch (err) {
    throw new Error(`The shop API at ${API_URL} could not be reached (${path})`, { cause: err });
  }
  if (res.status === 404 && missing === 'not-found') notFound();
  if (!res.ok) throw new Error(`The shop API answered ${res.status} for ${path}`);
  return (await res.json()) as T;
}

export const getCatalog = () => get<Catalog>('/catalog', { revalidate: 300 });
export const getHome = () => get<HomeData>('/home');
export const getProduct = (slug: string) => get<Product>(`/products/${encodeURIComponent(slug)}`, { missing: 'not-found' });

export interface ListParams {
  category?: string;
  brand?: string[];
  q?: string;
  sort?: string;
  min?: string;
  max?: string;
  inStock?: string;
  onSale?: string;
  page?: string;
  pageSize?: number;
}

/** A 404 here means the category does not exist. */
export function getProducts(params: ListParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
    query.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return get<ProductList>(`/products?${query}`, { missing: 'not-found' });
}
