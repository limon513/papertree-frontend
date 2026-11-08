import { useEffect, useState } from 'preact/hooks';
import { ArrowRight, Info, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck, Wallet, X } from 'lucide-preact';
import { cart, panel, selectedOf, subtotalOf, useCart } from '@/lib/cart';
import { useCartCheck } from '@/lib/cart-check';
import { cn, imageAt, links, money } from '@/lib/utils';

/**
 * The cart page: everything in the cart, checked against today's prices and stock, the delivery
 * charge for the shopper's area, and the way to checkout. The cart lives in the browser, so the
 * page is drawn here once it has loaded.
 */
export default function CartView() {
  const s = useCart();
  const [ready, setReady] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => setReady(true), []);
  // Only the ticked items are priced for checkout (their delivery charge and total).
  const picked = selectedOf(s);
  const { check, notes, dismissNotes, checking } = useCartCheck(ready, { only: picked.map((i) => i.variantId) });

  if (!ready) {
    return (
      <div class="mt-6 space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} class="h-24 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  const { items, deliverTo } = s;
  if (!items.length) {
    return (
      <div class="mt-6 flex flex-col items-center rounded-3xl bg-zinc-50 px-6 py-14 text-center">
        <span class="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <ShoppingBag class="size-7" />
        </span>
        <p class="mt-4 font-display text-xl font-bold">Your cart is empty</p>
        {notes.length > 0 ? (
          <ul class="mt-2 max-w-md space-y-1 text-sm text-zinc-600">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <p class="mt-1 text-sm text-zinc-500">Tap “Add” on any product and it lands here.</p>
        )}
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <a href="/deals/" class="flex h-11 items-center gap-2 rounded-full bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
            Today’s deals <ArrowRight class="size-4" />
          </a>
          <a href="/categories/" class="flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300">
            Browse categories
          </a>
        </div>
      </div>
    );
  }

  const pickedCount = picked.reduce((n, i) => n + i.quantity, 0);
  const allPicked = picked.length === items.length;
  const subtotal = picked.length ? (check?.subtotal ?? subtotalOf({ ...s, items: picked })) : 0;
  const savings = picked.reduce((sum, i) => sum + (i.regularPrice && i.regularPrice > i.price ? (i.regularPrice - i.price) * i.quantity : 0), 0);
  const d = picked.length ? (check?.delivery ?? null) : null;
  const fee = deliverTo && d ? d.fee : null;
  const total = subtotal + (fee ?? 0);
  const progress = d?.freeAbove ? Math.min(100, Math.round((subtotal / d.freeAbove) * 100)) : null;

  return (
    <div class="mt-5 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <div>
        {notes.length > 0 && (
          <div class="mb-4 flex gap-3 rounded-2xl bg-marigold-50 p-4 text-sm text-zinc-700 ring-1 ring-marigold-200" role="status">
            <Info class="mt-0.5 size-4 shrink-0 text-marigold-700" />
            <ul class="flex-1 space-y-1">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <button type="button" onClick={dismissNotes} aria-label="Hide these notes" class="self-start rounded-full p-1 text-zinc-500 hover:bg-marigold-100">
              <X class="size-4" />
            </button>
          </div>
        )}

        <div class="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
        {/* Choose what to order now; the rest stays in the cart. */}
        <label class="flex cursor-pointer items-center gap-3 border-b border-zinc-100 bg-zinc-50/70 px-3 py-2.5 text-sm font-medium text-zinc-800 sm:px-4">
          <input type="checkbox" checked={allPicked} onChange={() => cart.selectAll(!allPicked)} class="size-5 accent-brand-700" />
          <span class="flex-1">Select all ({items.length})</span>
          {!allPicked && <span class="text-xs font-normal text-zinc-500">{picked.length} chosen</span>}
        </label>
        <ul class="divide-y divide-zinc-100">
          {items.map((item) => {
            const atMax = item.maxQuantity !== null && item.quantity >= item.maxQuantity;
            const was = item.regularPrice && item.regularPrice > item.price ? item.regularPrice : null;
            const chosen = !s.skip.includes(item.variantId);
            return (
              <li key={item.variantId} class={cn('flex gap-3 p-3 sm:gap-4 sm:p-4', !chosen && 'bg-zinc-50/60')}>
                <input
                  type="checkbox"
                  checked={chosen}
                  onChange={() => cart.select(item.variantId, !chosen)}
                  aria-label={`Order ${item.name} now`}
                  class="mt-8 size-5 shrink-0 accent-brand-700 sm:mt-10"
                />
                <a href={links.product(item.slug)} class="size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-50 sm:size-24">
                  {item.image && <img src={imageAt(item.image, 160)} alt="" width="96" height="96" class="size-full object-contain p-1.5" />}
                </a>
                <div class="flex min-w-0 flex-1 flex-col">
                  <div class="flex gap-2">
                    <div class="min-w-0 flex-1">
                      <a href={links.product(item.slug)} class="line-clamp-2 text-sm leading-5 font-medium text-zinc-900 hover:text-brand-700 sm:text-[15px]">
                        {item.name}
                      </a>
                      {item.variantLabel && <p class="mt-0.5 text-xs text-zinc-500">{item.variantLabel}</p>}
                      <p class="mt-1 text-sm text-zinc-600 tabular-nums">
                        {money(item.price)}
                        {was && <span class="ml-1.5 text-xs text-zinc-400 line-through">{money(was)}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.setQuantity(item.variantId, 0)}
                      aria-label={`Remove ${item.name}`}
                      class="flex size-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                  <div class="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div class="flex h-9 items-center rounded-full ring-1 ring-zinc-300">
                      <button type="button" onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)} class="flex size-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100" aria-label={`One less ${item.name}`}>
                        {item.quantity === 1 ? <Trash2 class="size-3.5" /> : <Minus class="size-3.5" />}
                      </button>
                      <span class="w-8 text-center text-sm font-semibold tabular-nums" aria-label={`Quantity ${item.quantity}`}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)}
                        disabled={atMax}
                        class="flex size-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
                        aria-label={`One more ${item.name}`}
                      >
                        <Plus class="size-3.5" />
                      </button>
                    </div>
                    {atMax && <span class="text-xs text-marigold-700">Only {item.maxQuantity} available</span>}
                    <span class="font-semibold text-zinc-900 tabular-nums">{money(item.price * item.quantity)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        </div>

        <div class="mt-3 flex items-center justify-between px-1 text-sm">
          <a href="/" class="font-medium text-brand-700 hover:underline">← Continue shopping</a>
          {confirmClear ? (
            <span class="flex items-center gap-2">
              <span class="text-zinc-600">Empty the cart?</span>
              <button type="button" onClick={() => (cart.clear(), setConfirmClear(false))} class="font-semibold text-red-600 hover:underline">
                Yes, empty it
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} class="text-zinc-500 hover:underline">
                No
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} class="text-zinc-500 hover:text-zinc-800 hover:underline">
              Empty cart
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <aside class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 lg:sticky lg:top-36" aria-label="Order summary">
        <button
          type="button"
          onClick={() => (panel.value = 'deliver-to')}
          class="flex w-full items-center gap-2.5 rounded-xl bg-zinc-50 px-3 py-2.5 text-left text-sm ring-1 ring-zinc-200 hover:ring-zinc-300"
        >
          <MapPin class="size-4 shrink-0 text-brand-600" />
          <span class="min-w-0 flex-1">
            {deliverTo ? (
              <>
                <span class="block text-xs text-zinc-500">Deliver to</span>
                <span class="block truncate font-medium text-zinc-900">{deliverTo.label}</span>
              </>
            ) : (
              <span class="font-medium text-zinc-900">Choose your area for the delivery charge</span>
            )}
          </span>
          <span class="text-xs font-semibold text-brand-700">{deliverTo ? 'Change' : 'Choose'}</span>
        </button>

        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-zinc-600">
              Items ({pickedCount})
            </dt>
            <dd class="font-medium tabular-nums">{money(subtotal)}</dd>
          </div>
          {savings > 0 && (
            <div class="flex justify-between text-brand-700">
              <dt>You save</dt>
              <dd class="font-medium tabular-nums">{money(savings)}</dd>
            </div>
          )}
          <div class="flex justify-between">
            <dt class="text-zinc-600">
              Delivery{d?.deliveryTime && deliverTo ? <span class="text-zinc-400"> · {d.deliveryTime}</span> : null}
            </dt>
            <dd class="font-medium tabular-nums">{!deliverTo ? <span class="text-zinc-400">Choose area</span> : fee === null ? <span class="text-zinc-400">…</span> : fee === 0 ? <span class="text-brand-700">Free</span> : money(fee)}</dd>
          </div>
        </dl>

        {deliverTo && progress !== null && d && (
          <div class="mt-3 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-900">
            <p class="flex items-center gap-2">
              <Truck class="size-4 shrink-0" />
              {d.toFree ? (
                <span>
                  Add <strong>{money(d.toFree)}</strong> more for <strong>free delivery</strong>
                </span>
              ) : (
                <strong>You get free delivery!</strong>
              )}
            </p>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Towards free delivery">
              <div class="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div class="mt-4 flex items-baseline justify-between border-t border-zinc-100 pt-4">
          <span class="font-semibold text-zinc-900">Total</span>
          <span class="text-2xl font-bold text-zinc-900 tabular-nums" aria-live="polite">
            {money(total)}
          </span>
        </div>
        {!deliverTo && <p class="mt-1 text-right text-xs text-zinc-500">plus delivery</p>}

        {/* Checkout: pinned to the bottom of the screen on phones. */}
        <div data-buy-bar class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          {picked.length ? (
            <a
              href="/checkout/"
              class="flex h-12 items-center justify-between gap-3 rounded-full bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800 md:justify-center"
            >
              <span>Checkout{allPicked ? '' : ` (${pickedCount})`}</span>
              <span class="tabular-nums md:hidden">{money(total)}</span>
              <ArrowRight class="hidden size-5 md:block" />
            </a>
          ) : (
            <span class="flex h-12 items-center justify-center rounded-full bg-zinc-200 px-5 text-sm font-semibold text-zinc-500">Tick the items to order</span>
          )}
        </div>
        {checking && <p class="sr-only">Checking prices and stock</p>}

        <ul class="mt-4 space-y-2 text-sm text-zinc-600">
          <li class="flex items-center gap-2.5"><Wallet class="size-4 shrink-0 text-brand-600" /> Cash on delivery, bKash, Nagad or card</li>
          <li class="flex items-center gap-2.5"><ShieldCheck class="size-4 shrink-0 text-brand-600" /> Original products, checked before packing</li>
        </ul>
      </aside>
    </div>
  );
}
