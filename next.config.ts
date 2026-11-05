import type { NextConfig } from 'next';

const config: NextConfig = {
  // The old WooCommerce site used addresses ending in "/" (e.g. /product/a4-paper/).
  // Keeping them identical keeps Google rankings.
  trailingSlash: true,
  poweredByHeader: false,
  // Product images are already resized to WebP by the API; plain <img srcset> is used.
  images: { unoptimized: true },
};

export default config;
