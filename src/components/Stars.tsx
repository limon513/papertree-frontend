import type { Review } from '@/lib/types';
import { cn, imageAt } from '@/lib/utils';

/**
 * Stars for a rating (4.5 → four and a half). Plain markup: works in Astro pages and in islands.
 * Partial stars are drawn by clipping a gold row over a grey one.
 */
export function Stars({ value, size = 'size-4', className }: { value: number; size?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (tone: string) => (
    <span class={cn('flex', tone)} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" class={cn(size, 'shrink-0')} fill="currentColor">
          <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" />
        </svg>
      ))}
    </span>
  );
  return (
    <span class={cn('relative inline-flex', className)} role="img" aria-label={`${Math.round(value * 10) / 10} out of 5 stars`}>
      {row('text-zinc-200')}
      <span class="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row('text-marigold-400')}
      </span>
    </span>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** One review: stars, who, when, text, photos, and the shop's reply. */
export function ReviewItem({ review: r }: { review: Review }) {
  return (
    <li class="py-5">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} />
        <span class="text-sm font-semibold text-zinc-900">{r.name}</span>
        {r.verified && <span class="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">Verified buyer</span>}
        <span class="text-xs text-zinc-500">{day(r.createdAt)}</span>
      </div>
      {r.body && <p class="mt-2 text-sm leading-relaxed whitespace-pre-line text-zinc-700">{r.body}</p>}
      {r.photos.length > 0 && (
        <div class="mt-3 flex gap-2">
          {r.photos.map((p, i) => (
            <a key={i} href={imageAt(p, 1600)} target="_blank" rel="noopener" class="block size-20 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 hover:ring-brand-400">
              <img src={imageAt(p, 160)} alt={`Photo ${i + 1} from ${r.name}`} width={80} height={80} loading="lazy" class="size-full object-cover" />
            </a>
          ))}
        </div>
      )}
      {r.reply && (
        <div class="mt-3 rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm">
          <p class="font-semibold text-zinc-900">Reply from the shop</p>
          <p class="mt-0.5 whitespace-pre-line text-zinc-700">{r.reply}</p>
        </div>
      )}
    </li>
  );
}
