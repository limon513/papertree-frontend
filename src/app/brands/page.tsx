import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalog } from '@/lib/api';
import { iconUrl, links } from '@/lib/utils';
import { ApiImage } from '@/components/ui/api-image';

export const metadata: Metadata = { title: 'All brands', alternates: { canonical: '/brands/' } };

export default async function BrandsPage() {
  const { brands } = await getCatalog();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">All brands</h1>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {brands.map((b) => (
          <li key={b.slug}>
            <Link
              href={links.brand(b.slug)}
              className="flex h-32 flex-col items-center justify-center gap-2 rounded-3xl bg-white p-4 text-center ring-1 ring-zinc-200/80 transition hover:-translate-y-0.5 hover:ring-brand-300"
            >
              {b.image ? (
                <ApiImage image={b.image} alt={b.name} sizes="160px" className="h-12 w-auto" />
              ) : b.icon ? (
                <img src={iconUrl(b.icon)} alt="" className="size-10" />
              ) : null}
              <span className="font-semibold text-zinc-800">{b.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
