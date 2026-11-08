import { ShoppingCart } from 'lucide-preact';
import { countOf, panel, useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';

const label = (n: number) => `Cart, ${n} item${n === 1 ? '' : 's'}`;

/** Count bubble on the cart icon. Absolutely placed, so it never moves anything around it. */
function Count({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span key={count} class={cn('absolute flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-marigold-300 px-1 text-[11px] font-bold text-zinc-900 ring-2 ring-white tabular-nums', className)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/** Header cart: an icon with the number of items. Always the same size. */
export function HeaderCart({ className }: { className?: string }) {
  const count = countOf(useCart());
  return (
    <button
      type="button"
      onClick={() => (panel.value = 'cart')}
      aria-label={label(count)}
      class={cn('relative flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800', className)}
    >
      <ShoppingCart class="size-5" strokeWidth={2.2} />
      <Count count={count} className="-top-1 -right-1" />
    </button>
  );
}

/** Cart tab in the phone tab bar. */
export function TabCart() {
  const count = countOf(useCart());
  return (
    <button type="button" onClick={() => (panel.value = 'cart')} aria-label={label(count)} class="relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-zinc-500">
      <span class="relative">
        <ShoppingCart class="size-[22px]" strokeWidth={1.8} />
        <Count count={count} className="-top-2 -right-3" />
      </span>
      Cart
    </button>
  );
}
