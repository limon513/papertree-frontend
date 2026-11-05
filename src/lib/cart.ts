'use client';

import { useSyncExternalStore } from 'react';
import type { Img } from './types';

/**
 * The cart and the chosen delivery place live in the browser (localStorage), so adding is instant
 * and works on slow connections. Prices and stock are checked again with the API when the cart opens.
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
  /** null = no limit. */
  maxQuantity: number | null;
}

export interface DeliverTo {
  districtId: string;
  areaId: string | null;
  /** "Mirpur, Dhaka". */
  label: string;
}

interface State {
  items: CartItem[];
  deliverTo: DeliverTo | null;
}

const KEY = 'papertree-cart-v1';
const EMPTY: State = { items: [], deliverTo: null };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as State | null;
    if (saved && Array.isArray(saved.items)) state = { items: saved.items, deliverTo: saved.deliverTo ?? null };
  } catch {
    // Broken or blocked storage: start empty.
  }
  // Another tab changed the cart.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    try {
      state = JSON.parse(e.newValue ?? 'null') ?? EMPTY;
    } catch {
      state = EMPTY;
    }
    listeners.forEach((l) => l());
  });
}

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the cart still works until the page closes.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => {
  load();
  return state;
};
const getServerState = () => EMPTY;

const clamp = (quantity: number, max: number | null) => Math.max(0, max === null ? quantity : Math.min(quantity, max));

// ---- "Added" notice ----

type AddedListener = (item: CartItem) => void;
const addedListeners = new Set<AddedListener>();
export const onAdded = (listener: AddedListener) => {
  addedListeners.add(listener);
  return () => addedListeners.delete(listener);
};

export const cart = {
  add(item: Omit<CartItem, 'quantity'>, quantity = 1) {
    const current = getState();
    const existing = current.items.find((i) => i.variantId === item.variantId);
    const items = existing
      ? current.items.map((i) => (i.variantId === item.variantId ? { ...i, ...item, quantity: clamp(i.quantity + quantity, item.maxQuantity) } : i))
      : [...current.items, { ...item, quantity: clamp(quantity, item.maxQuantity) }];
    set({ ...current, items });
    const added = items.find((i) => i.variantId === item.variantId);
    if (added) addedListeners.forEach((l) => l(added));
  },
  setQuantity(variantId: number, quantity: number) {
    const current = getState();
    set({
      ...current,
      items: current.items
        .map((i) => (i.variantId === variantId ? { ...i, quantity: clamp(quantity, i.maxQuantity) } : i))
        .filter((i) => i.quantity > 0),
    });
  },
  remove(variantId: number) {
    const current = getState();
    set({ ...current, items: current.items.filter((i) => i.variantId !== variantId) });
  },
  /** Takes in what the API said: today's prices, names and stock limits. */
  update(fresh: (Partial<CartItem> & { variantId: number })[], gone: number[]) {
    const current = getState();
    const byId = new Map(fresh.map((f) => [f.variantId, f]));
    set({
      ...current,
      items: current.items
        .filter((i) => !gone.includes(i.variantId))
        .map((i) => {
          const f = byId.get(i.variantId);
          if (!f) return i;
          const merged = { ...i, ...f };
          return { ...merged, quantity: clamp(merged.quantity, merged.maxQuantity) };
        })
        .filter((i) => i.quantity > 0),
    });
  },
  clear() {
    set({ ...getState(), items: [] });
  },
  setDeliverTo(deliverTo: DeliverTo | null) {
    set({ ...getState(), deliverTo });
  },
};

export function useCart() {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  return {
    items: s.items,
    deliverTo: s.deliverTo,
    count: s.items.reduce((n, i) => n + i.quantity, 0),
    subtotal: Math.round(s.items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100,
  };
}

export function useCartQuantity(variantId: number | null) {
  const s = useSyncExternalStore(subscribe, getState, getServerState);
  return variantId === null ? 0 : (s.items.find((i) => i.variantId === variantId)?.quantity ?? 0);
}
