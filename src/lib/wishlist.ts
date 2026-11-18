import { effect, signal } from '@preact/signals';
import { loadMe, me, openSignIn } from './account';
import { API_PUBLIC_URL } from './utils';

/**
 * The wishlist (hearts): which products the signed-in shopper saved. Loaded once per page after they
 * are known to be signed in. A guest who taps a heart is asked to sign in; that product is saved right
 * after (it waits in this tab meanwhile).
 */
export const saved = signal<Set<number>>(new Set());
/** True once the signed-in shopper's hearts are loaded (until then an empty list means "not known yet"). */
export const savedLoaded = signal(false);
const PENDING = 'pt_wish_pending';
let loadedFor: number | null = null;

const call = (method: 'GET' | 'PUT' | 'DELETE', path: string) => fetch(`${API_PUBLIC_URL}/v1/store${path}`, { method, credentials: 'include' });

async function load() {
  try {
    const res = await call('GET', '/me/wishlist/ids');
    if (res.ok) saved.value = new Set(((await res.json()) as { ids: number[] }).ids);
  } catch {
    // Offline: the hearts just show empty for now.
  }
  savedLoaded.value = true;
  let pending: number | null = null;
  try {
    pending = Number(sessionStorage.getItem(PENDING)) || null;
    sessionStorage.removeItem(PENDING);
  } catch {
    // Storage blocked.
  }
  if (pending && !saved.value.has(pending)) await setWish(pending, true);
}

// Signed in (now or later on this page): their hearts. Signed out: none.
effect(() => {
  const m = me.value;
  if (m && m.id !== loadedFor) {
    loadedFor = m.id;
    void load();
  } else if (m === null && loadedFor !== null) {
    loadedFor = null;
    saved.value = new Set();
    savedLoaded.value = false;
  }
});

/**
 * Changes to one product go to the shop one after another, in the order tapped: a quick second tap
 * (save, then remove) can never reach the shop first and leave the wrong answer saved.
 */
const queue = new Map<number, Promise<unknown>>();

function setWish(productId: number, on: boolean) {
  const run = (queue.get(productId) ?? Promise.resolve()).then(() => send(productId, on));
  queue.set(productId, run.catch(() => undefined));
  return run;
}

async function send(productId: number, on: boolean) {
  const before = saved.value;
  const next = new Set(before);
  if (on) next.add(productId);
  else next.delete(productId);
  saved.value = next;
  try {
    const res = await call(on ? 'PUT' : 'DELETE', `/me/wishlist/${productId}`);
    if (!res.ok && res.status !== 404) throw new Error(String(res.status));
    // A product no longer for sale cannot be saved.
    if (res.status === 404 && on) saved.value = before;
    return res.ok;
  } catch {
    saved.value = before;
    return false;
  }
}

/** The heart was tapped: save or remove (a guest signs in first). Answers whether it is saved now. */
export async function toggleWish(productId: number) {
  if (me.peek() === undefined) await loadMe();
  if (!me.peek()) {
    try {
      sessionStorage.setItem(PENDING, String(productId));
    } catch {
      // Storage blocked: they tap the heart again after signing in.
    }
    openSignIn({ reason: 'Sign in to save it to your wishlist. It stays with your account, on your phone and computer.' });
    return false;
  }
  const on = !saved.peek().has(productId);
  const ok = await setWish(productId, on);
  return ok ? on : !on;
}

/** Their saved products' meta (cheaper since saved, back in stock), for the wishlist page. */
export async function wishlistDetails() {
  const res = await call('GET', '/me/wishlist');
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as {
    items: { productId: number; slug: string; savedAt: string; priceWhenSaved: number | null; price: number; inStock: boolean; cheaper: number | null; backInStock: boolean }[];
  };
}
