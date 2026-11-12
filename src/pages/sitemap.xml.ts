import type { APIRoute } from 'astro';
import { API_URL } from 'astro:env/server';
import { links, SITE_URL } from '@/lib/utils';

/**
 * The sitemap for Google: every live product, category (with products) and brand, and the main
 * pages. One file is plenty (Google takes up to 50,000 addresses per file). Old WordPress sitemap
 * addresses redirect here.
 */
interface SitemapData {
  products: { slug: string; updatedAt: string }[];
  categories: { path: string }[];
  brands: { slug: string; updatedAt: string }[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const day = (iso: string) => iso.slice(0, 10);

export const GET: APIRoute = async () => {
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/v1/store/sitemap`);
  if (!res.ok) return new Response('Sitemap not available right now', { status: 503, headers: { 'retry-after': '300' } });
  const data = (await res.json()) as SitemapData;
  const url = (path: string, lastmod?: string) => `<url><loc>${esc(SITE_URL + path)}</loc>${lastmod ? `<lastmod>${day(lastmod)}</lastmod>` : ''}</url>`;
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...['/', '/shop/', '/categories/', '/brands/', '/deals/', '/new/'].map((p) => url(p)),
    ...data.categories.map((c) => url(links.category(c.path.split('/')))),
    ...data.brands.map((b) => url(links.brand(b.slug), b.updatedAt)),
    ...data.products.map((p) => url(links.product(p.slug), p.updatedAt)),
    '</urlset>',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' } });
};
