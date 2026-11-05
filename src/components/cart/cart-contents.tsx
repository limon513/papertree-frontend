'use client';

import Link from 'next/link';
import { Info, MapPin, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { cart, useCart } from '@/lib/cart';
import type { CartCheck } from '@/lib/types';
import { ui } from '@/lib/ui';
import { cn, imageAt, links, money } from '@/lib/utils';

/** The lines of the cart with − / + and remove. */
export function CartLines({ onNavigate }: { onNavigate?: () => void }) {
  const { items } = useCart();
  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((item) => {
        const atMax = item.maxQuantity !== null && item.quantity >= item.maxQuantity;
        return (
          <li key={item.variantId} className="flex gap-3 py-3">
            <Link href={links.product(item.slug)} onClick={onNavigate} className="size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
              {item.image && <img src={imageAt(item.image, 160)} alt="" className="size-full object-contain p-1" />}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={links.product(item.slug)} onClick={onNavigate} className="line-clamp-2 text-sm leading-5 text-zinc-800 hover:text-brand-700">
                {item.name}
              </Link>
              {item.variantLabel && <div className="text-xs text-zinc-500">{item.variantLabel}</div>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex h-8 items-center rounded-full ring-1 ring-zinc-300">
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)}
                    className="flex size-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
                    aria-label={`One less ${item.name}`}
                  >
                    {item.quantity === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                  </button>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)}
                    disabled={atMax}
                    className="flex size-8 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                    aria-label={`One more ${item.name}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{money(item.price * item.quantity)}</div>
                  {item.regularPrice && (
                    <div className="text-xs text-zinc-400 tabular-nums line-through">{money(item.regularPrice * item.quantity)}</div>
                  )}
                </div>
              </div>
              {atMax && <div className="mt-1 text-xs text-marigold-700">That is all we have.</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Free delivery progress, or a nudge to choose the area. */
export function DeliveryProgress({ check }: { check: CartCheck | null }) {
  const { deliverTo, subtotal } = useCart();
  if (!deliverTo) {
    return (
      <button
        type="button"
        onClick={() => ui.open('deliver-to')}
        className="flex w-full items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-left text-sm text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100"
      >
        <MapPin className="size-4 shrink-0 text-brand-600" />
        <span className="flex-1">Choose your area to see the delivery charge</span>
        <span className="font-semibold text-brand-700">Choose</span>
      </button>
    );
  }
  const d = check?.delivery;
  if (!d) return <div className="h-14 animate-pulse rounded-xl bg-zinc-100" />;
  if (d.fee === null) {
    return <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">We will call you about delivery to {deliverTo.label}.</p>;
  }
  const done = d.freeAbove !== null && d.toFree === null;
  const progress = d.freeAbove ? Math.min(100, (subtotal / d.freeAbove) * 100) : 0;
  return (
    <div className={cn('rounded-xl px-3 py-2.5 text-sm', done ? 'bg-brand-50 text-brand-800' : 'bg-zinc-50 text-zinc-700')}>
      <div className="flex items-center gap-2">
        <Truck className="size-4 shrink-0" />
        <span className="flex-1">
          {done ? (
            <strong>Free delivery to {deliverTo.label}!</strong>
          ) : d.toFree !== null ? (
            <>
              Add <strong className="tabular-nums">{money(d.toFree)}</strong> more for <strong>free delivery</strong>
            </>
          ) : (
            <>
              Delivery to {deliverTo.label}: <strong className="tabular-nums">{money(d.fee)}</strong>
            </>
          )}
        </span>
        <button type="button" onClick={() => ui.open('deliver-to')} className="text-xs font-medium underline underline-offset-2">
          Change
        </button>
      </div>
      {d.freeAbove !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}
      {d.deliveryTime && <div className="mt-1 text-xs opacity-80">Arrives in {d.deliveryTime}</div>}
    </div>
  );
}

export function CartNotes({ notes, onClose }: { notes: string[]; onClose: () => void }) {
  if (!notes.length) return null;
  return (
    <div className="flex gap-2 rounded-xl bg-marigold-50 px-3 py-2.5 text-sm text-marigold-700 ring-1 ring-marigold-200">
      <Info className="mt-0.5 size-4 shrink-0" />
      <ul className="flex-1 space-y-0.5">
        {notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="self-start text-xs font-medium underline">
        OK
      </button>
    </div>
  );
}

export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <ShoppingBag className="size-7" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">Your cart is empty</p>
      <p className="mt-1 text-sm text-zinc-500">Tap “Add” on any product and it lands here.</p>
      <Link href="/" onClick={onBrowse} className="mt-5 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
        Start shopping
      </Link>
    </div>
  );
}
