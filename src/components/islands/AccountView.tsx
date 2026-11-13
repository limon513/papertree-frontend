import { useEffect, useMemo, useState } from 'preact/hooks';
import { ArrowLeft, ChevronRight, Loader2, LogOut, Mail, MapPin, Package, Pencil, Phone, Plus, RotateCcw, Star, Trash2, UserRound, X } from 'lucide-preact';
import { api, changeAccount, openSignIn, orderAgain, signOut, useMe, type Me, type SavedAddress } from '@/lib/account';
import { areasOf, loadPlaces } from '@/lib/places';
import type { Img, Places, PlacedOrder } from '@/lib/types';
import { cn, imageAt, money } from '@/lib/utils';
import { Avatar } from './AccountButtons';
import { BusinessCard } from './BusinessCard';

interface OrderRow {
  number: number;
  status: string;
  createdAt: string;
  total: number;
  itemCount: number;
  names: string[];
  images: (Img | null)[];
}
type OrderDetail = PlacedOrder;

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Placed', tone: 'bg-marigold-100 text-zinc-900' },
  confirmed: { label: 'Confirmed', tone: 'bg-sky-100 text-sky-900' },
  packed: { label: 'Packed', tone: 'bg-sky-100 text-sky-900' },
  shipped: { label: 'On the way', tone: 'bg-indigo-100 text-indigo-900' },
  delivered: { label: 'Delivered', tone: 'bg-brand-100 text-brand-900' },
  cancelled: { label: 'Cancelled', tone: 'bg-zinc-100 text-zinc-600' },
  returned: { label: 'Returned', tone: 'bg-zinc-100 text-zinc-600' },
};
const STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const card = 'rounded-2xl bg-white ring-1 ring-zinc-200';
const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const label = 'block text-sm font-medium text-zinc-800';
const primary = 'flex h-12 items-center justify-center gap-2 rounded-full bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800 disabled:opacity-50';
const quiet = 'flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-50';

