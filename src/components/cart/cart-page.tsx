'use client';

import { Lock } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/utils';
import { CartLines, CartNotes, DeliveryProgress, EmptyCart } from './cart-contents';
import { useCartCheck } from './use-cart-check';

/** The full cart page. Checkout itself comes in the next step. */
export function CartPage() {
  const { items, count, subtotal } = useCart();
  const { check, notes, clearNotes } = useCartCheck(true);
  const fee = check?.delivery?.fee ?? null;

  if (!items.length) return <EmptyCart />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Your cart <span className="text-zinc-400">({count})</span>
      </h1>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <CartNotes notes={notes} onClose={clearNotes} />
          <div className="rounded-3xl bg-white px-4 ring-1 ring-zinc-200">
            <CartLines />
          </div>
        </div>
        <aside className="space-y-3 lg:sticky lg:top-32 lg:self-start">
          <DeliveryProgress check={check} />
          <div className="rounded-3xl bg-zinc-50 p-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Subtotal</dt>
                <dd className="font-medium tabular-nums">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Delivery</dt>
                <dd className="font-medium tabular-nums">{fee === null ? 'Choose your area' : fee === 0 ? 'Free' : money(fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(subtotal + (fee ?? 0))}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-700 font-semibold text-white disabled:opacity-60"
            >
              <Lock className="size-4" /> Checkout — coming in the next step
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">Cash on delivery, bKash, Nagad and cards.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
