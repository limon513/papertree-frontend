import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { canonicalFor, listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

interface Props {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return {
    title: 'New arrivals',
    description: 'The newest stationery, paper and art supplies at PaperTree.',
    alternates: { canonical: canonicalFor('/new/', await searchParams) },
  };
}

export default async function NewPage({ searchParams }: Props) {
  const query = await searchParams;
  const params = listParams(query);
  const list = await getProducts({ ...params, sort: params.sort ?? 'newest' });
  return <ProductListing title="New arrivals" list={list} params={query} path="/new/" defaultSort="newest" />;
}
