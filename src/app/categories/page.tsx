import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { getCatalog } from '@/lib/api';
import { iconUrl, links } from '@/lib/utils';

export const metadata: Metadata = { title: 'All categories', alternates: { canonical: '/categories/' } };

export default async function CategoriesPage() {
  const { categories } = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">All categories</h1>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="rounded-3xl bg-white p-4 ring-1 ring-zinc-200/80">
            <Link href={links.category([c.slug])} className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50">
                {c.icon ? <img src={iconUrl(c.icon)} alt="" className="size-9" /> : <Sparkles className="size-6 text-brand-600" />}
              </span>
              <span className="flex-1">
                <span className="block font-display text-lg font-semibold text-zinc-900">{c.name}</span>
                <span className="text-sm text-zinc-500">{c.productCount} products</span>
              </span>
              <ChevronRight className="size-5 text-zinc-400" />
            </Link>
            {c.children.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {c.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={links.category([c.slug, child.slug])}
                      className="block rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 hover:bg-brand-50 hover:text-brand-800"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
