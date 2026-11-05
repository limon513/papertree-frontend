'use client';

import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { ui } from '@/lib/ui';
import { cn, money } from '@/lib/utils';

/** Header cart: item count and total; opens the cart panel. */
export function CartButton({ className }: { className?: string }) {
  const { count, subtotal } = useCart();
  return (
    <button
      type="button"
      onClick={() => ui.open('cart')}
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
      className={cn('relative flex h-11 items-center gap-2 rounded-full bg-brand-700 pr-4 pl-3 text-white hover:bg-brand-800', className)}
    >
      <ShoppingBag className="size-5" />
      <span className="text-sm font-semibold tabular-nums">{count ? money(subtotal) : 'Cart'}</span>
      {count > 0 && (
        <span
          key={count}
          className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-marigold-300 px-1 text-[11px] font-bold text-zinc-900 ring-2 ring-white"
        >
          {count}
        </span>
      )}
    </button>
  );
}
