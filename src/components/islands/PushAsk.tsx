import { useEffect, useRef, useState } from 'preact/hooks';
import { BellRing, Check, CheckCircle2, Share, X } from 'lucide-preact';
import { useMe } from '@/lib/account';
import { askedLately, keepPushFresh, notNow, onPushFailed, pushState, turnOn, type PushState } from '@/lib/push';
import type { PushConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

const TEXT = {
  order: { title: 'Get updates about this order on this phone?', body: 'We tell you when it is confirmed and on the way. Turn it off any time in your account.' },
  wishlist: { title: 'Hear when your saved items are back or cheaper?', body: 'Not often: one short alert at most a day, only for real changes.' },
};

/**
 * A short, friendly ask to turn on alerts, never on a first visit and never in the way of ordering:
 * - "order": right after placing an order (or paying for it), a popup with the order confirmation,
 *   the page blurred behind; it closes smoothly whatever is chosen. Not on later visits to the page.
 * - "wishlist": after saving a first product, a small card at the bottom (this site-wide copy also
 *   keeps this device's alerts linked to the account and fresh).
 * The browser's own permission popup comes only after "Turn on"; once allowed, it says "on" at once.
 * "Not now" keeps the shop quiet for two weeks.
 */
export default function PushAsk({ config, variant, orderNumber, paid = false }: { config: PushConfig | null; variant: 'order' | 'wishlist'; orderNumber?: number; paid?: boolean }) {
  const m = useMe();
  const [state, setState] = useState<PushState | null>(null);
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState<'on' | 'denied' | 'failed' | null>(null);
  const [broke, setBroke] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  // The page's own scroll setting while the popup holds it (given back as soon as it starts closing).
  const lockedFrom = useRef<string | null>(null);

  useEffect(() => {
    const s = pushState();
    setState(s);
    if (variant !== 'order') return;
    // Only right after ordering (the checkout and the payment page send the shopper here so).
    const q = new URLSearchParams(location.search);
    const fresh = q.get('placed') === '1' || q.get('payment') === 'paid';
    if (q.has('placed')) {
      q.delete('placed');
      history.replaceState(history.state, '', `${location.pathname}?${q}${location.hash}`);
    }
    if (fresh && config && (s === 'off' || s === 'ios-install') && !askedLately()) setShow(true);
  }, []);
  useEffect(() => {
    if (variant === 'wishlist' && m !== undefined) void keepPushFresh(config, m?.id ?? null);
  }, [m?.id]);
  useEffect(() => {
    if (variant !== 'wishlist') return;
    const saved = () => {
      const s = pushState();
      setState(s);
      if (config && (s === 'off' || s === 'ios-install') && !askedLately()) setShow(true);
    };
    document.addEventListener('pt:wish-saved', saved);
    return () => document.removeEventListener('pt:wish-saved', saved);
  }, []);
  useEffect(() => onPushFailed(() => setBroke(true)), []);

  const modal = variant === 'order';
  // The popup: page behind does not scroll, Escape closes, the cursor starts on the first button.
  useEffect(() => {
    if (!modal || !show) return;
    lockedFrom.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    first.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && later();
    document.addEventListener('keydown', key);
    return () => {
      unlock();
      document.removeEventListener('keydown', key);
    };
  }, [show]);

  function unlock() {
    if (lockedFrom.current === null) return;
    document.body.style.overflow = lockedFrom.current;
    lockedFrom.current = null;
  }
  const close = () => {
    unlock();
    setClosing(true);
    setTimeout(() => (setShow(false), setClosing(false)), 220);
  };
  const later = () => {
    if (!done) notNow();
    close();
  };
  const on = async () => {
    const r = await turnOn(config!);
    setDone(r);
    if (r === 'on') {
      setState('on');
      // Said at once; then the popup or card goes away by itself.
      setTimeout(close, modal ? 1400 : 3000);
    }
  };

  if (broke && variant === 'wishlist') {
    return (
      <div class="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md animate-slide-up rounded-2xl bg-white p-4 text-sm shadow-xl ring-1 ring-red-200 lg:bottom-6" role="alert">
        <p class="font-semibold text-zinc-900">Alerts could not be turned on</p>
        <p class="mt-0.5 text-zinc-600">Please try again later from your account page.</p>
        <button type="button" onClick={() => setBroke(false)} class="mt-2 cursor-pointer font-semibold text-brand-700 hover:underline">
          OK
        </button>
      </div>
    );
  }
  if (!config || !state || !show) return null;

  const ask = (
    <div class="flex gap-3">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        {done === 'on' ? <Check class="size-5" /> : <BellRing class="size-5" />}
      </span>
      <div class="min-w-0 flex-1">
        {done === 'on' ? (
          <>
            <p id={`push-ask-${variant}`} class="font-semibold text-zinc-900">
              Alerts are on
            </p>
            <p class="mt-0.5 text-zinc-600">{variant === 'order' ? 'We will tell you when your order moves on.' : 'We will tell you when a saved item is back or cheaper.'}</p>
          </>
        ) : (
          <>
            <p id={`push-ask-${variant}`} class="font-semibold text-zinc-900">
              {TEXT[variant].title}
            </p>
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
                <button ref={first} type="button" onClick={() => void on()} class="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700">
                  <BellRing class="size-4" /> Turn on alerts
                </button>
              )}
              <button
                ref={state === 'ios-install' || done ? first : undefined}
                type="button"
                onClick={later}
                class="flex h-10 cursor-pointer items-center rounded-xl px-4 font-semibold text-zinc-700 ring-1 ring-zinc-300 hover:ring-zinc-400"
              >
                {done ? 'Close' : state === 'ios-install' ? 'Got it' : 'Not now'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (modal) {
    return (
      <div class="fixed inset-0 z-[60] flex items-end justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-center">
        <div class={cn('absolute inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-200', closing ? 'opacity-0' : 'animate-fade-in')} onClick={later} aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`push-ask-${variant}`}
          class={cn(
            'relative w-full max-w-md rounded-3xl bg-white p-5 text-sm shadow-2xl transition duration-200 ease-out sm:p-6',
            closing ? 'translate-y-3 scale-95 opacity-0' : 'animate-slide-up sm:animate-fade-in',
          )}
        >
          <button type="button" onClick={later} aria-label="Close" class="absolute top-3 right-3 cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100">
            <X class="size-4" />
          </button>
          <div class="flex flex-col items-center border-b border-zinc-100 pb-4 text-center">
            <CheckCircle2 class="size-12 text-brand-600" />
            <p class="mt-2 font-display text-lg font-bold text-zinc-900">{paid ? 'Paid and placed!' : 'Your order is placed!'}</p>
            {orderNumber && <p class="text-zinc-600">Order #{orderNumber}</p>}
          </div>
          <div class="pt-4">{ask}</div>
        </div>
      </div>
    );
  }
  return (
    <div
      class={cn(
        'fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl bg-white p-4 text-sm shadow-xl ring-1 ring-brand-200 transition duration-200 lg:bottom-6',
        closing ? 'translate-y-3 opacity-0' : 'animate-slide-up',
      )}
      role="region"
      aria-label="Alerts"
    >
      <div class="flex gap-3">
        <div class="min-w-0 flex-1">{ask}</div>
        <button type="button" onClick={later} aria-label="Close" class="-mt-1 -mr-1 h-8 cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100">
          <X class="size-4" />
        </button>
      </div>
    </div>
  );
}
