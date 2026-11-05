import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

export const metadata: Metadata = {
  title: 'New arrivals',
  description: 'The newest stationery, paper and art supplies at PaperTree.',
  alternates: { canonical: '/new/' },
};

export default async function NewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const params = listParams(query);
  const list = await getProducts({ ...params, sort: params.sort ?? 'newest' });
  return <ProductListing title="New arrivals" list={list} params={query} path="/new/" defaultSort="newest" />;
}
