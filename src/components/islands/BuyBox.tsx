import { useEffect, useState } from 'preact/hooks';
import { Check, MapPin, Minus, Plus, ShoppingBag, Truck } from 'lucide-preact';
import { cart, panel, useCart, type CartItem } from '@/lib/cart';
import type { CartCheck, Img } from '@/lib/types';
import { API_PUBLIC_URL, cn, money, percentOff } from '@/lib/utils';

export interface BuyVariant {
  id: number;
  values: (string | null)[];
  price: number;
  regularPrice: number | null;
  saleEndsAt: string | null;
  inStock: boolean;
  /** How many can be ordered (null = no limit). */
  maxQuantity: number | null;
  lowStock: number | null;
  /** Its own picture's place in the gallery (-1: none). */
  picture: number;
  /** Small picture for the cart. */
  thumb: Img | null;
}

interface Props {
  productId: number;
  slug: string;
  name: string;
  options: { name: string; values: string[] }[];
  variants: BuyVariant[];
  /** The variant shown first (from ?variant=, else the first in stock). */
  startId: number;
}

const sameValues = (a: (string | null)[], b: (string | null)[]) => a.every((x, i) => x === b[i]);

/**
 * The buy box of a product page: options, price, stock, quantity, Add to cart and Buy now, and the
 * delivery charge for the shopper's area. The chosen option goes into the address (?variant=),
 * so a shared link opens on it.
 */
