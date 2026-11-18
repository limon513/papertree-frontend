import { Heart } from 'lucide-preact';
import { saved, toggleWish } from '@/lib/wishlist';
import { cn } from '@/lib/utils';

/** The heart on a product page: save to the wishlist, or remove (a guest signs in first). */
export function WishButton({ productId, name }: { productId: number; name: string }) {
  const on = saved.value.has(productId);
  return (
    <button
      type="button"
      onClick={() => void toggleWish(productId)}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`}
      title={on ? 'Saved: tap to remove' : 'Save to wishlist'}
      class={cn(
        'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 transition active:scale-90',
        on ? 'bg-rose-50 text-rose-500 ring-rose-200' : 'bg-white text-zinc-500 ring-zinc-200 hover:text-rose-500',
      )}
    >
      <Heart class={cn('size-5', on && 'fill-current')} />
    </button>
  );
}

/** The header's heart: to the wishlist page, with how many are saved. */
export function WishlistLink({ className, current }: { className?: string; current?: boolean }) {
  const n = saved.value.size;
  return (
    <a href="/wishlist/" aria-label={n ? `Your wishlist, ${n} saved` : 'Your wishlist'} title="Your wishlist" aria-current={current ? 'page' : undefined} class={cn('relative', className)}>
      <Heart class="size-5" strokeWidth={2} />
      {n > 0 && (
        <span class="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white tabular-nums">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </a>
  );
}
