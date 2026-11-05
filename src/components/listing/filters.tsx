'use client';

import { useEffect, useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import type { ProductList } from '@/lib/types';
import { cn } from '@/lib/utils';

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'deals', label: 'Biggest discount' },
] as const;

/**
 * The filters in the address (so Back and shared links keep them). A change shows at once,
 * while the new results load (`pending`).
 */
function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const real = useSearchParams().toString();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(real);
  const params = new URLSearchParams(shown);

  const set = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(shown);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    next.delete('page');
    const query = next.toString();
    startTransition(() => {
      setShown(query);
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };
  return { params, set, pending };
}

export function SortSelect({ defaultSort = 'popular' }: { defaultSort?: string }) {
  const { params, set: setParams, pending } = useFilterParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      {pending && <Loader2 className="size-4 animate-spin text-zinc-400" aria-label="Updating" />}
      <span className="hidden text-zinc-500 sm:inline">Sort</span>
      <select
        value={params.get('sort') ?? defaultSort}
        onChange={(e) => setParams({ sort: e.target.value === defaultSort ? null : e.target.value })}
        className="h-10 rounded-full border border-zinc-300 bg-white pr-8 pl-3 text-sm"
        aria-label="Sort products"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-zinc-100 py-4 first:pt-0 last:border-b-0">
      <legend className="mb-2 text-sm font-semibold text-zinc-900">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Brand, price and availability filters. */
export function FilterPanel({ facets, hideBrands = false }: { facets: ProductList['facets']; hideBrands?: boolean }) {
  const { params, set: setParams, pending } = useFilterParams();
  const chosen = (params.get('brand') ?? '').split(',').filter(Boolean);
  // The price boxes follow the address, but only when it really changes (not while typing).
  const minParam = params.get('min') ?? '';
  const maxParam = params.get('max') ?? '';
  const [min, setMin] = useState(minParam);
  const [max, setMax] = useState(maxParam);
  useEffect(() => {
    setMin(minParam);
    setMax(maxParam);
  }, [minParam, maxParam]);

  const toggleBrand = (slug: string) => {
    const next = chosen.includes(slug) ? chosen.filter((b) => b !== slug) : [...chosen, slug];
    setParams({ brand: next.join(',') || null });
  };
  const toggle = (key: string) => setParams({ [key]: params.get(key) === 'true' ? null : 'true' });

  return (
    <div className="relative">
      {pending && (
        <p className="absolute -top-6 left-0 flex items-center gap-1.5 text-xs text-zinc-500" role="status">
          <Loader2 className="size-3.5 animate-spin" /> Updating…
        </p>
      )}
      {!hideBrands && facets.brands.length > 0 && (
        <FilterSection title="Brand">
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {facets.brands.map((b) => (
              <li key={b.slug}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-zinc-50">
                  <input type="checkbox" checked={chosen.includes(b.slug)} onChange={() => toggleBrand(b.slug)} className="size-4 accent-brand-700" />
                  <span className="flex-1 text-zinc-800">{b.name}</span>
                  <span className="text-xs text-zinc-400 tabular-nums">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      )}
      {facets.price && facets.price.max > facets.price.min && (
        <FilterSection title="Price (৳)">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ min: min || null, max: max || null });
            }}
          >
            <input
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
              placeholder={String(facets.price.min)}
              aria-label="Lowest price"
              className="h-10 w-full min-w-0 rounded-xl border border-zinc-300 px-3 text-sm"
            />
            <span className="text-zinc-400">–</span>
            <input
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
              placeholder={String(facets.price.max)}
              aria-label="Highest price"
              className="h-10 w-full min-w-0 rounded-xl border border-zinc-300 px-3 text-sm"
            />
            <button type="submit" className="h-10 shrink-0 rounded-xl bg-zinc-900 px-3 text-sm font-medium text-white">
              Go
            </button>
          </form>
        </FilterSection>
      )}
      <FilterSection title="Show">
        {[
          { key: 'inStock', label: 'In stock only' },
          { key: 'onSale', label: 'On sale' },
        ].map((f) => (
          <label key={f.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm hover:bg-zinc-50">
            <input type="checkbox" checked={params.get(f.key) === 'true'} onChange={() => toggle(f.key)} className="size-4 accent-brand-700" />
            {f.label}
          </label>
        ))}
      </FilterSection>
    </div>
  );
}

/** Phones: the filters open in a sheet. */
export function FilterButton({ facets, hideBrands, active }: { facets: ProductList['facets']; hideBrands?: boolean; active: number }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  useEffect(() => setOpen(false), [params]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium lg:hidden', active ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-zinc-300')}
      >
        <SlidersHorizontal className="size-4" /> Filters{active > 0 && ` (${active})`}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 lg:hidden" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filters</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="rounded-full p-1.5 hover:bg-zinc-100">
                <X className="size-5" />
              </button>
            </div>
            <FilterPanel facets={facets} hideBrands={hideBrands} />
          </div>
        </div>
      )}
    </>
  );
}

/** Chips for the active filters, each with ×. */
export function ActiveFilters({ facets }: { facets: ProductList['facets'] }) {
  const { params, set: setParams } = useFilterParams();
  const brands = (params.get('brand') ?? '').split(',').filter(Boolean);
  const chips: { label: string; clear: Record<string, string | null> }[] = [
    ...brands.map((slug) => ({
      label: facets.brands.find((b) => b.slug === slug)?.name ?? slug,
      clear: { brand: brands.filter((b) => b !== slug).join(',') || null },
    })),
    ...(params.get('min') || params.get('max')
      ? [{ label: `৳${params.get('min') ?? '0'} – ${params.get('max') ? `৳${params.get('max')}` : 'any'}`, clear: { min: null, max: null } }]
      : []),
    ...(params.get('inStock') === 'true' ? [{ label: 'In stock', clear: { inStock: null } }] : []),
    ...(params.get('onSale') === 'true' ? [{ label: 'On sale', clear: { onSale: null } }] : []),
  ];
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => setParams(c.clear)}
          className="flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-2 pl-3 text-sm text-brand-800 hover:bg-brand-100"
        >
          {c.label} <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => setParams({ brand: null, min: null, max: null, inStock: null, onSale: null })}
        className="px-2 text-sm text-zinc-500 underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  );
}
