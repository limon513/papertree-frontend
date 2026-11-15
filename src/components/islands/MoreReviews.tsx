import { useState } from 'preact/hooks';
import { Loader2 } from 'lucide-preact';
import { ReviewItem } from '@/components/Stars';
import type { Review, ReviewList } from '@/lib/types';
import { API_PUBLIC_URL } from '@/lib/utils';

/** "Show more reviews": the next pages after the ones the page already shows. */
export default function MoreReviews({ slug, pages }: { slug: string; pages: number }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const more = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/products/${encodeURIComponent(slug)}/reviews?page=${page + 1}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as ReviewList;
      setItems((old) => [...old, ...data.items]);
      setPage(data.page);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {items.length > 0 && (
        <ul class="divide-y divide-zinc-100">
          {items.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}
      {page < pages && (
        <button type="button" onClick={more} disabled={busy} class="mt-2 flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-60">
          {busy && <Loader2 class="size-4 animate-spin" />} Show more reviews
        </button>
      )}
      {failed && <p class="mt-2 text-sm text-red-700">No connection. Please try again.</p>}
    </>
  );
}
