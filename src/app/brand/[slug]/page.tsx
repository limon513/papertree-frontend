import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog, getProducts } from '@/lib/api';
import { links } from '@/lib/utils';
import { listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

async function brandFor(slug: string) {
  const brand = (await getCatalog()).brands.find((b) => b.slug === decodeURIComponent(slug));
  if (!brand) notFound();
  return brand;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = await brandFor((await params).slug);
  return {
    title: `${brand.name} products — buy online in Bangladesh`,
    description: `Original ${brand.name} stationery and art supplies with cash on delivery across Bangladesh.`,
    alternates: { canonical: links.brand(brand.slug) },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const brand = await brandFor(slug);
  const list = await getProducts({ ...listParams(query), brand: [brand.slug] });
  return (
    <ProductListing
      title={brand.name}
      crumbs={[{ name: 'Brands', href: '/brands/' }]}
      list={list}
      params={query}
      path={links.brand(brand.slug)}
      hideBrandFilter
    />
  );
}
