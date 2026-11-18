import { useEffect, useRef, useState } from 'preact/hooks';
import { effect } from '@preact/signals';
import { Heart } from 'lucide-preact';
import { openSignIn, useMe } from '@/lib/account';
import { saved, savedLoaded, wishlistDetails } from '@/lib/wishlist';
import { money } from '@/lib/utils';

type Details = Awaited<ReturnType<typeof wishlistDetails>>['items'];

/**
 * The wishlist page. A wishlist belongs to a signed-in customer, so it is the same on their phone and
 * computer, and the shop can tell them when a saved product is back in stock or cheaper. The cards are
 * the shop's usual cards (from /fragments/cards/); tapping a heart here removes the product.
 */
export default function WishlistView() {
  const m = useMe();
  const [items, setItems] = useState<Details | null>(null);
  const [failed, setFailed] = useState(false);
  const [left, setLeft] = useState(0);
  const grid = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!m) return;
    let live = true;
    (async () => {
      try {
        const { items: list } = await wishlistDetails();
        if (!live) return;
        setItems(list);
        setLeft(list.length);
        if (!list.length) return;
        // The cards, 60 at a time, in the saved order (the grid is on the page by the time they come).
        const html: string[] = [];
        for (let i = 0; i < list.length; i += 60) {
          const res = await fetch(`/fragments/cards/?ids=${list.slice(i, i + 60).map((x) => x.productId).join(',')}`);
          if (res.ok) html.push(await res.text());
        }
        if (!html.length) throw new Error('The cards did not load');
        if (!live || !grid.current) return;
        const t = document.createElement('template');
        t.innerHTML = html.join('');
        t.content.querySelectorAll('script').forEach((s) => s.remove());
        const lis = [...t.content.querySelectorAll('li[data-item-of]')];
        // What changed since it was saved, on the card itself.
        for (const li of lis) {
          const d = list.find((x) => x.productId === Number((li as HTMLElement).dataset.itemOf));
          const note = d?.cheaper ? `${money(d.cheaper)} cheaper since you saved it` : d?.backInStock ? 'Back in stock' : null;
          if (!note) continue;
          const tag = document.createElement('p');
          tag.className = 'mb-1.5 inline-flex w-fit rounded-md bg-lime-100 px-2 py-0.5 text-xs font-semibold text-lime-900';
          tag.textContent = note;
          li.querySelector('.pc-body')?.prepend(tag);
        }
        grid.current.replaceChildren(...lis);
        // Products no longer for sale are not in the list: count what is shown.
        setLeft(lis.length);
        document.dispatchEvent(new Event('pt:cards'));
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [m?.id]);

  // A heart tapped here: that product leaves the page (once the hearts are known, never before).
  useEffect(
    () =>
      effect(() => {
        const ids = saved.value;
        const list = grid.current;
        if (!savedLoaded.value || !list || !items?.length) return;
        let removed = 0;
        for (const li of [...list.children] as HTMLElement[]) {
          if (ids.has(Number(li.dataset.itemOf))) continue;
          li.remove();
          removed++;
        }
        if (removed) setLeft(list.children.length);
      }),
    [items],
  );

  if (m === undefined || (m && items === null && !failed)) return <div class="h-64 animate-pulse rounded-2xl bg-zinc-100" aria-busy="true" />;
  if (!m || failed || left === 0) {
    return (
      <div class="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-zinc-200">
        <span class="flex size-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Heart class="size-7" />
        </span>
        {!m ? (
          <>
            <h2 class="mt-4 font-display text-lg font-bold text-zinc-900">Sign in to see your wishlist</h2>
            <p class="mt-1 max-w-sm text-sm text-zinc-600">Your saved products stay with your account, on your phone and computer.</p>
            <button type="button" onClick={() => openSignIn()} class="mt-5 flex h-11 cursor-pointer items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Sign in
            </button>
          </>
        ) : failed ? (
          <>
            <h2 class="mt-4 font-display text-lg font-bold text-zinc-900">Your wishlist could not load</h2>
            <p class="mt-1 max-w-sm text-sm text-zinc-600">Check your internet and try again.</p>
            <button type="button" onClick={() => location.reload()} class="mt-5 flex h-11 cursor-pointer items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Try again
            </button>
          </>
        ) : (
          <>
            <h2 class="mt-4 font-display text-lg font-bold text-zinc-900">Nothing saved yet</h2>
            <p class="mt-1 max-w-sm text-sm text-zinc-600">Tap the heart on any product to save it here. We will tell you when it is back in stock or cheaper.</p>
            <a href="/" class="mt-5 flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
              Browse products
            </a>
          </>
        )}
      </div>
    );
  }
  return (
    <div>
      <p class="mb-4 text-sm text-zinc-600">
        {left} saved product{left === 1 ? '' : 's'}. Tap a heart to remove it.
      </p>
      <ul ref={grid} class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6" aria-label="Saved products" />
    </div>
  );
}
