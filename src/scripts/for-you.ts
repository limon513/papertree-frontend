import { recentCategories } from '@/lib/recent';
import { API_PUBLIC_URL } from '@/lib/utils';
import { setUpRails } from './rails';

/**
 * The home page's personal parts. The page itself is the same for everyone (fast, cached); these are
 * added by the shopper's browser afterwards, and if anything fails the page simply stays as it was.
 *
 * Signed in (the browser remembers it): the shop is asked for their own rows (/v1/store/me/home):
 * - "Pick up where you left off" and "Buy again", added under the categories row;
 * - "Just for you" swapped for their own picks (look-alikes of what they viewed, their favourite
 *   categories; never what they bought).
 *
 * Otherwise (or with too little to go on): "Just for you" comes with the page as popular picks, and a
 * shopper who looked at some categories lately gets picks from those instead (kept in this browser).
 */
type Personal = { recent: number[]; buyAgain: number[]; forYou: number[] };

const signedIn = () => {
  try {
    return !!localStorage.getItem('pt-me');
  } catch {
    return false;
  }
};

async function ownRows(): Promise<Personal | null> {
  if (!signedIn()) return null;
  try {
    const res = await fetch(`${API_PUBLIC_URL}/v1/store/me/home`, { credentials: 'include' });
    return res.ok ? ((await res.json()) as Personal) : null;
  } catch {
    return null;
  }
}

const html = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const template = document.createElement('template');
  template.innerHTML = await res.text();
  template.content.querySelectorAll('script').forEach((s) => s.remove());
  return template.content;
};

/** "Pick up where you left off" (2 or more) and "Buy again", under the categories row. */
async function addRows(p: Personal) {
  const slot = document.querySelector<HTMLElement>('[data-personal-rows]');
  const parts = [p.recent.length >= 2 ? `recent:${p.recent.join(',')}` : null, p.buyAgain.length ? `again:${p.buyAgain.join(',')}` : null].filter(Boolean);
  if (!slot || !parts.length) return;
  try {
    const rows = await html(`/fragments/rows/?rows=${encodeURIComponent(parts.join(';'))}`);
    slot.replaceChildren(...rows.children);
    setUpRails();
    // The cart bubbles and business prices for the new cards (src/scripts/product-cards.ts).
    document.dispatchEvent(new Event('pt:cards'));
  } catch {
    // The page stays as it was.
  }
}

/** Swaps "Just for you" for these cards, only as a full set (never a half-empty section). */
async function swapForYou(url: string, note: string, order?: number[]) {
  const section = document.querySelector<HTMLElement>('[data-for-you]');
  if (!section) return;
  const list = section.querySelector<HTMLElement>('[data-for-you-list]')!;
  try {
    const content = await html(url);
    let items = [...(content.querySelector('ul')?.children ?? [])];
    if (order) {
      const at = (li: Element) => order.indexOf(Number((li as HTMLElement).dataset.itemOf));
      items = items.sort((a, b) => at(a) - at(b));
    }
    if (items.length < list.children.length) return;
    list.replaceChildren(...items.slice(0, list.children.length));
    const noteEl = section.querySelector<HTMLElement>('[data-for-you-note]');
    if (noteEl) noteEl.textContent = note;
    document.dispatchEvent(new Event('pt:cards'));
  } catch {
    // Offline or busy: the popular picks stay.
  }
}

const later = (work: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(work, { timeout: 2000 }) : setTimeout(work, 500));

void ownRows().then((p) => {
  if (p) void addRows(p);
  if (p && p.forYou.length) {
    later(() => void swapForYou(`/fragments/cards/?ids=${p.forYou.join(',')}`, 'Picked for you, from what you like', p.forYou));
    return;
  }
  const like = recentCategories();
  if (like.length) later(() => void swapForYou(`/fragments/for-you/?like=${encodeURIComponent(like.join(','))}`, 'Picked from what you looked at lately'));
});
