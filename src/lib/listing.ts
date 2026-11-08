import type { ProductList } from './types';

/** Filters and sort that list pages understand, as they appear in the address. */
export const FILTER_KEYS = ['brand', 'min', 'max', 'inStock', 'onSale'] as const;

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'deals', label: 'Biggest discount' },
] as const;

const SORTS: string[] = [...SORT_OPTIONS.map((o) => o.value), 'name'];
const whole = (v: string | null) => (v && /^\d{1,7}$/.test(v) ? v : undefined);

/**
 * The filters a list page passes on to the API. Odd values from old links or typing (?page=abc,
 * ?sort=x) are dropped, so the page shows the normal list instead of an error.
 */
export function listParams(q: URLSearchParams) {
  let min = whole(q.get('min'));
  let max = whole(q.get('max'));
  // "500 – 100" means 100 – 500.
  if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
  const page = whole(q.get('page'));
  const sort = q.get('sort');
  // brand=a,b (our links) or brand=a&brand=b (a plain form).
  const brand = q
    .getAll('brand')
    .flatMap((b) => b.split(','))
    .filter((b) => /^[a-z0-9-]{1,120}$/.test(b));
  return {
    brand: [...new Set(brand)],
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    min,
    max,
    inStock: q.get('inStock') === 'true' ? 'true' : undefined,
    onSale: q.get('onSale') === 'true' ? 'true' : undefined,
    page: page && Number(page) >= 1 && Number(page) <= 500 ? page : undefined,
  };
}
export type ListParams = ReturnType<typeof listParams>;

/** This list's address with some options changed (null removes one). Page numbers reset unless set. */
export function hrefWith(path: string, params: ListParams, changes: Partial<Record<keyof ListParams, string | string[] | null>>) {
  const merged: Record<string, string | string[] | undefined | null> = { ...params, page: undefined, ...changes };
  const q = new URLSearchParams();
  for (const key of ['sort', ...FILTER_KEYS, 'page']) {
    const v = merged[key];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    q.set(key, Array.isArray(v) ? v.join(',') : v);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** The address Google should keep: without filters or sort (they only change the view), but with the page. */
export const canonicalFor = (path: string, params: ListParams) => (params.page && params.page !== '1' ? `${path}?page=${params.page}` : path);

/** The active filters as removable chips. */
export function activeChips(path: string, params: ListParams, facets: ProductList['facets'], hide: string[] = []) {
  const chips: { label: string; href: string }[] = [];
  if (!hide.includes('brand'))
    for (const slug of params.brand)
      chips.push({ label: facets.brands.find((b) => b.slug === slug)?.name ?? slug, href: hrefWith(path, params, { brand: params.brand.filter((b) => b !== slug) }) });
  if (params.min || params.max)
    chips.push({ label: `৳${params.min ?? '0'} – ${params.max ? `৳${params.max}` : 'any'}`, href: hrefWith(path, params, { min: null, max: null }) });
  if (params.inStock) chips.push({ label: 'In stock', href: hrefWith(path, params, { inStock: null }) });
  if (params.onSale && !hide.includes('onSale')) chips.push({ label: 'On sale', href: hrefWith(path, params, { onSale: null }) });
  return chips;
}

/** Page numbers to show: first, last and the ones around the current page (null = "…"). */
export function pageNumbers(current: number, pages: number) {
  const shown = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - current) <= 1);
  const out: (number | null)[] = [];
  shown.forEach((n, i) => {
    if (i > 0 && n - shown[i - 1]! > 1) out.push(null);
    out.push(n);
  });
  return out;
}
