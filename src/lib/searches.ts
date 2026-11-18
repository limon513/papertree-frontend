import { API_PUBLIC_URL } from './utils';

/**
 * Search help for the search box: the shopper's own recent searches (kept in their browser only,
 * newest first) and the shop's popular searches (asked once per page, when the box is first opened).
 */
const KEY = 'pt_recent_searches';
const MOST = 8;

export function recentSearches(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 100).slice(0, MOST) : [];
  } catch {
    return [];
  }
}

function save(list: string[]) {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list.slice(0, MOST)));
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode or storage full: the box just shows no history.
  }
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function rememberSearch(raw: string) {
  const q = raw.replace(/\s+/g, ' ').trim().slice(0, 100);
  if (q.length < 2) return;
  save([q, ...recentSearches().filter((s) => !same(s, q))]);
}

export function forgetSearch(q: string) {
  save(recentSearches().filter((s) => !same(s, q)));
}

export const clearSearches = () => save([]);

let popular: Promise<string[]> | null = null;

/** The shop's popular searches (8). Asked once; an empty list when the shop does not answer. */
export function popularSearches() {
  popular ??= fetch(`${API_PUBLIC_URL}/v1/store/popular-searches`)
    .then((r) => (r.ok ? (r.json() as Promise<{ terms: string[] }>) : { terms: [] }))
    .then((d) => d.terms)
    .catch(() => {
      popular = null;
      return [];
    });
  return popular;
}
