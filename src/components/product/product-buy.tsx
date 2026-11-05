'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ImageOff, MapPin, Minus, Plus, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { cart, useCart, useCartQuantity } from '@/lib/cart';
import type { Img, Product } from '@/lib/types';
import { ui } from '@/lib/ui';
import { cn, imageAt, links, money, srcSet } from '@/lib/utils';
import { Price } from './price';

/** Gallery and buy box of a product page: choose options, quantity, add to cart. */
export function ProductBuy({ product }: { product: Product }) {
  const { deliverTo } = useCart();
  const firstAvailable = product.variants.find((v) => v.inStock) ?? product.variants[0]!;
  const [values, setValues] = useState<(string | null)[]>(firstAvailable.values);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.values.every((x, i) => x === values[i])) ?? null;
  const inCart = useCartQuantity(variant?.id ?? null);

  // Pictures: the gallery, plus the chosen variant's own picture first.
  const pictures = useMemo(() => {
    const list: Img[] = [...product.images];
    for (const v of product.variants) if (v.image && !list.some((i) => i.urls['400'] === v.image!.urls['400'])) list.push(v.image);
    return list;
  }, [product]);
  const pictureOf = (image: Img | null | undefined) => (image ? pictures.findIndex((p) => p.urls['400'] === image.urls['400']) : -1);
  // Start on the chosen variant's own picture when it has one.
  const [shown, setShown] = useState(() => Math.max(0, pictureOf(firstAvailable.image)));

  const choose = (optionIndex: number, value: string) => {
    const next = [...values];
    next[optionIndex] = value;
    // Keep the other choices if that combination exists, otherwise take the first that matches this value.
    const exact = product.variants.find((v) => v.values.every((x, i) => x === next[i]));
    const fallback = product.variants.find((v) => v.values[optionIndex] === value && v.inStock) ?? product.variants.find((v) => v.values[optionIndex] === value);
    const picked = exact ?? fallback;
    setValues(picked ? picked.values : next);
    setQuantity(1);
    const pic = pictureOf(picked?.image);
    if (pic >= 0) setShown(pic);
  };

  const max = variant?.maxQuantity ?? null;
  const room = max === null ? null : Math.max(0, max - inCart);
  const canAdd = !!variant && variant.inStock && (room === null || room > 0);

  const add = () => {
    if (!variant || !canAdd) return;
    cart.add(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.values.filter(Boolean).join(' / ') || null,
        image: variant.image ?? product.images[0] ?? null,
        price: variant.price,
        regularPrice: variant.regularPrice,
        maxQuantity: max,
      },
      room === null ? quantity : Math.min(quantity, room),
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  /** In stock with the other options as they are chosen now. */
  const valueAvailable = (optionIndex: number, value: string) =>
    product.variants.some((v) => v.inStock && v.values[optionIndex] === value && v.values.every((x, i) => i === optionIndex || x === values[i]));

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-10">
      <Gallery pictures={pictures} shown={shown} onShow={setShown} name={product.name} />

      <div>
        {product.brand && (
          <Link href={links.brand(product.brand.slug)} className="text-xs font-semibold tracking-wide text-brand-700 uppercase hover:underline">
            {product.brand.name}
          </Link>
        )}
        <h1 className="mt-1 font-display text-2xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-3xl">{product.name}</h1>
        {variant && <Price price={variant.price} regularPrice={variant.regularPrice} size="lg" className="mt-3" />}
        {variant?.saleEndsAt && (
          <p className="mt-1 text-sm text-marigold-700">Sale ends {new Date(variant.saleEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</p>
        )}
        {product.shortDescription && <p className="mt-3 text-[15px] whitespace-pre-line text-zinc-600">{product.shortDescription}</p>}

        {product.options.map((option, oi) => (
          <div key={option.name} className="mt-5">
            <div className="text-sm font-medium text-zinc-800">
              {option.name}: <span className="font-normal text-zinc-600">{values[oi]}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const selected = values[oi] === value;
                const available = valueAvailable(oi, value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(oi, value)}
                    aria-pressed={selected}
                    className={cn(
                      'min-w-12 rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
                      selected ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-zinc-800 ring-zinc-300 hover:ring-zinc-500',
                      !available && !selected && 'text-zinc-400 line-through decoration-zinc-300',
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-5 text-sm">
          {!variant ? (
            <span className="text-zinc-500">This combination is not available.</span>
          ) : !variant.inStock ? (
            <span className="font-medium text-red-700">Out of stock</span>
          ) : variant.lowStock ? (
            <span className="font-medium text-marigold-700">Only {variant.lowStock} left — order soon</span>
          ) : (
            <span className="flex items-center gap-1.5 font-medium text-brand-700">
              <Check className="size-4" /> In stock
            </span>
          )}
        </div>

        {/* On phones the buy row stays at the bottom of the screen. */}
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <div className="flex h-12 items-center rounded-full ring-1 ring-zinc-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex size-12 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100"
              aria-label="One less"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => (room !== null ? Math.min(room, q + 1) : q + 1))}
              disabled={room !== null && quantity >= room}
              className="flex size-12 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 disabled:opacity-30"
              aria-label="One more"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className={cn(
              'flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-semibold text-white transition',
              added ? 'bg-brand-500' : 'bg-brand-700 hover:bg-brand-800',
              'disabled:bg-zinc-300',
            )}
          >
            {added ? (
              <>
                <Check className="size-5" /> Added
              </>
            ) : !variant?.inStock ? (
              'Out of stock'
            ) : room === 0 ? (
              'All in your cart'
            ) : (
              <>Add to cart{variant ? ` · ${money(variant.price * quantity)}` : ''}</>
            )}
          </button>
        </div>
        {inCart > 0 && (
          <button type="button" onClick={() => ui.open('cart')} className="mt-2 text-sm text-brand-700 underline underline-offset-2">
            {inCart} in your cart — view cart
          </button>
        )}

        <ul className="mt-6 space-y-2.5 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
          <li className="flex items-center gap-2.5">
            <Truck className="size-4 shrink-0 text-brand-600" />
            <span className="flex-1">
              {deliverTo ? (
                <>Delivery to <strong>{deliverTo.label}</strong> — the charge is shown in your cart</>
              ) : (
                <>Delivery to all 64 districts</>
              )}
            </span>
            <button type="button" onClick={() => ui.open('deliver-to')} className="flex items-center gap-1 text-xs font-medium text-brand-700">
              <MapPin className="size-3.5" /> {deliverTo ? 'Change' : 'Your area'}
            </button>
          </li>
          <li className="flex items-center gap-2.5">
            <Wallet className="size-4 shrink-0 text-brand-600" /> Cash on delivery available
          </li>
          <li className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 shrink-0 text-brand-600" /> Original products, checked before packing
          </li>
        </ul>
      </div>
    </div>
  );
}

function Gallery({ pictures, shown, onShow, name }: { pictures: Img[]; shown: number; onShow: (i: number) => void; name: string }) {
  const strip = useRef<HTMLDivElement>(null);
  // Choosing an option changes the picture: slide the phone strip there too.
  useEffect(() => {
    const el = strip.current;
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== shown) el.scrollTo({ left: shown * el.clientWidth, behavior: 'smooth' });
  }, [shown]);
  if (!pictures.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl bg-zinc-50 text-zinc-300">
        <ImageOff className="size-12" />
      </div>
    );
  }
  const current = pictures[Math.min(shown, pictures.length - 1)]!;
  return (
    <div className="md:sticky md:top-32 md:self-start">
      {/* Phones: swipe through the pictures. */}
      <div
        ref={strip}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== shown) onShow(i);
        }}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory overflow-x-auto md:hidden"
      >
        {pictures.map((p, i) => (
          <div key={i} className="aspect-square w-full shrink-0 snap-center bg-zinc-50">
            <img src={imageAt(p, 800)} srcSet={srcSet(p)} sizes="100vw" alt={p.alt ?? name} className="size-full object-contain p-4" loading={i ? 'lazy' : 'eager'} />
          </div>
        ))}
      </div>
      {pictures.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 md:hidden">
          {pictures.map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all', i === shown ? 'w-5 bg-brand-700' : 'w-1.5 bg-zinc-300')} />
          ))}
        </div>
      )}

      {/* Computers: big picture and thumbnails. */}
      <div className="hidden aspect-square overflow-hidden rounded-3xl bg-zinc-50 md:block">
        <img src={imageAt(current, 800)} srcSet={srcSet(current)} sizes="(min-width: 1280px) 600px, 50vw" alt={current.alt ?? name} className="size-full object-contain p-6" />
      </div>
      {pictures.length > 1 && (
        <div className="mt-3 hidden gap-2 md:flex md:flex-wrap">
          {pictures.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onShow(i)}
              aria-label={`Picture ${i + 1}`}
              className={cn('size-16 overflow-hidden rounded-xl bg-zinc-50 ring-2', i === shown ? 'ring-brand-600' : 'ring-transparent hover:ring-zinc-300')}
            >
              <img src={imageAt(p, 160)} alt="" className="size-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
