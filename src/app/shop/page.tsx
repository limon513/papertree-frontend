import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

export const metadata: Metadata = {
  title: 'All products',
  description: 'Every pen, notebook, paper and art supply we sell, with cash on delivery across Bangladesh.',
  alternates: { canonical: '/shop/' },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const list = await getProducts(listParams(query));
  return <ProductListing title="All products" list={list} params={query} path="/shop/" />;
}
