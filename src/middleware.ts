import { defineMiddleware } from 'astro:middleware';
import { cleanPath, countHit, countNotFound, redirectFor } from './lib/redirects';

/**
 * Every visit, before the page: old addresses are sent on (301, so Google moves the ranking with
 * them), addresses gone for good answer 410, and pages that end on "not found" are noted for staff.
 */

/** Old WordPress addresses that follow a pattern (no list needed). */
function patternRedirect(url: URL): string | null {
  const p = url.pathname.toLowerCase();
  // The old sitemaps (Google Search Console still knows them).
  if (/^\/(sitemap_index|wp-sitemap|(product|page|post|category|portfolio|order_status)-sitemap\d*)\.xml$/.test(p)) return '/sitemap.xml';
  // Listing pages: /shop/page/2/ -> /shop/?page=2
  const paged = p.match(/^(.*\/)page\/(\d+)\/?$/);
  if (paged) {
    const q = new URLSearchParams(url.search);
    if (paged[2] !== '1') q.set('page', paged[2]!);
    const qs = q.toString();
    return `${paged[1] === '/' ? '/shop/' : paged[1]}${qs ? `?${qs}` : ''}`;
  }
  // Feeds and old mobile pages: the page itself.
  const tail = p.match(/^(.*\/)(feed|amp|embed)\/?$/);
  if (tail) return tail[1] === '/' ? '/' : tail[1]!;
  // Product tags: a search for the tag.
  const tag = p.match(/^\/product-tag\/([^/]+)\/?$/);
  if (tag) return `/search/?q=${encodeURIComponent(decodeURIComponent(tag[1]!).replace(/-/g, ' '))}`;
  // "Add to cart" links: the page without it.
  if (url.searchParams.has('add-to-cart')) {
    const q = new URLSearchParams(url.search);
    q.delete('add-to-cart');
    q.delete('quantity');
    const qs = q.toString();
    return `${url.pathname}${qs ? `?${qs}` : ''}`;
  }
  // Capital letters: every address here is lower case.
  if (url.pathname !== url.pathname.toLowerCase() && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return url.pathname.toLowerCase() + url.search;
  return null;
}

const isPage = (path: string) => !/\.[a-z0-9]{2,5}$/.test(path) || path.endsWith('.html');

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  // The website's own "not found" and error pages (shown in place of a missing page): never redirected or logged.
  if (/^\/(404|500)\/?$/.test(url.pathname)) return next();

  const pattern = patternRedirect(url);
  if (pattern && pattern !== url.pathname + url.search) return context.redirect(pattern, 301);

  const path = cleanPath(url.pathname);
  const rule = await redirectFor(path);
  if (rule) {
    countHit(path);
    if (rule.code === 410) {
      // Gone for good: the "not found" page, with 410 so Google drops it.
      const page = await context.rewrite('/404/');
      return new Response(page.body, { status: 410, headers: page.headers });
    }
    // Shared links keep their extra parts (utm_source=facebook...) when the new address has none.
    const target = rule.to.includes('?') || !url.search ? rule.to : `${rule.to}${url.search}`;
    return context.redirect(target, rule.code === 302 ? 302 : 301);
  }

  const response = await next();
  if (response.status === 404 && isPage(path)) countNotFound(path, request.headers.get('referer'));
  return response;
});
