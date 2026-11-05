import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { canonicalFor, listParams, ProductListing, type SearchParams } from '@/components/listing/product-listing';

interface Props {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return {
    title: 'Deals and discounts',
    description: 'Stationery, paper and art supplies on sale today.',
    alternates: { canonical: canonicalFor('/deals/', await searchParams) },
  };
}

export default async function DealsPage({ searchParams }: Props) {
  const query = await searchParams;
  const params = listParams(query);
  const list = await getProducts({ ...params, onSale: 'true', sort: params.sort ?? 'deals' });
  return (
    <ProductListing
      title="Today’s deals"
      intro="Everything on sale right now, biggest discount first."
      list={list}
      params={query}
      path="/deals/"
      defaultSort="deals"
    />
  );
}
