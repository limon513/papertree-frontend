import { useEffect, useState } from 'preact/hooks';
import { me, useMe } from './account';
import { API_PUBLIC_URL } from './utils';

/**
 * Wholesale prices for a signed-in approved business. Pages are the same for everyone (and kept by
 * the CDN), so they carry retail prices; for a business they are swapped in the browser. The shop
 * decides who is a business: it answers only for one.
 */

export interface WholesalePrice {
  price: number;
  /** The retail price when it is higher (crossed out). */
  regularPrice: number | null;
}
type Kind = 'products' | 'variants';

const known = new Map<string, WholesalePrice | null>();
const key = (kind: Kind, id: number) => `${kind[0]}${id}`;

/** Prices for these products (cheapest option, as on cards) and variants. Asked once per id per page. */
export async function wholesalePrices(ask: { products?: number[]; variants?: number[] }) {
  const want = (kind: Kind) => [...new Set(ask[kind] ?? [])].filter((id) => !known.has(key(kind, id)));
  const products = want('products');
  const variants = want('variants');
  if (products.length || variants.length) {
    const params = new URLSearchParams();
    if (products.length) params.set('products', products.slice(0, 200).join(','));
    if (variants.length) params.set('variants', variants.slice(0, 200).join(','));
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/me/wholesale-prices?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = (await res.json()) as Record<Kind, Record<string, WholesalePrice>>;
        for (const id of products) known.set(key('products', id), data.products[id] ?? null);
        for (const id of variants) known.set(key('variants', id), data.variants[id] ?? null);
      }
    } catch {
      // Offline: retail prices stay (the cart and checkout still use the right prices).
    }
  }
  const pick = (kind: Kind, ids: number[] = []) => new Map(ids.flatMap((id) => (known.get(key(kind, id)) ? [[id, known.get(key(kind, id))!] as const] : [])));
  return { products: pick('products', ask.products), variants: pick('variants', ask.variants) };
}

/** Is the shopper (as far as this page knows) an approved business? */
export const isBusiness = () => me.value?.business === true;

/** For an island: wholesale prices of these variants, or null for everyone else (and while loading). */
export function useWholesaleVariants(ids: number[]) {
  const m = useMe();
  const [prices, setPrices] = useState<Map<number, WholesalePrice> | null>(null);
  const idsKey = ids.join(',');
  useEffect(() => {
    if (!m?.business || !ids.length) return setPrices(null);
    let live = true;
    void wholesalePrices({ variants: ids }).then((r) => live && setPrices(r.variants.size ? r.variants : null));
    return () => {
      live = false;
    };
  }, [m?.business, idsKey]);
  return prices;
}
