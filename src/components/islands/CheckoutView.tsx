import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { AlertCircle, ArrowLeft, Banknote, Check, Info, Lock, Plus, ShoppingBag } from 'lucide-preact';
import { cart, countOf, subtotalOf, useCart } from '@/lib/cart';
import { useCartCheck } from '@/lib/cart-check';
import { saveContact, savedContact } from '@/lib/contact';
import { areasOf, loadPlaces } from '@/lib/places';
import type { Places } from '@/lib/types';
import { API_PUBLIC_URL, cn, imageAt, money } from '@/lib/utils';

type Fields = Partial<Record<'name' | 'phone' | 'email' | 'districtId' | 'areaId' | 'address' | 'note', string>>;

/** A new id for this checkout attempt (the shop places one order per id, whatever happens to the connection). */
const newRequestId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const label = 'block text-sm font-medium text-zinc-800';

/**
 * Checkout on one page: who, where, how to pay, and the order. Cash on delivery. Details are
 * remembered on this device, so the next order is a couple of taps. Prices, stock and delivery are
 * worked out again by the shop when the order is placed.
 */
export default function CheckoutView() {
  const s = useCart();
  const [ready, setReady] = useState(false);
  const [places, setPlaces] = useState<Places | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', note: '', website: '' });
  const [showEmail, setShowEmail] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [errors, setErrors] = useState<Fields>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const requestId = useRef(newRequestId());
  const { check, notes, checking, recheck } = useCartCheck(ready);

  useEffect(() => {
    const saved = savedContact();
    setForm((f) => ({ ...f, name: saved.name ?? '', phone: saved.phone ?? '', email: saved.email ?? '', address: saved.address ?? '' }));
    if (saved.email) setShowEmail(true);
    loadPlaces().then(setPlaces, () => setPlaces(null));
    setReady(true);
  }, []);

  const districtId = s.deliverTo?.districtId ?? '';
  const areaId = s.deliverTo?.areaId ?? '';
  const areas = useMemo(() => areasOf(places, districtId), [places, districtId]);
  const setPlace = (nextDistrict: string, nextArea: string) => {
    const district = places?.districts.find((d) => d.id === nextDistrict);
    if (!district) return cart.setDeliverTo(null);
    const area = areasOf(places, nextDistrict).find((a) => a.id === nextArea);
    cart.setDeliverTo({ districtId: nextDistrict, areaId: area?.id ?? null, label: area ? `${area.name}, ${district.name}` : district.name });
  };
  const set = (key: keyof typeof form) => (e: Event) => {
    setForm((f) => ({ ...f, [key]: (e.currentTarget as HTMLInputElement).value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  if (!ready) return <div class="mt-6 h-96 animate-pulse rounded-3xl bg-zinc-100" aria-busy="true" />;
  if (!s.items.length) {
    return (
      <div class="mt-6 flex flex-col items-center rounded-3xl bg-zinc-50 px-6 py-14 text-center">
        <ShoppingBag class="size-10 text-zinc-400" />
        <p class="mt-3 font-display text-xl font-bold">Your cart is empty</p>
        <p class="mt-1 text-sm text-zinc-500">Add something first, then come back here to order.</p>
        <a href="/" class="mt-5 flex h-11 items-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white">Start shopping</a>
      </div>
    );
  }

  const subtotal = check?.subtotal ?? subtotalOf(s);
  const fee = s.deliverTo && check?.delivery ? check.delivery.fee : null;
  const total = subtotal + (fee ?? 0);
  // The total is known once the shop has priced the cart for this area.
  const priced = !!check && fee !== null && !checking;

  const place = async (e: Event) => {
    e.preventDefault();
    setProblem(null);
    const phone = form.phone.replace(/[\s()-]/g, '').replace(/^\+?880/, '0');
    const missing: Fields = {};
    if (form.name.trim().length < 2) missing.name = 'Enter your name';
    if (!/^0\d{9,10}$/.test(phone)) missing.phone = 'Enter a Bangladeshi number, like 01712345678';
    if (!districtId) missing.districtId = 'Choose your district';
    if (!areaId) missing.areaId = 'Choose your area';
    if (form.address.trim().length < 5) missing.address = 'Enter the full address (house, road, area)';
    setErrors(missing);
    if (Object.keys(missing).length) {
      // After the page has drawn the red boxes: the cursor goes to the first one.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form [aria-invalid=true]')?.focus());
      return;
    }
    if (!priced) {
      setProblem('One moment, we are working out the delivery charge. Tap “Place order” again in a second.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone,
          email: showEmail ? form.email.trim() : '',
          districtId,
          areaId: areaId || null,
          address: form.address.trim(),
          note: showNote ? form.note.trim() : '',
          items: s.items.map((i) => ({ variantId: i.variantId, quantity: Math.min(i.quantity, 9999) })),
          paymentMethod: 'cod',
          expectedTotal: total,
          requestId: requestId.current,
          website: form.website,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { number: number; token: string | null }
        | { error?: { code?: string; message?: string; fields?: Record<string, string> } }
        | null;
      if (res.ok && data && 'number' in data) {
        saveContact({ name: form.name.trim(), phone, email: showEmail ? form.email.trim() || null : null, address: form.address.trim() });
        cart.clear();
        location.replace(data.token ? `/checkout/thank-you/?o=${encodeURIComponent(data.token)}` : '/');
        return;
      }
      const error = data && 'error' in data ? data.error : undefined;
      const fields = error?.fields ?? {};
      if (error?.code === 'PRICE_CHANGED' || Object.keys(fields).some((k) => k.startsWith('items.'))) {
        // Prices or stock changed: show the cart as it is now and let the shopper look before ordering.
        setProblem(error?.message ?? 'Something in your cart changed. Please check and place the order again.');
        recheck();
      } else if (Object.keys(fields).length) {
        setErrors(fields as Fields);
      } else {
        setProblem(error?.message ?? 'The order could not be placed. Please try again.');
      }
    } catch {
      // The connection dropped: trying again is safe, the same attempt never makes two orders.
      setProblem('No connection. Check your internet and tap “Place order” again; you will not be charged twice.');
    } finally {
      setSending(false);
    }
  };

  const err = (key: keyof Fields) => errors[key] && <p class="mt-1 text-sm text-red-600">{errors[key]}</p>;

  return (
    <form onSubmit={place} noValidate class="mt-5 grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
      <div class="space-y-5">
        {/* Who */}
        <section class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5">
          <h2 class="font-display text-lg font-bold">Your details</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <label class={label}>
              Name
              <input value={form.name} onInput={set('name')} autocomplete="name" maxLength={100} class={input} aria-invalid={!!errors.name} />
              {err('name')}
            </label>
            <label class={label}>
              Phone
              <input value={form.phone} onInput={set('phone')} type="tel" inputMode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" maxLength={20} class={input} aria-invalid={!!errors.phone} />
              {err('phone')}
            </label>
          </div>
          <p class="mt-2 text-xs text-zinc-500">We call this number to confirm your order.</p>
          {showEmail ? (
            <label class={cn(label, 'mt-4')}>
              Email <span class="font-normal text-zinc-500">(for order updates)</span>
              <input value={form.email} onInput={set('email')} type="email" autocomplete="email" maxLength={200} class={input} aria-invalid={!!errors.email} />
              {err('email')}
            </label>
          ) : (
            <button type="button" onClick={() => setShowEmail(true)} class="mt-3 flex items-center gap-1 text-sm font-medium text-brand-700">
              <Plus class="size-4" /> Add email for order updates
            </button>
          )}
        </section>

        {/* Where */}
        <section class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5">
          <h2 class="font-display text-lg font-bold">Delivery address</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <label class={label}>
              District
              <select value={districtId} onChange={(e) => (setPlace(e.currentTarget.value, ''), setErrors((x) => ({ ...x, districtId: undefined })))} class={input} aria-invalid={!!errors.districtId}>
                <option value="">{places ? 'Choose your district' : 'Loading…'}</option>
                {places?.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {err('districtId')}
            </label>
            <label class={label}>
              Area / thana
              <select value={areaId} onChange={(e) => (setPlace(districtId, e.currentTarget.value), setErrors((x) => ({ ...x, areaId: undefined })))} disabled={!districtId} class={cn(input, 'disabled:bg-zinc-50')} aria-invalid={!!errors.areaId}>
                <option value="">Choose your area</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.city ? ' (Dhaka City)' : ''}
                  </option>
                ))}
              </select>
              {err('areaId')}
            </label>
          </div>
          <label class={cn(label, 'mt-4')}>
            Address
            <textarea
              value={form.address}
              onInput={set('address')}
              rows={2}
              maxLength={500}
              autocomplete="street-address"
              placeholder="House, road, block, landmark"
              class={cn(input, 'h-auto py-2.5')}
              aria-invalid={!!errors.address}
            />
            {err('address')}
          </label>
          {showNote ? (
            <label class={cn(label, 'mt-4')}>
              Note <span class="font-normal text-zinc-500">(optional)</span>
              <textarea value={form.note} onInput={set('note')} rows={2} maxLength={1000} placeholder="Best time to call, gift message…" class={cn(input, 'h-auto py-2.5')} />
            </label>
          ) : (
            <button type="button" onClick={() => setShowNote(true)} class="mt-3 flex items-center gap-1 text-sm font-medium text-brand-700">
              <Plus class="size-4" /> Add a note
            </button>
          )}
          {/* Only bots fill this box (hidden from people). */}
          <input name="website" value={form.website} onInput={set('website')} tabIndex={-1} autocomplete="off" aria-hidden="true" class="absolute -left-[9999px] size-px opacity-0" />
        </section>

        {/* Pay */}
        <section class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5">
          <h2 class="font-display text-lg font-bold">Payment</h2>
          <label class="mt-3 flex cursor-pointer items-center gap-3 rounded-xl p-3.5 ring-2 ring-brand-600">
            <input type="radio" name="payment" checked readOnly class="size-4 accent-brand-700" />
            <Banknote class="size-5 text-brand-700" />
            <span class="flex-1">
              <span class="block font-medium text-zinc-900">Cash on delivery</span>
              <span class="block text-sm text-zinc-500">Pay when your order arrives</span>
            </span>
          </label>
        </section>
      </div>

      {/* The order */}
      <aside class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5 lg:sticky lg:top-36" aria-label="Your order">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-bold">Your order ({countOf(s)})</h2>
          <a href="/cart/" class="flex items-center gap-1 text-sm font-medium text-brand-700">
            <ArrowLeft class="size-4" /> Edit cart
          </a>
        </div>
        {notes.length > 0 && (
          <ul class="mt-3 space-y-1 rounded-xl bg-marigold-50 px-3 py-2 text-sm text-zinc-700 ring-1 ring-marigold-200" role="status">
            {notes.map((n) => (
              <li key={n} class="flex gap-2">
                <Info class="mt-0.5 size-4 shrink-0 text-marigold-700" /> {n}
              </li>
            ))}
          </ul>
        )}
        <ul class="mt-3 max-h-72 divide-y divide-zinc-100 overflow-y-auto">
          {s.items.map((i) => (
            <li key={i.variantId} class="flex items-center gap-3 py-2.5">
              <span class="relative size-12 shrink-0 rounded-lg bg-zinc-50">
                {i.image && <img src={imageAt(i.image, 160)} alt="" width="48" height="48" class="size-full object-contain p-1" />}
                <span class="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-700 px-1 text-[11px] font-bold text-white">{i.quantity}</span>
              </span>
              <span class="min-w-0 flex-1 text-sm">
                <span class="line-clamp-2 text-zinc-800">{i.name}</span>
                {i.variantLabel && <span class="block text-xs text-zinc-500">{i.variantLabel}</span>}
              </span>
              <span class="text-sm font-medium tabular-nums">{money(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl class="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-zinc-600">Items</dt>
            <dd class="font-medium tabular-nums">{money(subtotal)}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-zinc-600">
              Delivery{check?.delivery?.deliveryTime && s.deliverTo ? <span class="text-zinc-400"> · {check.delivery.deliveryTime}</span> : null}
            </dt>
            <dd class="font-medium tabular-nums">{!s.deliverTo ? <span class="text-zinc-400">Choose your area</span> : fee === null ? '…' : fee === 0 ? <span class="text-brand-700">Free</span> : money(fee)}</dd>
          </div>
          <div class="flex items-baseline justify-between border-t border-zinc-100 pt-3">
            <dt class="font-semibold text-zinc-900">Total</dt>
            <dd class="text-2xl font-bold tabular-nums" aria-live="polite">
              {money(total)}
            </dd>
          </div>
        </dl>

        {problem && (
          <p class="mt-3 flex gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
            <AlertCircle class="mt-0.5 size-4 shrink-0" /> {problem}
          </p>
        )}

        {/* Place order: pinned to the bottom of the screen on phones. */}
        <div data-buy-bar class="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
          <button
            type="submit"
            disabled={sending}
            class="flex h-13 w-full items-center justify-between gap-3 rounded-full bg-brand-700 px-5 py-3.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-70"
          >
            <span class="flex items-center gap-2">
              {sending ? 'Placing your order…' : (
                <>
                  <Check class="size-5" /> Place order
                </>
              )}
            </span>
            <span class="tabular-nums">{priced ? money(total) : s.deliverTo ? '…' : ''}</span>
          </button>
        </div>
        <p class="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <Lock class="size-3.5" /> We call to confirm before sending. No advance payment.
        </p>
      </aside>
    </form>
  );
}
