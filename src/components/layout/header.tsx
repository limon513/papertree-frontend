import { Suspense } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { Catalog } from '@/lib/types';
import { links } from '@/lib/utils';
import { ApiImage } from '@/components/ui/api-image';
import { CartButton } from './cart-button';
import { CategoriesMenu } from './categories-menu';
import { DeliverToButton } from './deliver-to';
import { SearchBox } from './search-box';

export function Logo({ catalog }: { catalog: Catalog }) {
  const { store } = catalog;
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${store.name} home`}>
      {store.logo ? (
        <ApiImage image={store.logo} alt="" sizes="56px" priority className="h-10 w-auto sm:h-11" />
      ) : null}
      <span className="leading-none">
        <span className="block font-display text-lg font-bold tracking-tight text-brand-800 uppercase sm:text-xl">{store.name}</span>
        <span className="block text-[10px] font-medium tracking-[0.3em] text-zinc-500 uppercase">Bangladesh</span>
      </span>
    </Link>
  );
}

export function Header({ catalog }: { catalog: Catalog }) {
  const { store, categories } = catalog;
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:gap-6">
        <Logo catalog={catalog} />
        <DeliverToButton className="hidden max-w-48 lg:flex" />
        <Suspense fallback={<div className="hidden h-11 flex-1 rounded-full bg-zinc-100 md:block" />}>
          <SearchBox className="hidden flex-1 md:block" />
        </Suspense>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {store.phone && (
            <a href={`tel:${store.phone}`} className="hidden items-center gap-2 text-sm xl:flex">
              <Phone className="size-4 text-brand-600" />
              <span className="leading-tight">
                <span className="block text-[11px] text-zinc-500">Order by phone</span>
                <span className="block font-medium text-zinc-800">{store.phone}</span>
              </span>
            </a>
          )}
          <CartButton className="hidden lg:flex" />
        </div>
      </div>

      {/* Phones and tablets: search under the logo. */}
      <div className="px-4 pb-2.5 sm:px-6 md:hidden">
        <Suspense fallback={<div className="h-11 rounded-full bg-zinc-100" />}>
          <SearchBox />
        </Suspense>
        <DeliverToButton compact className="mt-2 max-w-full" />
      </div>

      <nav className="mx-auto hidden max-w-7xl items-center gap-1 px-6 pb-2.5 lg:flex" aria-label="Categories">
        <CategoriesMenu categories={categories} />
        <ul className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto">
          {categories.slice(0, 7).map((c) => (
            <li key={c.id}>
              <Link
                href={links.category([c.slug])}
                className="block rounded-full px-3 py-2 text-sm whitespace-nowrap text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/deals/" className="rounded-full bg-marigold-100 px-3 py-2 text-sm font-semibold whitespace-nowrap text-zinc-900 hover:bg-marigold-200">
          Deals
        </Link>
        <Link href="/brands/" className="rounded-full px-3 py-2 text-sm whitespace-nowrap text-zinc-700 hover:bg-zinc-100">
          Brands
        </Link>
      </nav>
    </header>
  );
}
