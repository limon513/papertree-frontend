'use client';

import { useSyncExternalStore } from 'react';

/** Small page-wide UI state: which panel is open. */
type Panel = 'cart' | 'deliver-to' | null;

let panel: Panel = null;
const listeners = new Set<() => void>();

export const ui = {
  open(next: Panel) {
    panel = next;
    listeners.forEach((l) => l());
  },
  close() {
    ui.open(null);
  },
};

export function usePanel() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => panel,
    () => null,
  );
}
