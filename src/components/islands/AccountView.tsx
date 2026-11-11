import { useEffect, useState } from 'preact/hooks';
import { ArrowLeft, ChevronRight, LogOut, Mail, MapPin, Package, Phone, UserRound } from 'lucide-preact';
import { api, openSignIn, signOut, useMe } from '@/lib/account';
import type { Img, PlacedOrder } from '@/lib/types';
import { cn, imageAt, money } from '@/lib/utils';
import { Avatar } from './AccountButtons';

interface OrderRow {
  number: number;
  status: string;
  createdAt: string;
  total: number;
  itemCount: number;
  names: string[];
  images: (Img | null)[];
}

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

function Status({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'bg-zinc-100 text-zinc-700' };
  return <span class={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', s.tone)}>{s.label}</span>;
}

const card = 'rounded-2xl bg-white ring-1 ring-zinc-200';

/** "Your account": who they are, their orders, sign out. One order opens in place (?order=100036). */
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

  if (m === undefined) return <div class="mt-6 h-72 animate-pulse rounded-3xl bg-zinc-100" aria-busy="true" />;

  if (!m) {
    return (
      <div class="mx-auto mt-8 max-w-md rounded-3xl bg-zinc-50 px-6 py-12 text-center">
        <UserRound class="mx-auto size-10 text-zinc-400" />
        <h2 class="mt-3 font-display text-xl font-bold">Sign in to see your orders</h2>
        <p class="mt-1 text-sm text-zinc-500">With your phone number or Google. No password needed.</p>
        <button type="button" onClick={() => openSignIn()} class="mt-5 h-12 rounded-full bg-brand-700 px-6 font-semibold text-white hover:bg-brand-800">
          Sign in
        </button>
      </div>
    );
  }

  if (open) return <OrderDetail number={open} back={() => show(null)} />;

  return (
    <div class="mt-5 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
      <section class={cn(card, 'p-5')}>
        <div class="flex items-center gap-3">
          <Avatar name={m.name} url={m.avatarUrl} className="size-14 text-xl" />
          <div class="min-w-0">
            <p class="truncate font-display text-lg font-bold">{m.name}</p>
            {m.business && <p class="text-xs font-semibold text-brand-700">Business account</p>}
          </div>
        </div>
        <ul class="mt-4 space-y-2 text-sm text-zinc-700">
          <li class="flex items-center gap-2">
            <Phone class="size-4 text-zinc-400" /> {m.phone}
          </li>
          {m.email && (
            <li class="flex items-center gap-2">
              <Mail class="size-4 text-zinc-400" /> <span class="truncate">{m.email}</span>
            </li>
          )}
          {m.address && (
            <li class="flex items-start gap-2">
              <MapPin class="mt-0.5 size-4 shrink-0 text-zinc-400" /> {m.address.address}
            </li>
          )}
          {m.google && <li class="text-xs text-zinc-500">Google sign-in is on for this account.</li>}
        </ul>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            location.href = '/';
          }}
          class="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
        >
          <LogOut class="size-4" /> Sign out
        </button>
      </section>

      <section>
        <h2 class="font-display text-xl font-bold">Your orders</h2>
        {!orders ? (
          <div class="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} class="h-24 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
        ) : !orders.orders.length ? (
          <div class="mt-3 rounded-2xl bg-zinc-50 px-6 py-10 text-center">
            <Package class="mx-auto size-9 text-zinc-400" />
            <p class="mt-2 font-semibold">No orders yet</p>
            <a href="/" class="mt-4 inline-flex h-11 items-center rounded-full bg-brand-700 px-5 text-sm font-semibold text-white">
              Start shopping
            </a>
          </div>
        ) : (
          <>
            <ul class="mt-3 space-y-3">
              {orders.orders.map((o) => (
                <li key={o.number}>
                  <a
                    href={`?order=${o.number}`}
                    onClick={(e) => (e.preventDefault(), show(o.number))}
                    class={cn(card, 'flex items-center gap-3 p-3 hover:ring-brand-300 sm:p-4')}
                  >
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
    </div>
  );
}

function OrderDetail({ number, back }: { number: number; back: () => void }) {
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);
  useEffect(() => {
    setOrder(undefined);
    api(`/me/orders/${number}`)
      .then((r) => (r.ok ? (r.json() as Promise<PlacedOrder>) : null))
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
                </span>
              </span>
              <span class="text-sm font-medium tabular-nums">{money(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl class="space-y-1.5 border-t border-zinc-100 px-5 py-4 text-sm">
          <div class="flex justify-between"><dt class="text-zinc-600">Items</dt><dd class="tabular-nums">{money(order.subtotal)}</dd></div>
          <div class="flex justify-between"><dt class="text-zinc-600">Delivery</dt><dd class="tabular-nums">{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</dd></div>
          <div class="flex justify-between pt-1.5 text-base font-bold"><dt>Total{order.paymentMethod === 'cod' ? ' (cash on delivery)' : ''}</dt><dd class="tabular-nums">{money(order.total)}</dd></div>
        </dl>
      </section>

      <section class={cn(card, 'mt-4 p-5 text-sm')}>
        <h3 class="font-semibold">Delivery to</h3>
        <p class="mt-1 text-zinc-700">{order.customerName} · {order.phone}</p>
        <p class="text-zinc-700">{place}</p>
        {order.deliveryTime && <p class="mt-1 text-zinc-500">Usually arrives in {order.deliveryTime}.</p>}
      </section>
    </div>
  );
}
