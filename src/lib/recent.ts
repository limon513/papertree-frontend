/**
 * The categories a shopper looked at lately (product and category pages), newest first, kept in
 * their own browser only. "Just for you" on the home page shows products from them higher up.
 */
const KEY = 'pt_recent_categories';
const MOST = 5;

export function recentCategories(): string[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,120}$/.test(s)).slice(0, MOST) : [];
  } catch {
    return [];
  }
}

export function rememberCategory(slug: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([slug, ...recentCategories().filter((s) => s !== slug)].slice(0, MOST)));
  } catch {
    // Private mode or storage full: "Just for you" just stays general.
  }
}
