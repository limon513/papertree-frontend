import { useEffect, useState } from 'preact/hooks';
import { BellOff, BellRing, Share } from 'lucide-preact';
import { useMe } from '@/lib/account';
import { pushState, turnOff, turnOn, type PushState } from '@/lib/push';
import type { PushConfig } from '@/lib/types';
import { API_PUBLIC_URL, cn } from '@/lib/utils';

type Prefs = { orders: boolean; offers: boolean; wishlist: boolean; devices: number };
const KINDS = [
  { key: 'orders', label: 'Order updates', hint: 'Confirmed, on the way, delivered' },
  { key: 'offers', label: 'Offers and news', hint: 'Now and then, never at night' },
  { key: 'wishlist', label: 'Saved items', hint: 'Back in stock or cheaper, at most once a day' },
] as const;

/** Account page: alerts on this device, and which kinds the customer wants (on all their devices). */
export default function NotificationSettings({ config }: { config: PushConfig | null }) {
  const m = useMe();
  const [state, setState] = useState<PushState | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => setState(pushState()), []);
  const load = async () => {
    const res = await fetch(`${API_PUBLIC_URL}/v1/store/me/notifications`, { credentials: 'include' }).catch(() => null);
    if (res?.ok) setPrefs((await res.json()) as Prefs);
  };
  useEffect(() => {
    if (m) void load();
  }, [m?.id]);

  if (!config || !m) return null;

  const setKind = async (key: keyof Omit<Prefs, 'devices'>, value: boolean) => {
    setPrefs((p) => (p ? { ...p, [key]: value } : p));
    const res = await fetch(`${API_PUBLIC_URL}/v1/store/me/notifications`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => null);
    if (res?.ok) setPrefs((await res.json()) as Prefs);
    else void load();
  };
  const device = async (on: boolean) => {
    setBusy(true);
    setNote(null);
    if (on) {
      const r = await turnOn(config);
      if (r === 'denied') setNote('Alerts are blocked for this site in your browser settings.');
      if (r === 'failed') setNote('That did not work. Please try again later.');
    } else await turnOff(config);
    setState(pushState());
    await load();
    setBusy(false);
  };

  return (
    <section class="mt-6 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5" aria-labelledby="alerts-title">
      <h2 id="alerts-title" class="font-display text-lg font-bold">Alerts</h2>
      <div class="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-3 text-sm">
        {state === 'on' ? <BellRing class="size-5 text-brand-600" /> : <BellOff class="size-5 text-zinc-400" />}
        <span class="min-w-0 flex-1">
          <span class="block font-medium text-zinc-900">On this device: {state === 'on' ? 'on' : 'off'}</span>
          <span class="block text-zinc-500">
            {state === 'ios-install' ? (
              <>
                On iPhone: tap <Share class="inline size-4 align-text-bottom" aria-label="Share" /> then <strong>Add to Home Screen</strong>, and turn alerts on in the app.
              </>
            ) : state === 'denied' ? (
              'Blocked in your browser settings for this site.'
            ) : state === 'unsupported' ? (
              'This browser cannot take alerts.'
            ) : prefs && prefs.devices > 0 ? (
              `Alerts are on for ${prefs.devices} device${prefs.devices === 1 ? '' : 's'} of yours.`
            ) : (
              'Get your updates here, free.'
            )}
          </span>
        </span>
        {(state === 'on' || state === 'off') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void device(state !== 'on')}
            class={cn('h-10 cursor-pointer rounded-xl px-4 font-semibold disabled:opacity-60', state === 'on' ? 'text-zinc-700 ring-1 ring-zinc-300 hover:ring-zinc-400' : 'bg-brand-600 text-white hover:bg-brand-700')}
          >
            {busy ? '…' : state === 'on' ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </div>
      {note && <p class="mt-2 text-sm text-red-700">{note}</p>}
      {prefs && (
        <ul class="mt-3 divide-y divide-zinc-100">
          {KINDS.map((k) => (
            <li key={k.key} class="flex items-center gap-3 py-2.5 text-sm">
              <label for={`alert-${k.key}`} class="min-w-0 flex-1 cursor-pointer">
                <span class="block font-medium text-zinc-900">{k.label}</span>
                <span class="block text-zinc-500">{k.hint}</span>
              </label>
              <input id={`alert-${k.key}`} type="checkbox" role="switch" checked={prefs[k.key]} onChange={(e) => void setKind(k.key, e.currentTarget.checked)} class="size-5 cursor-pointer accent-brand-600" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