export default function BuyBox({ productId, slug, name, options, variants, startId }: Props) {
  const s = useCart();
  const start = variants.find((v) => v.id === startId) ?? variants[0]!;
  const [values, setValues] = useState(start.values);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [quote, setQuote] = useState<CartCheck['delivery'] | null>(null);

  const variant = variants.find((v) => sameValues(v.values, values)) ?? null;
  const inCart = variant ? (s.items.find((i) => i.variantId === variant.id)?.quantity ?? 0) : 0;
  const room = variant?.maxQuantity == null ? null : Math.max(0, variant.maxQuantity - inCart);
  const canAdd = !!variant && variant.inStock && (room === null || room > 0);
  const amount = room === null ? quantity : Math.min(quantity, room);

  const choose = (optionIndex: number, value: string) => {
    const next = [...values];
    next[optionIndex] = value;
    // Keep the other choices if that combination exists; else the first (in stock) with this value.
    const picked =
      variants.find((v) => sameValues(v.values, next)) ??
      variants.find((v) => v.values[optionIndex] === value && v.inStock) ??
      variants.find((v) => v.values[optionIndex] === value);
    setValues(picked ? picked.values : next);
    setQuantity(1);
    if (picked) {
      if (picked.picture >= 0) document.dispatchEvent(new CustomEvent('pt:picture', { detail: picked.picture }));
      history.replaceState(history.state, '', `?variant=${picked.id}`);
    }
  };

  /** In stock with the other options as they are chosen now. */
  const available = (optionIndex: number, value: string) =>
    variants.some((v) => v.inStock && v.values[optionIndex] === value && v.values.every((x, i) => i === optionIndex || x === values[i]));

  const add = () => {
    if (!variant || !canAdd) return false;
    const item: Omit<CartItem, 'quantity'> = {
      variantId: variant.id,
      productId,
      slug,
      name,
      variantLabel: variant.values.filter(Boolean).join(' / ') || null,
      image: variant.thumb,
      price: variant.price,
      regularPrice: variant.regularPrice,
      maxQuantity: variant.maxQuantity,
    };
    cart.add(item, amount);
    setQuantity(1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    return true;
  };
  // Buy now: straight to the cart with this in it (checkout comes next).
  const buyNow = () => {
    if (inCart > 0 && !canAdd) return void (panel.value = 'cart');
    if (add()) panel.value = 'cart';
  };

  // Delivery charge for the shopper's area: the cart plus what is chosen here.
  const deliverTo = s.deliverTo;
  const quoteKey = JSON.stringify([deliverTo?.districtId, deliverTo?.areaId, variant?.id, quantity, s.items.map((i) => [i.variantId, i.quantity])]);
  useEffect(() => {
    if (!deliverTo || !variant) return setQuote(null);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const items = s.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
      const mine = items.find((i) => i.variantId === variant.id);
      if (mine) mine.quantity += quantity;
      else items.push({ variantId: variant.id, quantity });
      try {
        const res = await fetch(`${API_PUBLIC_URL}/v1/store/cart`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items, districtId: deliverTo.districtId, areaId: deliverTo.areaId }),
          signal: controller.signal,
        });
        if (res.ok) setQuote(((await res.json()) as CartCheck).delivery);
      } catch {
        // Offline: no charge shown.
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteKey]);

  const off = variant ? percentOff(variant.price, variant.regularPrice) : 0;

  return (
    <div>
      {/* Price */}
      {variant ? (
        <div class="mt-3 flex flex-wrap items-baseline gap-x-2.5">
          <span class="text-3xl font-bold text-zinc-900 tabular-nums">{money(variant.price)}</span>
          {off > 0 && (
            <>
              <span class="text-base text-zinc-400 tabular-nums line-through">{money(variant.regularPrice!)}</span>
              <span class="rounded-md bg-marigold-300 px-1.5 py-0.5 text-xs font-bold text-zinc-900">Save {off}%</span>
            </>
          )}
        </div>
      ) : (
        <p class="mt-3 text-zinc-500">This combination is not sold.</p>
      )}
      {variant?.saleEndsAt && off > 0 && (
        <p class="mt-1 text-sm text-marigold-700">Sale ends {new Date(variant.saleEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
      )}

      {/* Options */}
      {options.map((option, oi) => (
        <fieldset key={option.name} class="mt-5">
          <legend class="text-sm font-medium text-zinc-800">
            {option.name}: <span class="font-normal text-zinc-600">{values[oi]}</span>
          </legend>
          <div class="mt-2 flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = values[oi] === value;
              const can = available(oi, value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(oi, value)}
                  aria-pressed={selected}
                  aria-label={can ? value : `${value} (out of stock)`}
                  class={cn(
                    'min-w-12 rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
                    selected ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-zinc-800 ring-zinc-300 hover:ring-zinc-500',
                    !can && !selected && 'text-zinc-400 line-through decoration-zinc-300',
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Stock */}
      <p class="mt-5 text-sm" aria-live="polite">
        {!variant ? null : !variant.inStock ? (
          <span class="font-medium text-red-700">Out of stock</span>
        ) : variant.lowStock ? (
          <span class="font-medium text-marigold-700">Only {variant.lowStock} left, order soon</span>
        ) : (
          <span class="flex items-center gap-1.5 font-medium text-brand-700">
            <Check class="size-4" /> In stock
          </span>
        )}
      </p>

      {/* Quantity and buttons: pinned to the bottom of the screen on phones. */}
      <div data-buy-bar class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
        <div class="flex gap-2">
          <div class="flex h-12 shrink-0 items-center rounded-full bg-white ring-1 ring-zinc-300">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} class="flex size-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" aria-label="One less">
              <Minus class="size-4" />
            </button>
            <span class="w-7 text-center font-semibold tabular-nums" aria-live="polite" aria-label={`Quantity ${quantity}`}>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => (room !== null ? Math.min(Math.max(1, room), q + 1) : q + 1))}
              disabled={!canAdd || (room !== null && quantity >= room)}
              class="flex size-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
              aria-label="One more"
            >
              <Plus class="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            class={cn(
              'flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition sm:text-base',
              added ? 'bg-brand-100 text-brand-800' : 'bg-white text-brand-800 ring-2 ring-brand-700 hover:bg-brand-50',
              'disabled:bg-zinc-100 disabled:text-zinc-400 disabled:ring-0',
            )}
          >
            {added ? (
              <>
                <Check class="size-5" /> Added
              </>
            ) : !variant?.inStock ? (
              'Out of stock'
            ) : room === 0 ? (
              'All in cart'
            ) : (
              <>
                <ShoppingBag class="size-4" /> Add to cart
              </>
            )}
          </button>
          {variant?.inStock && (
            <button type="button" onClick={buyNow} class="flex h-12 flex-1 items-center justify-center rounded-full bg-brand-700 px-3 text-sm font-semibold text-white hover:bg-brand-800 sm:text-base">
              Buy now{canAdd ? ` · ${money(variant.price * amount)}` : ''}
            </button>
          )}
        </div>
      </div>
      {inCart > 0 && (
        <button type="button" onClick={() => (panel.value = 'cart')} class="mt-2 text-sm text-brand-700 underline underline-offset-2">
          {inCart} in your cart, view cart
        </button>
      )}

      {/* Delivery */}
      <div class="mt-5 flex items-start gap-2.5 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
        <Truck class="mt-0.5 size-4 shrink-0 text-brand-600" />
        <div class="flex-1">
          {!deliverTo ? (
            <>Delivery to all 64 districts. Cash on delivery.</>
          ) : !quote ? (
            <>Delivery to <strong>{deliverTo.label}</strong>…</>
          ) : (
            <>
              Delivery to <strong>{deliverTo.label}</strong>: <strong>{quote.fee === 0 ? 'free' : money(quote.fee ?? 0)}</strong>
              {quote.deliveryTime && <span class="text-zinc-500"> · {quote.deliveryTime}</span>}
              {quote.toFree !== null && quote.toFree > 0 && (
                <span class="mt-0.5 block text-zinc-500">
                  Add {money(quote.toFree)} more for free delivery
                </span>
              )}
            </>
          )}
        </div>
        <button type="button" onClick={() => (panel.value = 'deliver-to')} class="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700">
          <MapPin class="size-3.5" /> {deliverTo ? 'Change' : 'Your area'}
        </button>
      </div>
    </div>
  );
}
