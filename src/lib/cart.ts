import { useEffect, useState } from 'preact/hooks';
import { computed, signal } from '@preact/signals';
import type { Img } from './types';

/**
 * The cart and delivery place live in the browser (localStorage). Every island (Add buttons,
 * header cart, drawer) reads the same signals, so a change shows everywhere at once.
 */

export interface CartItem {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  variantLabel: string | null;
  image: Img | null;
  price: number;
  regularPrice: number | null;
  quantity: number;
  maxQuantity: number | null;
}

export interface DeliverTo {
  districtId: string;
  areaId: string | null;
  label: string;
}

interface State {
  items: CartItem[];
  deliverTo: DeliverTo | null;
}

const KEY = 'papertree-cart-v1';
const EMPTY: State = { items: [], deliverTo: null };

function read(): State {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as State | null;
    return saved && Array.isArray(saved.items) ? { items: saved.items, deliverTo: saved.deliverTo ?? null } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Starts empty, like the page the server made (it cannot see the shopper's saved cart). Islands call
 * useCart() which loads the saved cart once they are running, so the change is drawn properly.
 */
export const cartState = signal<State>(EMPTY);
export const cartCount = computed(() => cartState.value.items.reduce((n, i) => n + i.quantity, 0));
export const cartSubtotal = computed(() => Math.round(cartState.value.items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100);
/** The last item added, for the "Added" notice. */
export const lastAdded = signal<{ item: CartItem; at: number } | null>(null);

let loaded = false;
/** Reads the saved cart once, after the page has started (the server-made page shows an empty cart). */
export function loadSaved() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  cartState.value = read();
  // Another tab changed the cart.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) cartState.value = read();
  });
}

/**
 * The cart, for an island. Listens explicitly (subscribe, then take the current value), so it also
 * sees the saved cart that loads while islands are starting. Signal auto-tracking missed that change.
 */
export function useCart() {
  // Always start like the server-made page (empty cart): an island that starts later must not start
  // with the loaded cart, or its first draw would not match the page and would not be corrected.
  const [state, setState] = useState<State>(EMPTY);
  useEffect(() => {
    const stop = cartState.subscribe(setState);
    loadSaved();
    setState(cartState.peek());
    return stop;
  }, []);
  return state;
}

export const countOf = (s: State) => s.items.reduce((n, i) => n + i.quantity, 0);
export const subtotalOf = (s: State) => Math.round(s.items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

function set(next: State) {
  cartState.value = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or full storage: the cart still works until the page closes.
  }
}

const clamp = (q: number, max: number | null) => Math.max(0, max === null ? q : Math.min(q, max));

export const cart = {
  add(item: Omit<CartItem, 'quantity'>, quantity = 1) {
    const s = cartState.value;
    const existing = s.items.find((i) => i.variantId === item.variantId);
    const items = existing
      ? s.items.map((i) => (i.variantId === item.variantId ? { ...i, ...item, quantity: clamp(i.quantity + quantity, item.maxQuantity) } : i))
      : [...s.items, { ...item, quantity: clamp(quantity, item.maxQuantity) }];
    set({ ...s, items });
    const added = items.find((i) => i.variantId === item.variantId);
    if (added) lastAdded.value = { item: added, at: Date.now() };
  },
  setQuantity(variantId: number, quantity: number) {
    const s = cartState.value;
    set({
      ...s,
      items: s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(quantity, i.maxQuantity) } : i)).filter((i) => i.quantity > 0),
    });
  },
  update(fresh: (Partial<CartItem> & { variantId: number })[], gone: number[]) {
    const s = cartState.value;
    const byId = new Map(fresh.map((f) => [f.variantId, f]));
    set({
      ...s,
      items: s.items
        .filter((i) => !gone.includes(i.variantId))
        .map((i) => {
          const f = byId.get(i.variantId);
          const merged = f ? { ...i, ...f } : i;
          return { ...merged, quantity: clamp(merged.quantity, merged.maxQuantity) };
        })
        .filter((i) => i.quantity > 0),
    });
  },
  /** Empty the cart (the delivery area stays). */
  clear() {
    set({ ...cartState.value, items: [] });
  },
  setDeliverTo(deliverTo: DeliverTo | null) {
    set({ ...cartState.value, deliverTo });
  },
};

export const quantityOf = (variantId: number | null) =>
  variantId === null ? 0 : (cartState.value.items.find((i) => i.variantId === variantId)?.quantity ?? 0);

/** Which panel is open. */
export const panel = signal<'cart' | 'deliver-to' | null>(null);
