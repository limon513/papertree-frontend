import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getCatalog, getProduct } from '@/lib/api';
import { imageAt, links, SITE_URL } from '@/lib/utils';
import { ProductBuy } from '@/components/product/product-buy';
import { ProductRail } from '@/components/product/product-rail';

interface Props {
  params: Promise<{ slug: string }>;
}

// Each product page is made on its first visit, then kept and refreshed every minute.
export const revalidate = 60;
export const generateStaticParams = async () => [];

const plain = (html: string | null) => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(decodeURIComponent((await params).slug));
  const description = product.seoDescription ?? (product.shortDescription || plain(product.description)).slice(0, 160);
  const image = product.images[0];
  return {
    title: product.seoTitle ?? product.name,
    description,
    alternates: { canonical: links.product(product.slug) },
    openGraph: { title: product.name, description, images: image ? [{ url: imageAt(image, 800) }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const [product, { store }] = await Promise.all([getProduct(decodeURIComponent((await params).slug)), getCatalog()]);
  const path = product.categoryPath;
  const prices = product.variants.map((v) => v.price);

  // What Google shows in search results: price, stock, brand.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? plain(product.description).slice(0, 500),
    image: product.images.map((i) => imageAt(i, 800)),
    sku: product.variants[0]?.sku ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BDT',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.inStock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: store.name },
    },
    url: `${SITE_URL}${links.product(product.slug)}`,
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-brand-700">Home</Link>
            </li>
            {path.map((c, i) => (
              <li key={c.slug} className="flex items-center gap-1">
                <ChevronRight className="size-3.5" />
                <Link href={links.category(path.slice(0, i + 1).map((p) => p.slug))} className="hover:text-brand-700">
                  {c.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <ProductBuy product={product} />

        {(product.description || product.specs.length > 0) && (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            {product.description ? (
              <section>
                <h2 className="font-display text-xl font-semibold">About this product</h2>
                {/* Cleaned by the API when it was saved. */}
                <div className="rich-text mt-3" dangerouslySetInnerHTML={{ __html: product.description }} />
              </section>
            ) : (
              <div />
            )}
            {product.specs.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-semibold">Details</h2>
                <dl className="mt-3 divide-y divide-zinc-100 rounded-2xl ring-1 ring-zinc-200">
                  {product.specs.map((s) => (
                    <div key={s.name} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                      <dt className="text-zinc-500">{s.name}</dt>
                      <dd className="text-right font-medium text-zinc-800">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
      </div>

      <ProductRail
        title="You may also need"
        href={path.length ? links.category(path.map((p) => p.slug)) : undefined}
        products={product.related}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
