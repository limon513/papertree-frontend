'use client';

import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { cart, useCartQuantity, type CartItem } from '@/lib/cart';
import type { ProductCard } from '@/lib/types';
import { cn, links } from '@/lib/utils';

/**
 * "Add" on a product card. Once added it turns into − 2 +, so a basket fills up quickly.
 * Products with several variants (colours, sizes) open the product page to choose one.
 */
export function AddButton({ product, className }: { product: ProductCard; className?: string }) {
  const quantity = useCartQuantity(product.variantId);

  if (!product.inStock) {
    return (
      <span className={cn('flex h-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-400', className)}>
        Out of stock
      </span>
    );
  }

  if (product.variantId === null) {
    return (
      <Link
        href={links.product(product.slug)}
        className={cn(
          'flex h-9 items-center justify-center rounded-full border border-brand-600 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50',
          className,
        )}
      >
        Choose {product.variantCount} options
      </Link>
    );
  }

  const item: Omit<CartItem, 'quantity'> = {
    variantId: product.variantId,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    variantLabel: null,
    image: product.image,
    price: product.price,
    regularPrice: product.regularPrice,
    maxQuantity: product.lowStock,
  };

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => cart.add(item)}
        className={cn(
          'flex h-9 items-center justify-center gap-1 rounded-full bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-800 active:scale-[0.98]',
          className,
        )}
      >
        <Plus className="size-4" strokeWidth={2.5} /> Add
      </button>
    );
  }

  const atMax = product.lowStock !== null && quantity >= product.lowStock;
  return (
    <div className={cn('flex h-9 items-center justify-between rounded-full bg-brand-700 text-white', className)}>
      <button
        type="button"
        onClick={() => cart.setQuantity(product.variantId!, quantity - 1)}
        className="flex size-9 items-center justify-center rounded-full hover:bg-brand-800"
        aria-label={`One less ${product.name}`}
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span key={quantity} className="animate-pop text-sm font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => cart.add(item)}
        disabled={atMax}
        className="flex size-9 items-center justify-center rounded-full hover:bg-brand-800 disabled:opacity-40"
        aria-label={`One more ${product.name}`}
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
