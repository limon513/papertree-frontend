import type { APIRoute } from 'astro';
import { SITE_URL } from '@/lib/utils';

/** What search engines may read. Private and endless pages (cart, account, search results) are left out. */
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Disallow: /cart/',
      'Disallow: /checkout/',
      'Disallow: /account/',
      'Disallow: /search/',
      'Disallow: /*?*sort=',
      'Disallow: /*?*min=',
      'Disallow: /*?*max=',
      'Allow: /',
      '',
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      '',
    ].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
  );
