import { useEffect, useState } from 'preact/hooks';
import { Check, ExternalLink, Loader2, MapPin, Package, Truck, XCircle } from 'lucide-preact';
import { useMe } from '@/lib/account';
import type { ParcelStep, TrackedOrder } from '@/lib/types';
import { API_PUBLIC_URL, cn, money } from '@/lib/utils';

/**
 * "Track your order": order number + phone → where it is, and the courier's steps once it is on the
 * way. Signed-in shoppers have their phone filled in; ?n=100036 fills the number.
 */

const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).replace(',', ' ·') : null;

export default function TrackOrder() {
  const m = useMe();
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(location.search).get('n');
    if (n && /^#?\d{1,12}$/.test(n)) setNumber(n.replace('#', ''));
  }, []);
  useEffect(() => {
    if (m?.phone && !phone) setPhone(m.phone);
  }, [m?.phone]);

  const submit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    if (!/^#?\s*\d{1,12}$/.test(number.trim())) return setError('Enter the order number, like 100036.');
    if (!/^(\+?880|0)?1\d{9}$/.test(phone.replace(/[\s-]/g, ''))) return setError('Enter the phone number the order was placed with, like 01712345678.');
    setBusy(true);
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/track`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ number: number.trim(), phone }),
      });
      const data = (await res.json().catch(() => null)) as (TrackedOrder & { error?: { message?: string } }) | null;
      if (res.ok && data) {
        setOrder(data);
        history.replaceState(null, '', `?n=${data.number}`);
      } else if (res.status === 429) setError('Too many tries. Please wait a few minutes.');
      else setError(data?.error?.message ?? 'We could not find this order.');
    } catch {
      setError('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (order) {
    return (
      <div>
        <TrackedView order={order} />
        <button type="button" onClick={() => setOrder(null)} class="mt-6 text-sm font-semibold text-brand-700 hover:underline">
          Track another order
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate class="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 sm:p-6">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium text-zinc-800">
          Order number
          <input value={number} onInput={(e) => setNumber(e.currentTarget.value)} inputMode="numeric" placeholder="100036" maxLength={14} class={input} />
        </label>
        <label class="block text-sm font-medium text-zinc-800">
          Phone number
          <input value={phone} onInput={(e) => setPhone(e.currentTarget.value)} type="tel" inputMode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" maxLength={20} class={input} />
        </label>
      </div>
      <p class="mt-2 text-xs text-zinc-500">The order number is in your confirmation email or SMS. Use the phone number you ordered with.</p>
      {error && (
        <p class="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 sm:w-auto sm:px-8">
        {busy ? <Loader2 class="size-5 animate-spin" /> : <Package class="size-5" />} Track order
      </button>
    </form>
  );
}

const STEPS = [
  { key: 'placed', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
] as const;
const REACHED: Record<string, number> = { pending: 0, confirmed: 1, packed: 1, shipped: 2, delivered: 3 };

function TrackedView({ order: o }: { order: TrackedOrder }) {
  const stopped = o.status === 'cancelled' || o.status === 'returned';
  const reached = REACHED[o.status] ?? 0;
  const dates = [o.placedAt, o.confirmedAt, o.shippedAt, o.deliveredAt];
  return (
    <div class="space-y-4">
      <section class="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 sm:p-6">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="font-display text-xl font-bold">Order #{o.number}</h2>
          <span class="text-sm text-zinc-500">
            {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {money(o.total)}
          </span>
        </div>
        {o.place && (
          <p class="mt-1 flex items-center gap-1.5 text-sm text-zinc-600">
            <MapPin class="size-4" /> To {o.place}
          </p>
        )}
        {stopped ? (
          <p class="mt-4 flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 text-sm text-zinc-800">
            <XCircle class="size-5 text-zinc-500" /> This order was {o.status}. Questions? Call or WhatsApp us.
          </p>
        ) : (
          <ol class="mt-5 grid grid-cols-4 gap-1.5" aria-label="Order progress">
            {STEPS.map((s, i) => (
              <li key={s.key} class="text-center">
                <span class={cn('mx-auto flex size-8 items-center justify-center rounded-full text-sm font-bold', i <= reached ? 'bg-brand-700 text-white' : 'bg-zinc-100 text-zinc-400')}>
                  {i <= reached ? <Check class="size-4" /> : i + 1}
                </span>
                <span class={cn('mt-1.5 block text-xs sm:text-sm', i <= reached ? 'font-semibold text-brand-800' : 'text-zinc-400')}>{s.label}</span>
                {i <= reached && dates[i] && <span class="block text-[11px] text-zinc-500">{when(dates[i])}</span>}
              </li>
            ))}
          </ol>
        )}
        {!stopped && o.status !== 'delivered' && o.due > 0 && (
          <p class="mt-4 text-sm text-zinc-700">
            To pay when it arrives: <strong>{money(o.due)}</strong>
          </p>
        )}
      </section>
      <ParcelCard order={o} />
    </div>
  );
}

/** The courier part: who, the tracking code and link, where the parcel is, and its journey. */
export function ParcelCard({ order: o }: { order: Pick<TrackedOrder, 'courier' | 'trackingCode' | 'trackingUrl' | 'parcelStatus' | 'journey'> }) {
  if (!o.courier && !o.trackingCode && !o.journey?.length) return null;
  return (
    <section class="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 sm:p-6">
      <h3 class="flex items-center gap-2 font-semibold text-zinc-900">
        <Truck class="size-5 text-brand-700" /> {o.courier ?? 'Courier'}
      </h3>
      {o.parcelStatus && <p class="mt-1 text-sm font-medium text-brand-800">{o.parcelStatus}</p>}
      {o.trackingCode && (
        <p class="mt-1 text-sm text-zinc-600">
          Tracking code <strong class="font-mono text-zinc-900 select-all">{o.trackingCode}</strong>
        </p>
      )}
      {o.trackingUrl && (
        <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" class="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          Track on {o.courier ?? 'the courier'}'s website <ExternalLink class="size-3.5" />
        </a>
      )}
      {o.journey && o.journey.length > 0 && <Journey steps={o.journey} />}
    </section>
  );
}

export function Journey({ steps }: { steps: ParcelStep[] }) {
  return (
    <ol class="mt-4 space-y-3 border-l-2 border-zinc-200 pl-4" aria-label="Parcel journey">
      {steps.map((s, i) => (
        <li key={i} class="relative">
          <span class={cn('absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ring-2 ring-white', i === 0 ? 'bg-brand-600' : 'bg-zinc-300')} />
          <p class={cn('text-sm', i === 0 ? 'font-medium text-zinc-900' : 'text-zinc-700')}>{s.text}</p>
          {s.at && <p class="text-xs text-zinc-500">{when(s.at)}</p>}
        </li>
      ))}
    </ol>
  );
}
