import 'server-only';
import { notFound } from 'next/navigation';
import type { Catalog, HomeData, Product, ProductList } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Reads the store API from the website server. Answers are kept for `revalidate` seconds and then
 * refreshed in the background, so visitors never wait for the API.
 */
async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}/v1/store${path}`, { next: { revalidate, tags: ['store'] } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getCatalog = () => get<Catalog>('/catalog', 300);
export const getHome = () => get<HomeData>('/home');
export const getProduct = (slug: string) => get<Product>(`/products/${encodeURIComponent(slug)}`);

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

export function getProducts(params: ListParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
    query.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return get<ProductList>(`/products?${query}`);
}
