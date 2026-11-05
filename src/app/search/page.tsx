import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getProducts } from '@/lib/api';
import { SearchBox } from '@/components/layout/search-box';
import { listParams, param, ProductListing, type SearchParams } from '@/components/listing/product-listing';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const q = param(query, 'q')?.trim() ?? '';

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Search</h1>
        <Suspense>
          <SearchBox className="mt-4" autoFocus />
        </Suspense>
        <p className="mt-4 text-sm text-zinc-500">Try “gel pen”, “A4 paper”, “acrylic” or a brand like “Doms”.</p>
      </div>
    );
  }

  const list = await getProducts({ ...listParams(query), q: q.slice(0, 100) });
  return (
    <ProductListing
      title={`Results for “${q}”`}
      list={list}
      params={query}
      path="/search/"
      empty={
        <>
          <p className="mt-3 font-display text-lg font-semibold">No products match “{q}”</p>
          <p className="mt-1 text-sm text-zinc-500">Check the spelling, try a shorter word, or browse the categories.</p>
          <Link href="/categories/" className="mt-4 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            Browse categories
          </Link>
        </>
      }
    />
  );
}
