import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { cart, loadSaved } from './cart';
import type { CartCheck } from './types';
import { API_PUBLIC_URL } from './utils';

/**
 * The signed-in shopper. The sign-in itself is an httpOnly cookie the browser sends to the shop; this
 * only mirrors who it is. A small copy is kept on this device so the header shows the right picture at
 * once, then it is checked with the shop.
 */
export interface SavedAddress {
  id: number;
  /** "Home", "Office". */
  label: string | null;
  /** Who receives it, when not the shopper. */
  recipientName: string | null;
  recipientPhone: string | null;
  districtId: string;
  districtName: string;
  areaId: string | null;
  areaName: string | null;
  address: string;
  isDefault: boolean;
}

export interface Me {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  google: boolean;
  /** An approved business: buys at wholesale prices. */
  business: boolean;
  /** The wholesale request and its answer (null: never asked). */
  businessRequest: { status: 'pending' | 'approved' | 'rejected'; businessName: string | null; businessType: string | null; appliedAt: string | null } | null;
  /** The address to fill in at checkout. */
  address: { districtId: string; areaId: string | null; address: string } | null;
  /** Default first, then the latest used. */
  addresses: SavedAddress[];
}

/** undefined: not known yet. null: signed out. */
export const me = signal<Me | null | undefined>(undefined);
/** The sign-in window: open, and where to go after (or nothing: stay on the page). */
export const signInOpen = signal<{ then?: string; reason?: string } | null>(null);

const KEY = 'pt-me';

function remember(value: Me | null) {
  me.value = value;
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode: fine, the shop is asked each time.
  }
}

export const api = (path: string, body?: unknown) =>
  fetch(`${API_PUBLIC_URL}/v1/store${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let loading: Promise<void> | null = null;

/** Who is signed in (asked once per page). */
export function loadMe(force = false) {
  if (loading && !force) return loading;
  if (me.value === undefined) {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) me.value = JSON.parse(saved) as Me;
    } catch {
      // ignore
    }
  }
  loading = api('/me')
    .then((r) => (r.ok ? (r.json() as Promise<{ customer: Me | null }>) : Promise.reject(new Error(String(r.status)))))
    .then((d) => remember(d.customer))
    // No connection: keep what we had (or signed out).
    .catch(() => {
      if (me.value === undefined) me.value = null;
    });
  return loading;
}

export function signedIn(value: Me) {
  remember(value);
}

export async function signOut() {
  await api('/auth/logout', {}).catch(() => null);
  remember(null);
}

/**
 * The signed-in shopper, for an island. Starts as "not known yet", like the server-made page: an
 * island that starts after another one already knew would otherwise draw differently from the page,
 * and the page would end up with both versions.
 */
export function useMe() {
  const [value, setValue] = useState<Me | null | undefined>(undefined);
  useEffect(() => {
    const stop = me.subscribe(setValue);
    void loadMe();
    setValue(me.peek());
    return stop;
  }, []);
  return value;
}

/** Open the sign-in window. */
export const openSignIn = (options: { then?: string; reason?: string } = {}) => (signInOpen.value = options);

/** "Nadia Islam" -> "N". */
export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

/** Sends a change to the account; the shop answers with the updated account (or an error). */
export async function changeAccount(path: string, body?: unknown, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST') {
  const res = await fetch(`${API_PUBLIC_URL}/v1/store${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { customer?: Me; error?: { message?: string; fields?: Record<string, string> } } | null;
  if (res.ok && data?.customer) {
    remember(data.customer);
    return { ok: true as const, customer: data.customer };
  }
  if (res.status === 401) remember(null);
  return { ok: false as const, message: data?.error?.message ?? 'That did not work. Please try again.', fields: data?.error?.fields ?? {} };
}

/**
 * "Order again": the order's items go into the cart at today's prices (what is still for sale, up to
 * the stock), only those are ticked, and checkout opens. Says what could not be added.
 */
export async function orderAgain(items: { variantId: number | null; quantity: number }[]) {
  const wanted = items.filter((i): i is { variantId: number; quantity: number } => i.variantId !== null);
  if (!wanted.length) return { added: 0, missing: items.length };
  const res = await fetch(`${API_PUBLIC_URL}/v1/store/cart`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: wanted }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const check = (await res.json()) as CartCheck;
  // The saved cart must be in place first, or it would be replaced by these items.
  loadSaved();
  const ok = check.lines.filter((l) => l.problem !== 'gone' && l.problem !== 'out_of_stock' && l.price !== undefined && l.quantity > 0);
  for (const l of ok) {
    cart.put(
      { variantId: l.variantId, productId: l.productId!, slug: l.slug!, name: l.name!, variantLabel: l.variantLabel ?? null, image: l.image ?? null, price: l.price!, regularPrice: l.regularPrice ?? null, maxQuantity: l.maxQuantity ?? null },
      l.quantity,
    );
  }
  if (ok.length) cart.only(ok.map((l) => l.variantId));
  return { added: ok.length, missing: items.length - ok.length };
}
