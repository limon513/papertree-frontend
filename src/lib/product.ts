import type { BuyVariant } from '@/components/islands/BuyBox';
import type { Img, Product } from './types';
import { imageAt } from './utils';

const key = (img: Img) => Object.values(img.urls)[0];

/**
 * What the buy box needs from a product (the product page and the "choose options" window):
 * the pictures (the gallery, then options' own pictures), each option with its picture's place, and
 * the option to show first (`askedId` from a shared link, else the first in stock).
 */
export function buyData(product: Product, askedId?: number) {
  const pictures: Img[] = [...product.images];
  for (const v of product.variants) if (v.image && !pictures.some((p) => key(p) === key(v.image!))) pictures.push(v.image);
  const pictureOf = (img: Img | null) => (img ? pictures.findIndex((p) => key(p) === key(img)) : -1);
  const thumbOf = (img: Img | null) => (img ? { urls: { '160': imageAt(img, 160) }, width: img.width, height: img.height, alt: null } : null);
  const first = product.variants.find((v) => v.id === askedId) ?? product.variants.find((v) => v.inStock) ?? product.variants[0]!;
  const variants: BuyVariant[] = product.variants.map((v) => ({
    id: v.id,
    values: v.values,
    price: v.price,
    regularPrice: v.regularPrice,
    saleEndsAt: v.saleEndsAt,
    inStock: v.inStock,
    maxQuantity: v.maxQuantity,
    lowStock: v.lowStock,
    picture: pictureOf(v.image),
    thumb: thumbOf(v.image ?? product.images[0] ?? null),
  }));
  return { pictures, variants, first, start: Math.max(0, pictureOf(first.image)) };
}
