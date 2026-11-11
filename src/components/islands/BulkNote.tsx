import type { CartCheck, CartCheckLine } from '@/lib/types';
import { cn, money } from '@/lib/utils';

/**
 * Bulk discounts in the cart and at checkout (buy more, pay less per piece). The shop works them out;
 * these only show its answer, and only when it is for the quantity shown now.
 */
export const lineOf = (check: CartCheck | null | undefined, variantId: number) => check?.lines.find((l) => l.variantId === variantId);

const current = (line: CartCheckLine | undefined, quantity: number) => (line?.bulk && line.quantity === quantity ? line : null);

/** The line's price: after a bulk discount (the full price struck through), else price × quantity. */
export function LineMoney({ price, quantity, line, className }: { price: number; quantity: number; line: CartCheckLine | undefined; className?: string }) {
  const full = Math.round(price * quantity * 100) / 100;
  const l = current(line, quantity);
  if (l && l.bulk!.percent > 0 && l.lineTotal !== undefined) {
    return (
      <span class={cn('text-right tabular-nums', className)}>
        <s class="mr-1 text-xs font-normal text-zinc-400">{money(full)}</s>
        {money(l.lineTotal)}
      </span>
    );
  }
  return <span class={cn('tabular-nums', className)}>{money(full)}</span>;
}

/** "Bulk discount 5% applied" and "Add 3 more for 10% off". */
export function BulkNote({ line, quantity, className }: { line: CartCheckLine | undefined; quantity: number; className?: string }) {
  const l = current(line, quantity);
  if (!l) return null;
  const { percent, next } = l.bulk!;
  if (!percent && !next) return null;
  return (
    <p class={cn('text-xs', className)}>
      {percent > 0 && <span class="font-semibold text-brand-700">{percent}% bulk discount applied</span>}
      {percent > 0 && next && <span class="text-zinc-400"> · </span>}
      {next && (
        <span class="text-marigold-700">
          Add {next.more} more for {next.percent}% off
        </span>
      )}
    </p>
  );
}
