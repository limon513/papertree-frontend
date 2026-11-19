import { useEffect, useState } from 'preact/hooks';
import { BellRing, Check, Share, X } from 'lucide-preact';
import { useMe } from '@/lib/account';
import { askedLately, keepPushFresh, notNow, pushState, turnOn, type PushState } from '@/lib/push';
import type { PushConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

const TEXT = {
  order: { title: 'Get updates about this order on this phone?', body: 'We tell you when it is confirmed and on the way. Turn it off any time in your account.' },
  wishlist: { title: 'Hear when your saved items are back or cheaper?', body: 'Not often: one short alert at most a day, only for real changes.' },
};

/**
 * A short, friendly ask to turn on alerts, never on a first visit and never in the way of ordering:
 * after placing an order (thank-you page), or after saving a first product (a small card). The
 * browser's own permission popup comes only after "Turn on". "Not now" keeps it away for two weeks.
 * The site-wide copy (variant "wishlist") also links the device to the account and keeps it fresh.
 */
export default function PushAsk({ config, variant }: { config: PushConfig | null; variant: 'order' | 'wishlist' }) {
  const m = useMe();
  const [state, setState] = useState<PushState | null>(null);
  const [show, setShow] = useState(variant === 'order');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'on' | 'denied' | 'failed' | null>(null);

  useEffect(() => setState(pushState()), []);
  useEffect(() => {
    if (variant === 'wishlist' && m !== undefined) void keepPushFresh(config, m?.id ?? null);
  }, [m?.id]);
  useEffect(() => {
    if (variant !== 'wishlist') return;
    const saved = () => setShow(true);
    document.addEventListener('pt:wish-saved', saved);
    return () => document.removeEventListener('pt:wish-saved', saved);
  }, []);
  // The thank-you note goes away by itself on the small card.
  useEffect(() => {
    if (variant !== 'wishlist' || !done) return;
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, [done]);

  if (!config || !state || !show) return null;
  if (!done && (state === 'on' || state === 'denied' || state === 'unsupported' || askedLately())) return null;

  const later = () => {
    notNow();
    setShow(false);
  };
  const on = async () => {
    setBusy(true);
    const r = await turnOn(config);
    setBusy(false);
    setDone(r);
    if (r === 'on') setState('on');
  };
  const floating = variant === 'wishlist';
  const box = cn(
    'rounded-2xl bg-white p-4 text-sm ring-1 ring-brand-200',
    floating ? 'fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-slide-up shadow-xl lg:bottom-6' : 'mt-6 bg-brand-50/60',
  );

  if (done === 'on') {
    return (
      <div class={box} role="status">
        <p class="flex items-center gap-2 font-semibold text-zinc-900">
          <Check class="size-5 text-brand-600" /> Alerts are on
        </p>
        <p class="mt-0.5 text-zinc-600">{variant === 'order' ? 'We will tell you when your order moves on.' : 'We will tell you when a saved item is back or cheaper.'}</p>
      </div>
    );
  }

  return (
    <div class={box} role="region" aria-label="Alerts">
      <div class="flex gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <BellRing class="size-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-zinc-900">{TEXT[variant].title}</p>
          {state === 'ios-install' ? (
            <p class="mt-0.5 text-zinc-600">
              On iPhone: tap <Share class="inline size-4 align-text-bottom" aria-label="Share" /> then <strong>Add to Home Screen</strong>. Open PaperTree from your Home Screen and turn on alerts there.
            </p>
          ) : (
            <p class="mt-0.5 text-zinc-600">{TEXT[variant].body}</p>
          )}
          {done === 'denied' && <p class="mt-1 text-red-700">Alerts are blocked for this site in your browser settings.</p>}
          {done === 'failed' && <p class="mt-1 text-red-700">That did not work. Please try again later.</p>}
          <div class="mt-3 flex flex-wrap gap-2">
            {state !== 'ios-install' && !done && (
              <button type="button" disabled={busy} onClick={() => void on()} class="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                <BellRing class="size-4" /> {busy ? 'Turning on…' : 'Turn on alerts'}
              </button>
            )}
            <button type="button" onClick={later} class="flex h-10 cursor-pointer items-center rounded-xl px-4 font-semibold text-zinc-700 ring-1 ring-zinc-300 hover:ring-zinc-400">
              {done ? 'Close' : state === 'ios-install' ? 'Got it' : 'Not now'}
            </button>
          </div>
        </div>
        {floating && (
          <button type="button" onClick={later} aria-label="Close" class="-mt-1 -mr-1 h-8 cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100">
            <X class="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
