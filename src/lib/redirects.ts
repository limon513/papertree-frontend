import { API_URL } from 'astro:env/server';

/**
 * Old addresses (from the old WordPress site, or changed by staff) and where they go now. The list
 * is kept in memory and refreshed every minute, so checking a visit costs nothing. What visitors
 * meet (redirects used, addresses not found) is sent to the shop every half minute, in one go.
 */
const API = API_URL.replace(/\/$/, '');
const REFRESH = 60_000;

type Rule = { to: string; code: number };
let rules = new Map<string, Rule>();
let loadedAt = 0;
let loading: Promise<void> | null = null;

async function load() {
  try {
    const res = await fetch(`${API}/v1/store/redirects`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      loadedAt = Date.now();
      return;
    }
    const data = (await res.json()) as { items: [string, string, number][] };
    rules = new Map(data.items.map(([from, to, code]) => [from, { to, code }]));
    loadedAt = Date.now();
  } catch {
    // The shop API is busy or down: keep the list we had, and try again in a minute.
    loadedAt = Date.now();
  } finally {
    loading = null;
  }
}

/**
 * The redirect for this (tidy) path. Once a minute the list is fetched again; that one visit waits
 * for it (a few hundredths of a second), so a new redirect works from the next minute on.
 */
export async function redirectFor(path: string) {
  if (!loadedAt || Date.now() - loadedAt > REFRESH) await (loading ??= load());
  return rules.get(path) ?? null;
}

/** Same rules as the shop's lib/paths.ts: "/Product/Pen%20Set" -> "/product/pen set/". */
export function cleanPath(pathname: string) {
  let raw = pathname;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep as is
  }
  let path = `/${raw}`.replace(/\\/g, '/').replace(/\/{2,}/g, '/').toLowerCase();
  if (!/\.[a-z0-9]{2,5}$/.test(path) && !path.endsWith('/')) path += '/';
  return path;
}

// ---- What visitors met, sent in one go ----

const hits = new Map<string, number>();
const missing = new Map<string, { referrer: string | null; count: number }>();

export function countHit(path: string) {
  hits.set(path, (hits.get(path) ?? 0) + 1);
  reportNow();
}

export function countNotFound(path: string, referrer: string | null) {
  const m = missing.get(path);
  if (m) m.count++;
  else if (missing.size < 500) missing.set(path, { referrer: referrer?.slice(0, 500) ?? null, count: 1 });
  reportNow();
}

/**
 * Sends what was counted, at most every 30 seconds, during a visit. (No timer started when the code
 * loads: some hosts, like Cloudflare Workers, refuse that, and every page would fail.)
 */
let lastReport = Date.now();
function reportNow() {
  if (Date.now() - lastReport < 30_000) return;
  lastReport = Date.now();
  void report();
}

async function report() {
  if (!hits.size && !missing.size) return;
  const body = {
    hits: Object.fromEntries([...hits].slice(0, 500)),
    notFound: [...missing].slice(0, 200).map(([path, m]) => ({ path: path.slice(0, 500), referrer: m.referrer, count: m.count })),
  };
  hits.clear();
  missing.clear();
  await fetch(`${API}/v1/store/seen`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
}
