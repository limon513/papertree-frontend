import { useEffect, useState } from 'preact/hooks';
import { cart, useCart } from './cart';
import type { CartCheck } from './types';
import { API_PUBLIC_URL, money } from './utils';

/**
 * Checks the cart with the shop: today's prices, what is still in stock, and the delivery charge for
 * the shopper's area. Fixes the saved cart to match, and says what changed in plain words ("Only 3
 * left, so we lowered your quantity"), so nothing changes behind the shopper's back.
 * Used by the cart panel (while open) and the cart page.
 */
export function useCartCheck(active: boolean) {
  const s = useCart();
  const { items, deliverTo } = s;
  const [check, setCheck] = useState<CartCheck | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  // Bumped to check again now (checkout, after the shop said prices changed).
  const [round, setRound] = useState(0);
  const key = JSON.stringify([items.map((i) => [i.variantId, i.quantity]), deliverTo?.districtId, deliverTo?.areaId]);

  useEffect(() => {
    if (!active || !items.length) {
      setCheck(null);
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_PUBLIC_URL}/v1/store/cart`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({ variantId: i.variantId, quantity: Math.min(i.quantity, 9999) })),
            districtId: deliverTo?.districtId ?? null,
            areaId: deliverTo?.areaId ?? null,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const result = (await res.json()) as CartCheck;
        setCheck(result);

        // What changed since the item was added.
        const changes: string[] = [];
        for (const line of result.lines) {
          const item = items.find((i) => i.variantId === line.variantId);
          if (!item) continue;
          const name = `“${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''}”`;
          if (line.problem === 'gone') changes.push(`${name} is no longer sold, so we took it out of your cart.`);
          else if (line.problem === 'out_of_stock') changes.push(`${name} just sold out, so we took it out of your cart.`);
          else if (line.problem === 'reduced') changes.push(`Only ${line.quantity} of ${name} left, so we lowered your quantity.`);
          if (line.price !== undefined && line.price !== item.price && line.problem !== 'gone' && line.problem !== 'out_of_stock')
            changes.push(`The price of ${name} is now ${money(line.price)} (was ${money(item.price)}).`);
        }
        if (changes.length) setNotes((old) => [...old, ...changes.filter((c) => !old.includes(c))]);

        const gone = result.lines.filter((l) => l.problem === 'gone').map((l) => l.variantId);
        const fresh = result.lines
          .filter((l) => l.problem !== 'gone')
          .map((l) => ({ variantId: l.variantId, price: l.price, regularPrice: l.regularPrice ?? null, quantity: l.quantity, maxQuantity: l.maxQuantity ?? null }));
        const differs = fresh.some((f) => {
          const i = items.find((x) => x.variantId === f.variantId);
          return !i || i.price !== f.price || i.quantity !== f.quantity || i.maxQuantity !== f.maxQuantity || i.regularPrice !== f.regularPrice;
        });
        if (gone.length || differs) cart.update(fresh, gone);
      } catch {
        // Offline: the saved cart is shown as it is.
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, key, round]);

  return { check, notes, dismissNotes: () => setNotes([]), checking, recheck: () => setRound((n) => n + 1) };
}
