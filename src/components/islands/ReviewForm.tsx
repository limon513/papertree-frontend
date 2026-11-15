import { useEffect, useRef, useState } from 'preact/hooks';
import { Camera, Loader2, Pencil, Star, Trash2, X } from 'lucide-preact';
import { Stars } from '@/components/Stars';
import { openSignIn, useMe } from '@/lib/account';
import type { Img } from '@/lib/types';
import { API_PUBLIC_URL, cn, imageAt } from '@/lib/utils';

/**
 * Write a review. Only customers who received the product can (the shop checks); it shows after staff
 * approve it. Up to 2 photos. Their own review shows here with its status, to change or delete.
 * The page opens the form at once from a link ending in #write-review.
 */

const MAX_PHOTOS = 2;
type Photo = Img & { id: number };
interface Mine {
  id: number;
  rating: number;
  body: string | null;
  photos: Photo[];
  status: 'pending' | 'approved' | 'rejected';
}
interface Answer {
  canReview: boolean;
  reason: 'sign_in' | 'not_delivered' | null;
  review: Mine | null;
}

const STATUS: Record<Mine['status'], { text: string; tone: string }> = {
  pending: { text: 'Waiting for the shop to check it. It shows here once approved.', tone: 'bg-marigold-50 text-zinc-800 ring-marigold-200' },
  approved: { text: 'Shown on this page. Thank you!', tone: 'bg-brand-50 text-brand-900 ring-brand-200' },
  rejected: { text: 'Not shown: the shop did not approve it. You can change it and send it again.', tone: 'bg-zinc-50 text-zinc-700 ring-zinc-200' },
};
const WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

const call = (path: string, init: RequestInit = {}) => fetch(`${API_PUBLIC_URL}/v1/store${path}`, { credentials: 'include', ...init });

export default function ReviewForm({ productId, productName }: { productId: number; productName: string }) {
  const m = useMe();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = () =>
    call(`/me/reviews/${productId}`)
      .then((r) => (r.ok ? (r.json() as Promise<Answer>) : null))
      .then((a) => a && setAnswer(a))
      .catch(() => null);

  useEffect(() => {
    if (m === undefined) return;
    void load();
  }, [m?.id ?? null, m === undefined]);
  // From "Rate your purchases" (…#write-review): open the form.
  useEffect(() => {
    if (location.hash === '#write-review' && answer?.canReview && !answer.review) {
      setOpen(true);
      box.current?.scrollIntoView({ block: 'center' });
    }
  }, [answer?.canReview]);

  if (m === undefined || !answer) return null;
  const mine = answer.review;

  if (sent && !open) {
    return (
      <div ref={box} class="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-200">
        Thank you! Your review was sent. It shows here once the shop checks it.
      </div>
    );
  }
  if (open) {
    return (
      <div ref={box}>
        <Form
          productId={productId}
          productName={productName}
          mine={mine}
          onCancel={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setSent(true);
            void load();
          }}
        />
      </div>
    );
  }
  if (mine) {
    const s = STATUS[mine.status];
    return (
      <div ref={box} class={cn('rounded-2xl p-4 text-sm ring-1', s.tone)}>
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-semibold">Your review</span>
          <Stars value={mine.rating} />
        </div>
        <p class="mt-1">{s.text}</p>
        <div class="mt-3 flex gap-2">
          <button type="button" onClick={() => setOpen(true)} class="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
            <Pencil class="size-4" /> Change
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!confirm('Delete your review?')) return;
              const r = await call(`/me/reviews/${mine.id}`, { method: 'DELETE' }).catch(() => null);
              if (r?.ok) void load();
            }}
            class="flex h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-zinc-600 hover:bg-white"
          >
            <Trash2 class="size-4" /> Delete
          </button>
        </div>
      </div>
    );
  }
  if (answer.canReview) {
    return (
      <button ref={box as never} type="button" onClick={() => setOpen(true)} class="flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
        <Star class="size-4" /> Write a review
      </button>
    );
  }
  return (
    <p ref={box as never} class="text-sm text-zinc-600">
      {answer.reason === 'sign_in' ? (
        <>
          Bought this?{' '}
          <button type="button" onClick={() => openSignIn({ reason: 'Sign in to review products you received.' })} class="font-semibold text-brand-700 hover:underline">
            Sign in to review it
          </button>
        </>
      ) : (
        'Only customers who received this product can review it.'
      )}
    </p>
  );
}

