import { Heart } from 'lucide-preact';
import { openSignIn, useMe } from '@/lib/account';

/**
 * The wishlist page. A wishlist belongs to a signed-in customer, so it is the same on their phone and
 * computer, and the shop can tell them when a saved product is back in stock or cheaper.
 */
export default function WishlistView() {
  const m = useMe();
  if (m === undefined) return <div class="h-40 animate-pulse rounded-2xl bg-zinc-100" />;
  return (
    <div class="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-zinc-200">
      <span class="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Heart class="size-7" />
      </span>
      {m ? (
        <>
          <h2 class="mt-4 font-display text-lg font-bold text-zinc-900">Nothing saved yet</h2>
          <p class="mt-1 max-w-sm text-sm text-zinc-600">Save products you like with the heart, and we will tell you when they are back in stock or cheaper.</p>
          <a href="/shop/" class="mt-5 flex h-11 items-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
            Browse products
          </a>
        </>
      ) : (
        <>
          <h2 class="mt-4 font-display text-lg font-bold text-zinc-900">Sign in to see your wishlist</h2>
          <p class="mt-1 max-w-sm text-sm text-zinc-600">Your saved products stay with your account, on your phone and computer.</p>
          <button type="button" onClick={() => openSignIn()} class="mt-5 flex h-11 cursor-pointer items-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
            Sign in
          </button>
        </>
      )}
    </div>
  );
}
