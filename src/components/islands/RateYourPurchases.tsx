import { useEffect, useState } from 'preact/hooks';
import { Star } from 'lucide-preact';
import { api } from '@/lib/account';
import type { Img } from '@/lib/types';
import { imageAt, links } from '@/lib/utils';

interface Item {
  productId: number;
  slug: string;
  name: string;
  image: Img | null;
}

/** On the account page: products they received but have not reviewed yet. Hidden when there are none. */
export function RateYourPurchases() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    api('/me/reviewable')
      .then((r) => (r.ok ? (r.json() as Promise<{ items: Item[] }>) : { items: [] }))
      .then((d) => setItems(d.items))
      .catch(() => null);
  }, []);
  if (!items.length) return null;
  return (
    <section class="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 lg:col-start-1">
      <h2 class="flex items-center gap-2 font-display text-lg font-bold">
        <Star class="size-5 text-marigold-500" /> Rate your purchases
      </h2>
      <p class="mt-1 text-sm text-zinc-500">Your review helps other shoppers choose.</p>
      <ul class="mt-3 divide-y divide-zinc-100">
        {items.slice(0, 6).map((i) => (
          <li key={i.productId} class="flex items-center gap-3 py-2.5">
            <span class="size-11 shrink-0 rounded-lg bg-zinc-50">{i.image && <img src={imageAt(i.image, 160)} alt="" width={44} height={44} class="size-full object-contain p-1" />}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-zinc-800">{i.name}</span>
            <a href={`${links.product(i.slug)}#write-review`} class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
              Review
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
