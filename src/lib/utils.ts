import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PUBLIC_API_URL, PUBLIC_SITE_URL } from 'astro:env/client';
import type { Img } from './types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const taka = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** 1250 -> "৳1,250". */
export const money = (value: number) => `৳${taka.format(value)}`;

/** Percentage off, rounded down: 380 of 543 -> 30. */
export const percentOff = (price: number, regular: number | null) =>
  regular && regular > price ? Math.floor(((regular - price) / regular) * 100) : 0;

export const API_PUBLIC_URL = PUBLIC_API_URL.replace(/\/$/, '');
export const SITE_URL = PUBLIC_SITE_URL.replace(/\/$/, '');

/** Category and brand icons are served by the API. */
export const iconUrl = (key: string) => `${API_PUBLIC_URL}/icons/${key}.svg`;

/** srcset for an API image: "url 160w, url 400w, ...". */
export const srcSet = (img: Img) =>
  Object.entries(img.urls)
    .map(([w, url]) => `${url} ${w}w`)
    .join(', ');

/** The smallest saved size at least `width` wide (or the largest). */
export function imageAt(img: Img, width: number) {
  const sizes = Object.keys(img.urls)
    .map(Number)
    .sort((a, b) => a - b);
  const pick = sizes.find((s) => s >= width) ?? sizes[sizes.length - 1]!;
  return img.urls[String(pick)]!;
}

/** Links that keep the old WooCommerce addresses. */
export const links = {
  product: (slug: string) => `/product/${slug}/`,
  category: (path: string[]) => `/product-category/${path.join('/')}/`,
  brand: (slug: string) => `/brand/${slug}/`,
};

/** Product tag colours (the admin's colour names), as badge styles. */
const TAG_STYLES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  blue: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-violet-100 text-violet-800',
  pink: 'bg-pink-100 text-pink-800',
  gray: 'bg-zinc-100 text-zinc-700',
  black: 'bg-zinc-900 text-white',
};
export const tagClass = (color: string) => TAG_STYLES[color] ?? TAG_STYLES.gray!;
