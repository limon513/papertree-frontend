'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { ui, usePanel } from '@/lib/ui';
import { money } from '@/lib/utils';
import { CartLines, CartNotes, DeliveryProgress, EmptyCart } from './cart-contents';
import { useCartCheck } from './use-cart-check';

/** The cart panel: slides in from the right (computers) or up (phones). */
export function CartDrawer() {
  const open = usePanel() === 'cart';
  const { items, count, subtotal } = useCart();
  const { check, notes, clearNotes } = useCartCheck(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  const fee = check?.delivery?.fee ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/40 animate-fade-in" onClick={ui.close}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-slide-up flex-col rounded-t-3xl bg-white sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:animate-slide-left sm:rounded-none"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="font-display text-lg font-semibold">
            Your cart {count > 0 && <span className="text-zinc-500">({count})</span>}
          </h2>
          <button type="button" onClick={ui.close} aria-label="Close cart" className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X className="size-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyCart onBrowse={ui.close} />
        ) : (
          <>
            <div className="space-y-3 px-5 pt-3">
              <CartNotes notes={notes} onClose={clearNotes} />
              <DeliveryProgress check={check} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              <CartLines onNavigate={ui.close} />
            </div>
            <div className="border-t border-zinc-100 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-600">Subtotal</dt>
                  <dd className="font-medium tabular-nums">{money(subtotal)}</dd>
                </div>
                {fee !== null && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-600">Delivery</dt>
                    <dd className="font-medium tabular-nums">{fee === 0 ? 'Free' : money(fee)}</dd>
                  </div>
                )}
              </dl>
              <Link
                href="/cart/"
                onClick={ui.close}
                className="mt-3 flex h-12 items-center justify-between rounded-full bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800"
              >
                <span>Checkout</span>
                <span className="tabular-nums">{money(subtotal + (fee ?? 0))}</span>
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
