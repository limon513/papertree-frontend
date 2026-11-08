import { useEffect, useState } from 'preact/hooks';
import { Check, Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-preact';
import { cart, countOf, lastAdded, panel, subtotalOf, useCart } from '@/lib/cart';
import type { CartCheck } from '@/lib/types';
import { API_PUBLIC_URL, imageAt, links, money } from '@/lib/utils';

/** The cart panel: right side on computers, bottom sheet on phones. Checks prices and stock with the API. */
export function CartDrawer() {
  const open = panel.value === 'cart';
  const s = useCart();
  const { items, deliverTo } = s;
  const [check, setCheck] = useState<CartCheck | null>(null);
  const key = JSON.stringify([items.map((i) => [i.variantId, i.quantity]), deliverTo?.districtId, deliverTo?.areaId]);

  useEffect(() => {
    if (!open || !items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_PUBLIC_URL}/v1/store/cart`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), districtId: deliverTo?.districtId ?? null, areaId: deliverTo?.areaId ?? null }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const result = (await res.json()) as CartCheck;
        setCheck(result);
        const gone = result.lines.filter((l) => l.problem === 'gone').map((l) => l.variantId);
        const fresh = result.lines
          .filter((l) => l.problem !== 'gone')
          .map((l) => ({ variantId: l.variantId, price: l.price, quantity: l.quantity, maxQuantity: l.maxQuantity ?? null }));
        const differs = fresh.some((f) => {
          const i = items.find((x) => x.variantId === f.variantId);
          return !i || i.price !== f.price || i.quantity !== f.quantity || i.maxQuantity !== f.maxQuantity;
        });
        if (gone.length || differs) cart.update(fresh, gone);
      } catch {
        // Offline: show the saved cart.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, key]);

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
  const d = check?.delivery;
  const fee = d?.fee ?? null;

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
            <ul class="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.variantId} class="flex gap-3 py-3">
                  <a href={links.product(item.slug)} class="size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                    {item.image && <img src={imageAt(item.image, 160)} alt="" class="size-full object-contain p-1" />}
                  </a>
                  <div class="min-w-0 flex-1">
                    <a href={links.product(item.slug)} class="line-clamp-2 text-sm leading-5 text-zinc-800">{item.name}</a>
                    <div class="mt-2 flex items-center justify-between">
                      <div class="flex h-8 items-center rounded-full ring-1 ring-zinc-300">
                        <button type="button" onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)} class="flex size-8 items-center justify-center rounded-full text-zinc-600" aria-label={`One less ${item.name}`}>
                          {item.quantity === 1 ? <Trash2 class="size-3.5" /> : <Minus class="size-3.5" />}
                        </button>
                        <span class="w-7 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                        <button type="button" onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)} class="flex size-8 items-center justify-center rounded-full text-zinc-600" aria-label={`One more ${item.name}`}>
                          <Plus class="size-3.5" />
                        </button>
                      </div>
                      <span class="text-sm font-semibold tabular-nums">{money(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div class="border-t border-zinc-100 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <a href="/cart/" class="flex h-12 items-center justify-between rounded-full bg-brand-700 px-5 font-semibold text-white">
                <span>Checkout</span>
                <span class="tabular-nums">{money(subtotalOf(s) + (fee ?? 0))}</span>
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
