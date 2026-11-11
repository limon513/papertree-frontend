import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { API_PUBLIC_URL } from './utils';

/**
 * The signed-in shopper. The sign-in itself is an httpOnly cookie the browser sends to the shop; this
 * only mirrors who it is. A small copy is kept on this device so the header shows the right picture at
 * once, then it is checked with the shop.
 */
export interface Me {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  google: boolean;
  business: boolean;
  /** The address to fill in at checkout. */
  address: { districtId: string; areaId: string | null; address: string } | null;
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
