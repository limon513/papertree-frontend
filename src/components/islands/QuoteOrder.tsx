import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Banknote, CreditCard, ShoppingBag } from 'lucide-preact';
import { saveContact, savedContact } from '@/lib/contact';
import { useMe } from '@/lib/account';
import { areasOf, loadPlaces } from '@/lib/places';
import type { Places } from '@/lib/types';
import { API_PUBLIC_URL, cn, money } from '@/lib/utils';

type Fields = Partial<Record<'name' | 'phone' | 'email' | 'districtId' | 'areaId' | 'address' | 'note', string>>;
interface Totals {
  deliveryFee: number | null;
  total: number | null;
  advance: number;
  minOrderAmount: number | null;
}

const newRequestId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const label = 'block text-sm font-medium text-zinc-800';

/**
 * "Order this quotation": where to deliver and how to pay. The items and their prices are the
 * quotation's (the shop takes them from the saved quotation, never from here); delivery is worked out
 * for the place, and the total shown is the one charged.
 */
export default function QuoteOrder({ token, subtotal, online, wholesale, buyer }: { token: string; subtotal: number; online: boolean; wholesale: boolean; buyer: { name: string; phone: string; email: string | null } }) {
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<Places | null>(null);
  const [form, setForm] = useState({ name: buyer.name, phone: buyer.phone, email: buyer.email ?? '', districtId: '', areaId: '', address: '', note: '', website: '' });
  const [pay, setPay] = useState<'cod' | 'online'>('cod');
  const [errors, setErrors] = useState<Fields>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [pricing, setPricing] = useState(false);
  const [sending, setSending] = useState(false);
  const requestId = useRef(newRequestId());
  const m = useMe();

  useEffect(() => {
    if (!open) return;
    loadPlaces().then(setPlaces, () => setPlaces(null));
    const saved = savedContact();
    setForm((f) => ({ ...f, address: f.address || saved.address || '' }));
    document.getElementById('order-it')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open]);
  useEffect(() => {
    if (!m?.address) return;
    setForm((f) => (f.districtId ? f : { ...f, districtId: m.address!.districtId, areaId: m.address!.areaId ?? '', address: f.address || m.address!.address }));
  }, [m?.id]);

  // The delivery charge and total for the chosen place.
  useEffect(() => {
    if (!form.districtId) return setTotals(null);
    let gone = false;
    setPricing(true);
    fetch(`${API_PUBLIC_URL}/v1/store/quotations/${encodeURIComponent(token)}/total`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ districtId: form.districtId, areaId: form.areaId || null }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<Totals>) : null))
      .then((t) => !gone && setTotals(t))
      .catch(() => !gone && setTotals(null))
      .finally(() => !gone && setPricing(false));
    return () => {
      gone = true;
    };
  }, [form.districtId, form.areaId]);

  const areas = useMemo(() => areasOf(places, form.districtId), [places, form.districtId]);
  const set = (key: keyof typeof form) => (e: Event) => {
    const value = (e.currentTarget as HTMLInputElement).value;
    setForm((f) => ({ ...f, [key]: value, ...(key === 'districtId' && { areaId: '' }) }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 sm:w-auto">
        <ShoppingBag class="size-5" /> Order this quotation
      </button>
    );
  }

  const total = totals?.total ?? null;
  const belowMinimum = wholesale && totals?.minOrderAmount != null && subtotal < totals.minOrderAmount;
  const place = async (e: Event) => {
    e.preventDefault();
    setProblem(null);
    const phone = form.phone.replace(/[\s()-]/g, '').replace(/^\+?880/, '0');
    const missing: Fields = {};
    if (form.name.trim().length < 2) missing.name = 'Enter your name';
    if (!/^0\d{9,10}$/.test(phone)) missing.phone = 'Enter a Bangladeshi number, like 01712345678';
    if (!form.districtId) missing.districtId = 'Choose your district';
    if (!form.areaId) missing.areaId = 'Choose your area';
    if (form.address.trim().length < 5) missing.address = 'Enter the full address (house, road, area)';
    setErrors(missing);
    if (Object.keys(missing).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('#order-it [aria-invalid=true]')?.focus());
      return;
    }
    if (total === null || pricing) {
      setProblem('Working out the delivery charge… please tap again in a moment.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/quotations/${encodeURIComponent(token)}/order`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone,
          email: form.email.trim(),
          districtId: form.districtId,
          areaId: form.areaId || null,
          address: form.address.trim(),
          note: form.note.trim() || null,
          paymentMethod: pay,
          expectedTotal: total,
          requestId: requestId.current,
          website: form.website,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | ({ number: number; token: string | null; payUrl?: string; payError?: string } & { error?: { code?: string; message?: string; fields?: Fields } })
        | null;
      if (!res.ok || !data || data.error) {
        const error = data?.error;
        if (error?.fields && Object.keys(error.fields).some((k) => k in form)) setErrors(error.fields);
        setProblem(error?.message ?? 'Could not place the order. Please try again.');
        // Something changed: a new attempt next time.
        requestId.current = newRequestId();
        return;
      }
      saveContact({ name: form.name.trim(), phone, email: form.email.trim() || null, address: form.address.trim() });
      if (data.payUrl) {
        location.href = data.payUrl;
        return;
      }
      location.replace(data.token ? `/checkout/thank-you/?o=${encodeURIComponent(data.token)}&placed=1${data.payError ? '&payment=error' : ''}` : '/');
    } catch {
      setProblem('No connection. Check your internet and try again; you will not be charged twice.');
    } finally {
      setSending(false);
    }
  };

  const choice = (value: 'cod' | 'online', title: string, text: string, Icon: typeof Banknote) => (
    <label class={cn('flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm', pay === value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-zinc-200')}>
      <input type="radio" name="pay" value={value} checked={pay === value} onChange={() => setPay(value)} class="mt-0.5 size-4 accent-brand-600" />
      <Icon class="mt-0.5 size-5 shrink-0 text-brand-700" />
      <span>
        <span class="block font-semibold text-zinc-900">{title}</span>
        <span class="block text-zinc-600">{text}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={place} noValidate class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-6">
      <h2 class="font-display text-xl font-bold">Order this quotation</h2>
      <p class="mt-0.5 text-sm text-zinc-500">The items and prices above. Tell us where to deliver.</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class={label}>
          Name
          <input value={form.name} onInput={set('name')} autoComplete="name" aria-invalid={!!errors.name} class={input} />
          {errors.name && <span class="mt-1 block text-sm font-normal text-red-600">{errors.name}</span>}
        </label>
        <label class={label}>
          Phone
          <input value={form.phone} onInput={set('phone')} type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} class={input} />
          {errors.phone && <span class="mt-1 block text-sm font-normal text-red-600">{errors.phone}</span>}
        </label>
        <label class={label}>
          District
          <select value={form.districtId} onChange={set('districtId')} aria-invalid={!!errors.districtId} class={input}>
            <option value="">{places ? 'Choose…' : 'Loading…'}</option>
            {places?.districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.districtId && <span class="mt-1 block text-sm font-normal text-red-600">{errors.districtId}</span>}
        </label>
        <label class={label}>
          Area / thana
          <select value={form.areaId} onChange={set('areaId')} disabled={!form.districtId} aria-invalid={!!errors.areaId} class={input}>
            <option value="">Choose…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {errors.areaId && <span class="mt-1 block text-sm font-normal text-red-600">{errors.areaId}</span>}
        </label>
      </div>
      <label class={cn(label, 'mt-4')}>
        Address
        <input value={form.address} onInput={set('address')} autoComplete="street-address" placeholder="House, road, area" aria-invalid={!!errors.address} class={input} />
        {errors.address && <span class="mt-1 block text-sm font-normal text-red-600">{errors.address}</span>}
      </label>
      <label class={cn(label, 'mt-4')}>
        Note for us <span class="font-normal text-zinc-400">(optional)</span>
        <input value={form.note} onInput={set('note')} maxLength={1000} class={input} />
      </label>
      <input name="website" value={form.website} onInput={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" class="absolute -left-[9999px] size-px opacity-0" />

      <fieldset class="mt-5">
        <legend class="text-sm font-medium text-zinc-800">How to pay</legend>
        <div class="mt-2 grid gap-2 sm:grid-cols-2">
          {choice('cod', 'Cash on delivery', wholesale ? 'Advance first, the rest when it arrives' : 'Pay when it arrives', Banknote)}
          {online && choice('online', 'Pay online now', 'bKash, Nagad, Rocket or card', CreditCard)}
        </div>
      </fieldset>

      <dl class="mt-5 space-y-1.5 rounded-xl bg-zinc-50 p-4 text-sm">
        <div class="flex justify-between">
          <dt class="text-zinc-600">Items (as quoted)</dt>
          <dd class="tabular-nums">{money(subtotal)}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-zinc-600">Delivery</dt>
          <dd class="tabular-nums">{!form.districtId ? <span class="text-zinc-400">Choose district</span> : pricing ? '…' : totals?.deliveryFee == null ? '—' : totals.deliveryFee === 0 ? 'Free' : money(totals.deliveryFee)}</dd>
        </div>
        <div class="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
          <dt>Total</dt>
          <dd class="tabular-nums" aria-live="polite">{total === null ? '—' : money(total)}</dd>
        </div>
        {wholesale && totals && totals.advance > 0 && <p class="text-xs text-zinc-500">Advance before we send: {money(totals.advance)}</p>}
      </dl>
      {belowMinimum && <p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Wholesale orders start at {money(totals!.minOrderAmount!)}. Please ask us for a bigger quotation.</p>}
      {problem && <p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{problem}</p>}
      <button type="submit" disabled={sending || belowMinimum} class="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {sending ? 'Placing your order…' : pay === 'online' ? `Order and pay${total !== null ? ` ${money(total)}` : ''}` : `Place order${total !== null ? ` · ${money(total)}` : ''}`}
      </button>
    </form>
  );
}
