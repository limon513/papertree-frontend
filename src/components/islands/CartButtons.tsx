import { ShoppingBag } from 'lucide-preact';
import { countOf, panel, subtotalOf, useCart } from '@/lib/cart';
import { cn, money } from '@/lib/utils';

const label = (n: number) => `Cart, ${n} item${n === 1 ? '' : 's'}`;

/** Header cart: item count and total. */
export function HeaderCart({ className }: { className?: string }) {
  const s = useCart();
  const count = countOf(s);
  return (
    <button
      type="button"
      onClick={() => (panel.value = 'cart')}
      aria-label={label(count)}
      class={cn('relative flex h-11 items-center gap-2 rounded-full bg-brand-700 pr-4 pl-3 text-white hover:bg-brand-800', className)}
    >
      <ShoppingBag class="size-5" />
      <span class="text-sm font-semibold tabular-nums">{count ? money(subtotalOf(s)) : 'Cart'}</span>
      {count > 0 && (
        <span key={count} class="absolute -top-1 -right-1 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-marigold-300 px-1 text-[11px] font-bold text-zinc-900 ring-2 ring-white">
          {count}
        </span>
      )}
    </button>
  );
}

/** Cart tab in the phone tab bar. */
export function TabCart() {
  const s = useCart();
  const count = countOf(s);
  return (
    <button type="button" onClick={() => (panel.value = 'cart')} aria-label={label(count)} class="relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-zinc-500">
      <span class="relative">
        <ShoppingBag class="size-[22px]" strokeWidth={1.8} />
        {count > 0 && (
          <span key={count} class="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </span>
      Cart
    </button>
  );
}
