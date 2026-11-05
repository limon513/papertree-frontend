import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import type { ProductList } from '@/lib/types';
import { cn, iconUrl } from '@/lib/utils';
import { ProductCard } from '@/components/product/product-card';
import { ActiveFilters, FilterButton, FilterPanel, SortSelect } from './filters';

export type SearchParams = Record<string, string | string[] | undefined>;

export const param = (params: SearchParams, key: string) => {
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
};

const SORTS = ['popular', 'newest', 'price_asc', 'price_desc', 'name', 'deals'];
const whole = (v: string | undefined) => (v && /^\d{1,7}$/.test(v) ? v : undefined);

/**
 * The filters a list page passes on to the API. Odd values from old links or typing (?page=abc,
 * ?sort=x) are dropped, so the page shows the normal list instead of an error.
 */
export const listParams = (params: SearchParams) => {
  let min = whole(param(params, 'min'));
  let max = whole(param(params, 'max'));
  // "500 – 100" means 100 – 500.
  if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
  const page = whole(param(params, 'page'));
  const sort = param(params, 'sort');
  return {
    brand: param(params, 'brand')?.split(',').filter((b) => /^[a-z0-9-]{1,120}$/.test(b)),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    min,
    max,
    inStock: param(params, 'inStock') === 'true' ? 'true' : undefined,
    onSale: param(params, 'onSale') === 'true' ? 'true' : undefined,
    page: page && Number(page) >= 1 && Number(page) <= 500 ? page : undefined,
  };
};

/** The address Google should keep for a list: without filters or sort (they only change the view), but with the page. */
export function canonicalFor(path: string, params: SearchParams) {
  const page = listParams(params).page;
  return page && page !== '1' ? `${path}?page=${page}` : path;
}

/** A page of products with breadcrumbs, sub-categories, sort, filters and page numbers. */
export function ProductListing({
  title,
  intro,
  crumbs = [],
  list,
  params,
  path,
  subcategories,
  hideBrandFilter = false,
  defaultSort = 'popular',
  empty,
}: {
  title: string;
  intro?: ReactNode;
  /** What to say when nothing matches (before any filter is used). */
  empty?: ReactNode;
  crumbs?: { name: string; href: string }[];
  list: ProductList;
  params: SearchParams;
  /** This page's address, for page links. */
  path: string;
  subcategories?: { name: string; href: string; icon: string | null; count: number }[];
  hideBrandFilter?: boolean;
  defaultSort?: string;
}) {
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const activeFilters =
    (param(params, 'brand')?.split(',').filter(Boolean).length ?? 0) +
    (param(params, 'min') || param(params, 'max') ? 1 : 0) +
    (param(params, 'inStock') === 'true' ? 1 : 0) +
    (param(params, 'onSale') === 'true' ? 1 : 0);

  const pageHref = (page: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && k !== 'page') q.set(k, v);
    if (page > 1) q.set('page', String(page));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };

  // Past the last page (an old link, or fewer products now): go to the last page.
  if (list.page > pages && list.total > 0) redirect(pageHref(pages));

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
      {crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-zinc-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-brand-700">Home</Link>
            </li>
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-1">
                <ChevronRight className="size-3.5" />
                <Link href={c.href} className="hover:text-brand-700">{c.name}</Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {list.total} product{list.total === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      {intro && <div className="mt-2 max-w-3xl text-sm text-zinc-600">{intro}</div>}

      {subcategories && subcategories.length > 0 && (
        <ul className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {subcategories.map((s) => (
            <li key={s.href} className="shrink-0">
              <Link href={s.href} className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-sm ring-1 ring-zinc-200 hover:ring-brand-300">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-50">
                  {s.icon ? <img src={iconUrl(s.icon)} alt="" className="size-5" /> : null}
                </span>
                <span className="font-medium text-zinc-800">{s.name}</span>
                <span className="text-xs text-zinc-400">{s.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <Suspense>
            <FilterPanel facets={list.facets} hideBrands={hideBrandFilter} />
          </Suspense>
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Suspense>
              <FilterButton facets={list.facets} hideBrands={hideBrandFilter} active={activeFilters} total={list.total} />
              <div className="hidden min-w-0 flex-1 lg:block">
                <ActiveFilters facets={list.facets} />
              </div>
              <SortSelect defaultSort={defaultSort} />
            </Suspense>
          </div>
          <div className="mb-3 lg:hidden">
            <Suspense>
              <ActiveFilters facets={list.facets} />
            </Suspense>
          </div>

          {list.items.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-zinc-50 px-6 py-16 text-center">
              <PackageSearch className="size-10 text-zinc-400" />
              {activeFilters ? (
                <>
                  <p className="mt-3 font-display text-lg font-semibold">No products with these filters</p>
                  <p className="mt-1 text-sm text-zinc-500">Try removing a filter.</p>
                </>
              ) : (
                (empty ?? (
                  <>
                    <p className="mt-3 font-display text-lg font-semibold">Nothing here yet</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Have a look at{' '}
                      <Link href="/categories/" className="text-brand-700 underline">
                        our other categories
                      </Link>
                      .
                    </p>
                  </>
                ))
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
              {list.items.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} className="h-full" priority={i < 4} />
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-1">
              <PageLink href={pageHref(list.page - 1)} disabled={list.page <= 1} label="Previous page">
                <ChevronLeft className="size-4" />
              </PageLink>
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - list.page) <= 1)
                .map((n, i, all) => (
                  <span key={n} className="flex items-center gap-1">
                    {i > 0 && n - all[i - 1]! > 1 && <span className="px-1 text-zinc-400">…</span>}
                    <PageLink href={pageHref(n)} current={n === list.page} label={`Page ${n}`}>
                      {n}
                    </PageLink>
                  </span>
                ))}
              <PageLink href={pageHref(list.page + 1)} disabled={list.page >= pages} label="Next page">
                <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({ href, children, current, disabled, label }: { href: string; children: ReactNode; current?: boolean; disabled?: boolean; label: string }) {
  const cls = cn(
    'flex size-10 items-center justify-center rounded-full text-sm font-medium tabular-nums',
    current ? 'bg-brand-700 text-white' : 'text-zinc-700 ring-1 ring-zinc-200 hover:ring-zinc-400',
    disabled && 'pointer-events-none opacity-30',
  );
  return disabled ? (
    <span className={cls} aria-hidden>
      {children}
    </span>
  ) : (
    <Link href={href} className={cls} aria-label={label} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  );
}
