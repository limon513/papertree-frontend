import { useEffect, useState } from 'preact/hooks';
import { Check, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-preact';
import { BulkNote, LineMoney, lineOf } from './BulkNote';
import { couponOf } from './CouponBox';
import { cart, countOf, lastAdded, panel, selectedOf, subtotalOf, useCart } from '@/lib/cart';
import { useCartCheck } from '@/lib/cart-check';
import { cn, imageAt, links, money } from '@/lib/utils';

/** The cart panel: right side on computers, bottom sheet on phones. Checks prices and stock with the API. */
export function CartDrawer() {
  const open = panel.value === 'cart';
  const s = useCart();
  const { items, deliverTo } = s;
  // On the cart page the page itself checks the cart.
  const onCartPage = typeof location !== 'undefined' && location.pathname.startsWith('/cart');
  // Like the cart page: only the ticked items are ordered and counted in the total.
  const picked = selectedOf(s);
  const allPicked = picked.length === items.length;
  const { check, notes } = useCartCheck(open && !onCartPage, { only: picked.map((i) => i.variantId) });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (panel.value = null);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  const close = () => (panel.value = null);
  const d = picked.length ? check?.delivery : null;
  const fee = d?.fee ?? null;
  const pickedCount = picked.reduce((n, i) => n + i.quantity, 0);
  const subtotal = check?.subtotal ?? subtotalOf({ ...s, items: picked });
  const cp = couponOf(check, s.coupon);

  return (
    <div class="fixed inset-0 z-50 animate-fade-in bg-zinc-950/40" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="Cart" onClick={(e) => e.stopPropagation()} class="absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-slide-up flex-col rounded-t-3xl bg-white sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:animate-slide-left sm:rounded-none">
        <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 class="font-display text-lg font-semibold">Your cart {countOf(s) > 0 && <span class="text-zinc-500">({countOf(s)})</span>}</h2>
          <button type="button" onClick={close} aria-label="Close cart" class="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X class="size-5" />
          </button>
        </div>
        {items.length === 0 ? (
          <div class="flex flex-col items-center px-6 py-16 text-center">
            <span class="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <ShoppingBag class="size-7" />
            </span>
            <p class="mt-4 font-display text-lg font-semibold">Your cart is empty</p>
            <p class="mt-1 text-sm text-zinc-500">Tap “Add” on any product and it lands here.</p>
          </div>
        ) : (
          <>
            <div class="px-5 pt-3">
              {deliverTo ? (
                d ? (
                  <div class="rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
                    <div class="flex items-center gap-2">
                      <Truck class="size-4 shrink-0" />
                      <span class="flex-1">
                        {d.freeAbove !== null && d.toFree === null ? (
                          <strong>Free delivery to {deliverTo.label}!</strong>
                        ) : d.toFree !== null ? (
                          <>Add <strong>{money(d.toFree)}</strong> more for <strong>free delivery</strong></>
                        ) : (
                          <>Delivery to {deliverTo.label}: <strong>{money(d.fee ?? 0)}</strong></>
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div class="h-11 animate-pulse rounded-xl bg-zinc-100" />
                )
              ) : (
                <button type="button" onClick={() => (panel.value = 'deliver-to')} class="w-full rounded-xl bg-zinc-50 px-3 py-2.5 text-left text-sm text-zinc-700 ring-1 ring-zinc-200">
                  Choose your area to see the delivery charge
                </button>
              )}
            </div>
            {notes.length > 0 && (
              <ul class="mx-5 mt-3 space-y-1 rounded-xl bg-marigold-50 px-3 py-2 text-xs text-zinc-700 ring-1 ring-marigold-200" role="status">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            {/* Choose what to order now; the rest stays in the cart. */}
            <label class="mx-5 mt-3 flex cursor-pointer items-center gap-3 border-b border-zinc-100 pb-2.5 text-sm font-medium text-zinc-800">
              <input type="checkbox" checked={allPicked} onChange={() => cart.selectAll(!allPicked)} class="size-5 accent-brand-700" />
              <span class="flex-1">Select all ({items.length})</span>
              {!allPicked && <span class="text-xs font-normal text-zinc-500">{picked.length} chosen</span>}
            </label>
            <ul class="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.variantId} class={cn('flex gap-3 py-3', s.skip.includes(item.variantId) && 'opacity-60')}>
                  <input
                    type="checkbox"
                    checked={!s.skip.includes(item.variantId)}
                    onChange={() => cart.select(item.variantId, s.skip.includes(item.variantId))}
                    aria-label={`Order ${item.name} now`}
                    class="mt-5 size-5 shrink-0 accent-brand-700"
                  />
                  <a href={links.product(item.slug)} class="size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                    {item.image && <img src={imageAt(item.image, 160)} alt="" class="size-full object-contain p-1" />}
                  </a>
                  <div class="min-w-0 flex-1">
                    <a href={links.product(item.slug)} class="line-clamp-2 text-sm leading-5 text-zinc-800">{item.name}</a>
                    {item.variantLabel && <p class="text-xs text-zinc-500">{item.variantLabel}</p>}
                    <div class="mt-2 flex items-center justify-between">
                      <div class="flex h-8 items-center rounded-full ring-1 ring-zinc-300">
                        <button type="button" onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)} class="flex size-8 items-center justify-center rounded-full text-zinc-600" aria-label={`One less ${item.name}`}>
                          {item.quantity === 1 ? <Trash2 class="size-3.5" /> : <Minus class="size-3.5" />}
                        </button>
                        <span class="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)}
                          disabled={item.maxQuantity !== null && item.quantity >= item.maxQuantity}
                          class="flex size-8 items-center justify-center rounded-full text-zinc-600 disabled:opacity-30"
                          aria-label={`One more ${item.name}`}
                        >
                          <Plus class="size-3.5" />
                        </button>
                      </div>
                      <LineMoney price={item.price} quantity={item.quantity} line={lineOf(check, item.variantId)} className="text-sm font-semibold" />
                    </div>
                    <BulkNote line={lineOf(check, item.variantId)} quantity={item.quantity} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
            <div class="border-t border-zinc-100 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {picked.length > 0 && cp.ok && cp.itemsOff + cp.deliveryOff > 0 && (
                <p class="mb-2 text-center text-sm font-medium text-brand-700">
                  Coupon <span class="font-mono">{s.coupon}</span> takes off {money(cp.itemsOff + cp.deliveryOff)}
                </p>
              )}
              {picked.length > 0 && (check?.bulkSavings ?? 0) > 0 && (
                <p class="mb-2 text-center text-sm font-medium text-brand-700">Bulk discount saves you {money(check!.bulkSavings!)}</p>
              )}
              {picked.length ? (
                <a href="/checkout/" class="flex h-12 items-center justify-between rounded-full bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800">
                  <span>Checkout{allPicked ? '' : ` (${pickedCount})`}</span>
                  <span class="tabular-nums">{money(subtotal - cp.itemsOff + Math.max(0, (fee ?? 0) - cp.deliveryOff))}</span>
                </a>
              ) : (
                <span class="flex h-12 items-center justify-center rounded-full bg-zinc-200 px-5 text-sm font-semibold text-zinc-500">Tick the items to order</span>
              )}
              <a href="/cart/" class="mt-2 block text-center text-sm font-medium text-brand-700 hover:underline">
                View cart
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** "Added" bar after each add. */
export function AddedNotice() {
  const s = useCart();
  const added = lastAdded.value;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!added) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, [added?.at]);
  if (!added || !visible) return null;
  const count = countOf(s);
  return (
    <div class="added-notice pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-6 lg:justify-end lg:px-6">
      <div role="status" class="pointer-events-auto flex w-full max-w-md animate-slide-up items-center gap-3 rounded-2xl bg-zinc-900 p-2 text-white shadow-xl">
        <span class="relative size-10 shrink-0 overflow-hidden rounded-lg bg-white">
          {added.item.image && <img src={imageAt(added.item.image, 160)} alt="" class="size-full object-contain" />}
          <span class="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-brand-500">
            <Check class="size-3" strokeWidth={3} />
          </span>
        </span>
        <span class="min-w-0 flex-1 text-sm">
          <span class="block truncate text-zinc-300">Added {added.item.name}</span>
          <span class="font-semibold tabular-nums">
            {count} item{count === 1 ? '' : 's'} · {money(subtotalOf(s))}
          </span>
        </span>
        <button type="button" onClick={() => ((panel.value = 'cart'), setVisible(false))} class="h-10 shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white">
          View cart
        </button>
      </div>
    </div>
  );
}
