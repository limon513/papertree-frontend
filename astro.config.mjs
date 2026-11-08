import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Pages are made on the server for each visit (Cloudflare keeps them for a minute), so prices and stock stay fresh.
  output: 'server',
  // server.mjs serves the site: compression, long-lived built files, then the pages.
  adapter: node({ mode: 'middleware' }),
  integrations: [preact()],
  // Keep the old WooCommerce addresses: /product/pen-name/
  trailingSlash: 'always',
  // Next pages start loading when a link is pointed at or tapped: clicks feel instant.
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  env: {
    schema: {
      API_URL: envField.string({ context: 'server', access: 'public', default: 'http://localhost:4000' }),
      PUBLIC_API_URL: envField.string({ context: 'client', access: 'public', default: 'http://localhost:4000' }),
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', default: 'http://localhost:3000' }),
    },
  },
  vite: { plugins: [tailwindcss()] },
});
