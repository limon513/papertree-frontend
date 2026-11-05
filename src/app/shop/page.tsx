import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { canonicalFor, listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

interface Props {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return {
    title: 'All products',
    description: 'Every pen, notebook, paper and art supply we sell, with cash on delivery across Bangladesh.',
    alternates: { canonical: canonicalFor('/shop/', await searchParams) },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const query = await searchParams;
  const list = await getProducts(listParams(query));
  return <ProductListing title="All products" list={list} params={query} path="/shop/" />;
}