function Status({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'bg-zinc-100 text-zinc-700' };
  return <span class={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', s.tone)}>{s.label}</span>;
}

/** "Order again": fills the cart and opens checkout, or says what is no longer sold. */
function OrderAgain({ load, className }: { load: () => Promise<{ variantId: number | null; quantity: number }[]>; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setNote(null);
    try {
      const { added, missing } = await orderAgain(await load());
      if (!added) return setNote('Sorry, these items are no longer available.');
      if (!missing) {
        location.href = '/checkout/';
        return;
      }
      setNote(`${missing} item${missing === 1 ? ' is' : 's are'} no longer available. The rest are in your cart.`);
    } catch {
      setNote('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <span class={className}>
      <button type="button" onClick={go} disabled={busy} class="flex h-9 items-center gap-1.5 rounded-full bg-brand-50 px-3.5 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60">
        {busy ? <Loader2 class="size-4 animate-spin" /> : <RotateCcw class="size-4" />} Order again
      </button>
      {note && (
        <span class="mt-1.5 block text-sm text-zinc-600">
          {note}{' '}
          {!note.startsWith('Sorry') && !note.startsWith('No connection') && (
            <a href="/checkout/" class="font-semibold text-brand-700">
              Go to checkout
            </a>
          )}
        </span>
      )}
    </span>
  );
}

/** "Your account": who they are, saved addresses, orders. One order opens in place (?order=100036). */
export default function AccountView() {
  const m = useMe();
  const [orders, setOrders] = useState<{ orders: OrderRow[]; total: number; page: number; pages: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const fromUrl = () => {
      const n = Number(new URLSearchParams(location.search).get('order'));
      setOpen(Number.isInteger(n) && n > 0 ? n : null);
    };
    fromUrl();
    addEventListener('popstate', fromUrl);
    return () => removeEventListener('popstate', fromUrl);
  }, []);

  const loadOrders = (page = 1) =>
    api(`/me/orders?page=${page}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: typeof orders) => d && setOrders((prev) => (page > 1 && prev ? { ...d, orders: [...prev.orders, ...d.orders] } : d)))
      .catch(() => null);

  useEffect(() => {
    if (m) void loadOrders();
    else setOrders(null);
  }, [m?.id]);

  const show = (n: number | null) => {
    history.pushState(null, '', n ? `?order=${n}` : location.pathname);
    setOpen(n);
    scrollTo({ top: 0 });
  };

  // From a "wholesale price for businesses" link: the business form opens after signing in.
  const forBusiness = typeof location !== 'undefined' && new URLSearchParams(location.search).has('business');
  if (m === undefined) return <div class="mt-6 h-72 animate-pulse rounded-3xl bg-zinc-100" aria-busy="true" />;

  if (!m) {
    return (
      <div class="mx-auto mt-8 max-w-md rounded-3xl bg-zinc-50 px-6 py-12 text-center">
        <UserRound class="mx-auto size-10 text-zinc-400" />
        <h2 class="mt-3 font-display text-xl font-bold">{forBusiness ? 'Sign in to ask for wholesale prices' : 'Sign in to see your orders'}</h2>
        <p class="mt-1 text-sm text-zinc-500">With your phone number or Google. No password needed.</p>
        <button type="button" onClick={() => openSignIn()} class={cn(primary, 'mx-auto mt-5')}>
          Sign in
        </button>
      </div>
    );
  }

  if (open) return <OrderView number={open} back={() => show(null)} />;

  const orderItems = (n: number) =>
    api(`/me/orders/${n}`)
      .then((r) => (r.ok ? (r.json() as Promise<OrderDetail>) : Promise.reject(new Error(String(r.status)))))
      .then((o) => o.items.map((i) => ({ variantId: i.variantId ?? null, quantity: i.quantity })));

  return (
    <div class="mt-5 grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
      <Profile m={m} />

      <section class="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <h2 class="font-display text-xl font-bold">Your orders</h2>
        {!orders ? (
          <div class="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} class="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
        ) : !orders.orders.length ? (
          <div class="mt-3 rounded-2xl bg-zinc-50 px-6 py-10 text-center">
            <Package class="mx-auto size-9 text-zinc-400" />
            <p class="mt-2 font-semibold">No orders yet</p>
            <a href="/" class={cn(primary, 'mx-auto mt-4 inline-flex h-11 text-sm')}>
              Start shopping
            </a>
          </div>
        ) : (
          <>
            <ul class="mt-3 space-y-3">
              {orders.orders.map((o) => (
                <li key={o.number} class={cn(card, 'p-3 hover:ring-brand-300 sm:p-4')}>
                  <a href={`?order=${o.number}`} onClick={(e) => (e.preventDefault(), show(o.number))} class="flex items-center gap-3">
                    <span class="flex shrink-0 -space-x-3">
                      {o.images.slice(0, 3).map((img, i) => (
                        <span key={i} class="size-12 rounded-xl bg-zinc-50 ring-2 ring-white">
                          {img && <img src={imageAt(img, 160)} alt="" width={48} height={48} loading="lazy" class="size-full object-contain p-1" />}
                        </span>
                      ))}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="flex flex-wrap items-center gap-2">
                        <span class="font-semibold">#{o.number}</span>
                        <Status status={o.status} />
                      </span>
                      <span class="mt-0.5 block truncate text-sm text-zinc-600">{o.names.join(', ')}</span>
                      <span class="block text-xs text-zinc-500">
                        {day(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span class="text-right">
                      <span class="block font-semibold tabular-nums">{money(o.total)}</span>
                      <ChevronRight class="ml-auto size-4 text-zinc-400" />
                    </span>
                  </a>
                  <OrderAgain load={() => orderItems(o.number)} className="mt-2 block border-t border-zinc-100 pt-2" />
                </li>
              ))}
            </ul>
            {orders.page < orders.pages && (
              <button type="button" onClick={() => loadOrders(orders.page + 1)} class="mt-4 h-11 w-full rounded-full text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
                Show older orders
              </button>
            )}
          </>
        )}
      </section>

      <Addresses m={m} />
      <BusinessCard m={m} />
    </div>
  );
}

// ---- Profile ----

function Profile({ m }: { m: Me }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  const [email, setEmail] = useState(m.email ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'save' | 'all' | null>(null);

  const save = async (e: Event) => {
    e.preventDefault();
    setBusy('save');
    const r = await changeAccount('/me', { name: name.trim(), email: email.trim() }, 'PATCH').catch(() => ({ ok: false as const, message: 'No connection. Please try again.', fields: {} }));
    setBusy(null);
    if (r.ok) return setEditing(false);
    setErrors(Object.keys(r.fields).length ? r.fields : { form: r.message });
  };

  const everywhere = async () => {
    if (!confirm('Sign out on every phone and computer signed in to your account?')) return;
    setBusy('all');
    await api('/auth/logout-all', {}).catch(() => null);
    await signOut();
    location.href = '/';
  };

  return (
    <section class={cn(card, 'p-5')}>
      <div class="flex items-center gap-3">
        <Avatar name={m.name} url={m.avatarUrl} className="size-14 text-xl" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-display text-lg font-bold">{m.name}</p>
          {m.business && <p class="text-xs font-semibold text-brand-700">Business account</p>}
        </div>
        {!editing && (
          <button type="button" onClick={() => (setName(m.name), setEmail(m.email ?? ''), setErrors({}), setEditing(true))} aria-label="Change name or email" class="rounded-full p-2 text-zinc-500 hover:bg-zinc-100">
            <Pencil class="size-4" />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} noValidate class="mt-4 space-y-3">
          <label class={label}>
            Name
            <input value={name} onInput={(e) => setName(e.currentTarget.value)} autocomplete="name" maxLength={100} class={input} aria-invalid={!!errors.name} />
            {errors.name && <p class="mt-1 text-sm text-red-600">{errors.name}</p>}
          </label>
          <label class={label}>
            Email <span class="font-normal text-zinc-500">(for order updates)</span>
            <input value={email} onInput={(e) => setEmail(e.currentTarget.value)} type="email" autocomplete="email" maxLength={200} class={input} aria-invalid={!!errors.email} />
            {errors.email && <p class="mt-1 text-sm text-red-600">{errors.email}</p>}
          </label>
          <p class="text-xs text-zinc-500">To change your phone number ({m.phone}), please call us.</p>
          {errors.form && <p class="text-sm text-red-600">{errors.form}</p>}
          <div class="flex gap-2">
            <button type="submit" disabled={!!busy} class={cn(primary, 'h-11 flex-1 text-sm')}>
              {busy === 'save' && <Loader2 class="size-4 animate-spin" />} Save
            </button>
            <button type="button" onClick={() => setEditing(false)} class={cn(quiet, 'flex-1')}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <ul class="mt-4 space-y-2 text-sm text-zinc-700">
          <li class="flex items-center gap-2">
            <Phone class="size-4 text-zinc-400" /> {m.phone}
          </li>
          <li class="flex items-center gap-2">
            <Mail class="size-4 text-zinc-400" />
            {m.email ? <span class="truncate">{m.email}</span> : <span class="text-zinc-400">No email added</span>}
          </li>
          {m.google && <li class="text-xs text-zinc-500">Google sign-in is on for this account.</li>}
        </ul>
      )}

      {!editing && (
        <div class="mt-5 space-y-2">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              location.href = '/';
            }}
            class={cn(quiet, 'w-full')}
          >
            <LogOut class="size-4" /> Sign out
          </button>
          <button type="button" onClick={everywhere} disabled={!!busy} class="w-full py-1 text-center text-xs font-medium text-zinc-500 hover:text-zinc-800">
            {busy === 'all' ? 'Signing out…' : 'Sign out on all devices'}
          </button>
        </div>
      )}
    </section>
  );
}

// ---- Saved addresses ----

function Addresses({ m }: { m: Me }) {
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (id: number, path: string, method: 'POST' | 'DELETE') => {
    setBusy(id);
    await changeAccount(path, method === 'POST' ? {} : undefined, method).catch(() => null);
    setBusy(null);
  };

  return (
    <section class="lg:col-start-1">
      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-bold">Addresses</h2>
        <button type="button" onClick={() => setEditing('new')} class="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          <Plus class="size-4" /> Add
        </button>
      </div>
      {!m.addresses.length ? (
        <p class="mt-3 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">Addresses you order to are saved here, so checkout is quicker next time.</p>
      ) : (
        <ul class="mt-3 space-y-3">
          {m.addresses.map((a) => (
            <li key={a.id} class={cn(card, 'p-4', a.isDefault && 'ring-2 ring-brand-500')}>
              <div class="flex items-start gap-2">
                <MapPin class="mt-0.5 size-4 shrink-0 text-brand-600" />
                <div class="min-w-0 flex-1 text-sm">
                  <p class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold text-zinc-900">{a.label || 'Address'}</span>
                    {a.isDefault && <span class="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">Default</span>}
                  </p>
                  {(a.recipientName || a.recipientPhone) && <p class="text-zinc-600">{[a.recipientName, a.recipientPhone].filter(Boolean).join(' · ')}</p>}
                  <p class="text-zinc-700">{a.address}</p>
                  <p class="text-zinc-500">{[a.areaName, a.districtName].filter(Boolean).join(', ')}</p>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setEditing(a)} class="flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50">
                  <Pencil class="size-3.5" /> Edit
                </button>
                {!a.isDefault && (
                  <button type="button" onClick={() => act(a.id, `/me/addresses/${a.id}/default`, 'POST')} disabled={busy === a.id} class="flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50">
                    <Star class="size-3.5" /> Make default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => confirm(`Remove “${a.label || a.address}”?`) && act(a.id, `/me/addresses/${a.id}`, 'DELETE')}
                  disabled={busy === a.id}
                  aria-label={`Remove ${a.label || 'address'}`}
                  class="ml-auto flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <Trash2 class="size-3.5" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <AddressDialog address={editing === 'new' ? null : editing} close={() => setEditing(null)} />}
    </section>
  );
}

const LABELS = ['Home', 'Office', 'Shop'];

function AddressDialog({ address, close }: { address: SavedAddress | null; close: () => void }) {
  const [places, setPlaces] = useState<Places | null>(null);
  const [f, setF] = useState({
    label: address?.label ?? '',
    districtId: address?.districtId ?? '',
    areaId: address?.areaId ?? '',
    address: address?.address ?? '',
    recipientName: address?.recipientName ?? '',
    recipientPhone: address?.recipientPhone ?? '',
    isDefault: address?.isDefault ?? false,
  });
  const [someoneElse, setSomeoneElse] = useState(!!(address?.recipientName || address?.recipientPhone));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const areas = useMemo(() => areasOf(places, f.districtId), [places, f.districtId]);

  useEffect(() => {
    loadPlaces().then(setPlaces, () => setPlaces(null));
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);

  const set = (key: keyof typeof f) => (e: Event) => {
    const value = (e.currentTarget as HTMLInputElement).value;
    setF((x) => ({ ...x, [key]: value, ...(key === 'districtId' && { areaId: '' }) }));
    setErrors((x) => ({ ...x, [key]: '' }));
  };

  const save = async (e: Event) => {
    e.preventDefault();
    const missing: Record<string, string> = {};
    if (!f.districtId) missing.districtId = 'Choose a district';
    if (!f.areaId) missing.areaId = 'Choose an area';
    if (f.address.trim().length < 5) missing.address = 'Enter the full address (house, road, area)';
    if (Object.keys(missing).length) return setErrors(missing);
    setBusy(true);
    const body = {
      label: f.label.trim() || null,
      districtId: f.districtId,
      areaId: f.areaId || null,
      address: f.address.trim(),
      recipientName: someoneElse ? f.recipientName.trim() || null : null,
      recipientPhone: someoneElse ? f.recipientPhone.trim() || null : null,
      isDefault: f.isDefault,
    };
    const r = await (address ? changeAccount(`/me/addresses/${address.id}`, body, 'PUT') : changeAccount('/me/addresses', body)).catch(() => ({
      ok: false as const,
      message: 'No connection. Please try again.',
      fields: {} as Record<string, string>,
    }));
    setBusy(false);
    if (r.ok) return close();
    setErrors(Object.keys(r.fields).length ? r.fields : { form: r.message });
  };

  const err = (k: string) => errors[k] && <p class="mt-1 text-sm text-red-600">{errors[k]}</p>;

  return (
    <div class="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={address ? 'Change address' : 'New address'}
        onClick={(e) => e.stopPropagation()}
        class="max-h-[92dvh] w-full max-w-md animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:animate-fade-in sm:rounded-3xl"
      >
      <form onSubmit={save} noValidate>
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold">{address ? 'Change address' : 'New address'}</h2>
          <button type="button" onClick={close} aria-label="Close" class="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X class="size-5" />
          </button>
        </div>
        <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Name this address">
          {LABELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={f.label === l}
              onClick={() => setF((x) => ({ ...x, label: x.label === l ? '' : l }))}
              class="h-9 rounded-full px-4 text-sm font-medium ring-1 ring-zinc-300 aria-pressed:bg-brand-700 aria-pressed:text-white aria-pressed:ring-brand-700"
            >
              {l}
            </button>
          ))}
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <label class={label}>
            District
            <select value={f.districtId} onChange={set('districtId')} class={input} aria-invalid={!!errors.districtId}>
              <option value="">{places ? 'Choose' : 'Loading…'}</option>
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
            <select value={f.areaId} onChange={set('areaId')} disabled={!f.districtId} class={cn(input, 'disabled:bg-zinc-50')} aria-invalid={!!errors.areaId}>
              <option value="">Choose</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {err('areaId')}
          </label>
        </div>
        <label class={cn(label, 'mt-3')}>
          Address
          <textarea value={f.address} onInput={set('address')} rows={2} maxLength={500} autocomplete="street-address" placeholder="House, road, block, landmark" class={cn(input, 'h-auto py-2.5')} aria-invalid={!!errors.address} />
          {err('address')}
        </label>
        <label class="mt-3 flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={someoneElse} onChange={(e) => setSomeoneElse(e.currentTarget.checked)} class="size-4 accent-brand-700" />
          Someone else receives it here
        </label>
        {someoneElse && (
          <div class="mt-3 grid grid-cols-2 gap-3">
            <label class={label}>
              Their name
              <input value={f.recipientName} onInput={set('recipientName')} maxLength={100} class={input} aria-invalid={!!errors.recipientName} />
              {err('recipientName')}
            </label>
            <label class={label}>
              Their phone
              <input value={f.recipientPhone} onInput={set('recipientPhone')} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" maxLength={20} class={input} aria-invalid={!!errors.recipientPhone} />
              {err('recipientPhone')}
            </label>
          </div>
        )}
        {!address?.isDefault && (
          <label class="mt-3 flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={f.isDefault} onChange={(e) => setF((x) => ({ ...x, isDefault: e.currentTarget.checked }))} class="size-4 accent-brand-700" />
            Use this address first at checkout
          </label>
        )}
        {errors.form && <p class="mt-3 text-sm text-red-600">{errors.form}</p>}
        <button type="submit" disabled={busy} class={cn(primary, 'mt-5 w-full')}>
          {busy && <Loader2 class="size-5 animate-spin" />} Save address
        </button>
      </form>
      </div>
    </div>
  );
}

// ---- One order ----

function OrderView({ number, back }: { number: number; back: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null | undefined>(undefined);
  useEffect(() => {
    setOrder(undefined);
    api(`/me/orders/${number}`)
      .then((r) => (r.ok ? (r.json() as Promise<OrderDetail>) : null))
      .then(setOrder, () => setOrder(null));
  }, [number]);

  const head = (
    <button type="button" onClick={back} class="mt-4 flex items-center gap-1 text-sm font-semibold text-brand-700">
      <ArrowLeft class="size-4" /> All orders
    </button>
  );
  if (order === undefined) return <>{head}<div class="mt-4 h-96 animate-pulse rounded-3xl bg-zinc-100" aria-busy="true" /></>;
  if (!order) return <>{head}<p class="mt-6 text-zinc-600">We couldn’t find that order.</p></>;

  const step = STEPS.indexOf(order.status);
  const place = [order.address, order.areaName, order.districtName].filter(Boolean).join(', ');
  return (
    <div class="mx-auto max-w-2xl">
      {head}
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <h2 class="font-display text-2xl font-bold">Order #{order.number}</h2>
        <Status status={order.status} />
      </div>
      <p class="text-sm text-zinc-500">Placed {day(order.createdAt)}</p>

      {step >= 0 && (
        <ol class="mt-5 grid grid-cols-5 gap-1" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} class="text-center">
              <span class={cn('block h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-zinc-200')} />
              <span class={cn('mt-1.5 block text-[11px] sm:text-xs', i <= step ? 'font-semibold text-brand-800' : 'text-zinc-400')}>{STATUS[s]!.label}</span>
            </li>
          ))}
        </ol>
      )}

      <section class={cn(card, 'mt-5')}>
        <ul class="divide-y divide-zinc-100 px-5">
          {order.items.map((i, k) => (
            <li key={k} class="flex items-center gap-3 py-3">
              <span class="size-12 shrink-0 rounded-lg bg-zinc-50">{i.image && <img src={imageAt(i.image, 160)} alt="" width={48} height={48} class="size-full object-contain p-1" />}</span>
              <span class="min-w-0 flex-1 text-sm">
                <span class="block text-zinc-900">{i.name}</span>
                <span class="text-zinc-500">
                  {i.variantLabel && <>{i.variantLabel} · </>}
                  {i.quantity} × {money(i.unitPrice)}
                  {i.bulkPercent ? <span class="text-brand-700"> · {i.bulkPercent}% bulk discount</span> : null}
                </span>
              </span>
              <span class="text-sm font-medium tabular-nums">{money(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl class="space-y-1.5 border-t border-zinc-100 px-5 py-4 text-sm">
          <div class="flex justify-between"><dt class="text-zinc-600">Items</dt><dd class="tabular-nums">{money(order.subtotal)}</dd></div>
          {order.bulkDiscount ? <p class="text-right text-xs text-brand-700">You saved {money(order.bulkDiscount)} with bulk discounts</p> : null}
          {(order.discount ?? 0) > 0 && <div class="flex justify-between"><dt class="text-zinc-600">Discount</dt><dd class="tabular-nums">−{money(order.discount ?? 0)}</dd></div>}
          <div class="flex justify-between"><dt class="text-zinc-600">Delivery</dt><dd class="tabular-nums">{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</dd></div>
          {order.couponDiscount ? <div class="flex justify-between text-brand-700"><dt>Coupon <span class="font-mono">{order.couponCode}</span></dt><dd class="tabular-nums">−{money(order.couponDiscount)}</dd></div> : null}
          <div class="flex justify-between pt-1.5 text-base font-bold"><dt>Total{order.paymentMethod === 'cod' ? ' (cash on delivery)' : ''}</dt><dd class="tabular-nums">{money(order.total)}</dd></div>
        </dl>
      </section>

      <OrderAgain load={async () => order.items.map((i) => ({ variantId: i.variantId ?? null, quantity: i.quantity }))} className="mt-4 block" />

      <section class={cn(card, 'mt-4 p-5 text-sm')}>
        <h3 class="font-semibold">Delivery to</h3>
        <p class="mt-1 text-zinc-700">{order.customerName} · {order.phone}</p>
        <p class="text-zinc-700">{place}</p>
        {order.deliveryTime && <p class="mt-1 text-zinc-500">Usually arrives in {order.deliveryTime}.</p>}
        {order.status === 'shipped' && (order.courier || order.trackingCode) && (
          <p class="mt-2 text-zinc-700">
            On the way{order.courier && <> with <strong>{order.courier}</strong></>}
            {order.trackingCode && <>, tracking code <strong class="font-mono select-all">{order.trackingCode}</strong></>}
          </p>
        )}
      </section>
    </div>
  );
}
