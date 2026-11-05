'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { onAdded, useCart, type CartItem } from '@/lib/cart';
import { ui } from '@/lib/ui';
import { imageAt, money } from '@/lib/utils';

/** "Added" bar after each add: cart size and total, with a way to the cart. Fades after a moment. */
export function AddedNotice() {
  const [item, setItem] = useState<CartItem | null>(null);
  const { count, subtotal } = useCart();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const off = onAdded((added) => {
      setItem(added);
      clearTimeout(timer);
      timer = setTimeout(() => setItem(null), 2800);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  if (!item) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-6 lg:justify-end lg:px-6">
      <div
        key={`${item.variantId}-${count}`}
        role="status"
        className="pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-2xl bg-zinc-900 py-2 pr-2 pl-2 text-white shadow-xl"
      >
        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-white">
          {item.image && <img src={imageAt(item.image, 160)} alt="" className="size-full object-contain" />}
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-brand-500">
            <Check className="size-3" strokeWidth={3} />
          </span>
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block truncate text-zinc-300">Added {item.name}</span>
          <span className="font-semibold tabular-nums">
            {count} item{count === 1 ? '' : 's'} · {money(subtotal)}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            setItem(null);
            ui.open('cart');
          }}
          className="h-10 shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-400"
        >
          View cart
        </button>
      </div>
    </div>
  );
}
