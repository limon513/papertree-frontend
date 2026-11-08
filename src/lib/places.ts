import type { Places } from './types';
import { API_PUBLIC_URL } from './utils';

let cache: Promise<Places> | null = null;

/** Districts and areas of Bangladesh, loaded once per visit (for "Deliver to" and checkout). */
export function loadPlaces() {
  cache ??= fetch(`${API_PUBLIC_URL}/v1/store/places`).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<Places>;
  });
  cache.catch(() => (cache = null));
  return cache;
}

/** Areas of a district, Dhaka City ones first. */
export const areasOf = (places: Places | null, districtId: string) =>
  (places?.areas ?? []).filter((a) => a.districtId === districtId).sort((x, y) => Number(y.city) - Number(x.city) || x.name.localeCompare(y.name));