function Form({ productId, productName, mine, onCancel, onSent }: { productId: number; productName: string; mine: Mine | null; onCancel: () => void; onSent: () => void }) {
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(mine?.body ?? '');
  const [photos, setPhotos] = useState<Photo[]>(mine?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    const chosen = [...files].slice(0, room);
    if (files.length > room) setError(`At most ${MAX_PHOTOS} photos.`);
    setUploading(true);
    for (const f of chosen) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setError('Use JPG, PNG or WebP photos.');
        continue;
      }
      if (f.size > 8 * 1024 * 1024) {
        setError('A photo can be up to 8 MB.');
        continue;
      }
      const form = new FormData();
      form.append('file', f);
      try {
        const res = await call('/me/review-photos', { method: 'POST', body: form });
        const data = (await res.json().catch(() => null)) as (Photo & { error?: { message?: string } }) | null;
        if (res.ok && data) setPhotos((old) => [...old, data].slice(0, MAX_PHOTOS));
        else setError(data?.error?.message ?? 'The photo could not be added.');
      } catch {
        setError('No connection. Please try again.');
      }
    }
    setUploading(false);
    if (file.current) file.current.value = '';
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!rating) return setError('Choose 1 to 5 stars.');
    setBusy(true);
    setError(null);
    try {
      const res = await call('/me/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, rating, body: body.trim() || null, photoIds: photos.map((p) => p.id) }),
      });
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (res.ok) return onSent();
      setError(data?.error?.message ?? 'The review could not be sent.');
    } catch {
      setError('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;
  return (
    <form onSubmit={submit} class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5">
      <p class="font-semibold text-zinc-900">{mine ? 'Change your review' : 'Your review'}</p>
      <p class="text-sm text-zinc-500">{productName}</p>
      <div class="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            class="rounded p-0.5"
          >
            <Star class={cn('size-8', n <= shown ? 'fill-marigold-400 text-marigold-400' : 'text-zinc-300')} />
          </button>
        ))}
        <span class="ml-2 text-sm font-medium text-zinc-700">{WORDS[shown]}</span>
      </div>
      <label class="mt-4 block text-sm font-medium text-zinc-800">
        What did you think? <span class="font-normal text-zinc-500">(optional)</span>
        <textarea
          value={body}
          onInput={(e) => setBody(e.currentTarget.value)}
          rows={4}
          maxLength={2000}
          placeholder="Quality, size, how you use it…"
          class="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-3 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
        />
      </label>
      <div class="mt-3">
        <p class="text-sm font-medium text-zinc-800">
          Photos <span class="font-normal text-zinc-500">(up to {MAX_PHOTOS})</span>
        </p>
        <div class="mt-1.5 flex flex-wrap gap-2">
          {photos.map((p) => (
            <span key={p.id} class="relative size-20 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
              <img src={imageAt(p, 160)} alt="" class="size-full object-cover" />
              <button type="button" onClick={() => setPhotos((old) => old.filter((x) => x.id !== p.id))} aria-label="Remove this photo" class="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white">
                <X class="size-3.5" />
              </button>
            </span>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label class="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 hover:border-brand-400 hover:text-brand-700">
              {uploading ? <Loader2 class="size-5 animate-spin" /> : <Camera class="size-5" />}
              Add photo
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" disabled={uploading} onChange={(e) => addPhotos(e.currentTarget.files)} />
            </label>
          )}
        </div>
      </div>
      {error && (
        <p class="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || uploading} class="flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {busy && <Loader2 class="size-4 animate-spin" />} {mine ? 'Send changes' : 'Send review'}
        </button>
        <button type="button" onClick={onCancel} class="h-11 rounded-xl px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
          Cancel
        </button>
        <span class="text-xs text-zinc-500">The shop checks reviews before they show.</span>
      </div>
    </form>
  );
}
