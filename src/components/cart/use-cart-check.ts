'use client';

import { useEffect, useState } from 'react';
import { cart, useCart } from '@/lib/cart';
import type { CartCheck } from '@/lib/types';
import { API_PUBLIC_URL } from '@/lib/utils';

/**
 * Asks the API about the cart (today's prices, stock, delivery charge) while `active`, and again
 * after each change. Updates the saved cart and tells what changed.
 */
export function useCartCheck(active: boolean) {
  const { items, deliverTo } = useCart();
  const [check, setCheck] = useState<CartCheck | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const key = JSON.stringify([items.map((i) => [i.variantId, i.quantity]), deliverTo?.districtId, deliverTo?.areaId]);

  useEffect(() => {
    if (!active || !items.length) {
      setCheck(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_PUBLIC_URL}/v1/store/cart`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
            districtId: deliverTo?.districtId ?? null,
            areaId: deliverTo?.areaId ?? null,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const result = (await res.json()) as CartCheck;
        setCheck(result);

        const changes: string[] = [];
        const gone: number[] = [];
        const fresh = [];
        for (const line of result.lines) {
          const before = items.find((i) => i.variantId === line.variantId);
          if (line.problem === 'gone') {
            gone.push(line.variantId);
            changes.push(`${before?.name ?? 'A product'} is no longer sold and was removed.`);
            continue;
          }
          if (line.problem === 'out_of_stock') changes.push(`${line.name} is out of stock and was removed.`);
          else if (line.problem === 'reduced') changes.push(`Only ${line.maxQuantity} of ${line.name} left: the quantity was lowered.`);
          else if (before && line.price !== undefined && before.price !== line.price) changes.push(`The price of ${line.name} changed.`);
          fresh.push({
            variantId: line.variantId,
            name: line.name,
            variantLabel: line.variantLabel ?? null,
            image: line.image ?? null,
            price: line.price,
            regularPrice: line.regularPrice ?? null,
            maxQuantity: line.maxQuantity ?? null,
            quantity: line.quantity,
          });
        }
        if (changes.length) setNotes(changes);
        // Only write back when something differs, so this does not loop.
        const differs = fresh.some((f) => {
          const i = items.find((x) => x.variantId === f.variantId);
          return !i || i.price !== f.price || i.quantity !== f.quantity || i.maxQuantity !== f.maxQuantity || i.name !== f.name;
        });
        if (gone.length || differs) cart.update(fresh as Parameters<typeof cart.update>[0], gone);
      } catch {
        // Offline: show the saved cart as it is.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, key]);

  return { check, notes, clearNotes: () => setNotes([]) };
}
