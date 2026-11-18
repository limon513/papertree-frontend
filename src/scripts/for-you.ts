import { recentCategories } from '@/lib/recent';

/**
 * "Just for you" on the home page: one set of products. It comes with the page as popular picks (the
 * same for everyone). A shopper who looked at some categories lately gets picks from those instead:
 * their browser asks for them once (the cards come ready-made from /fragments/for-you/, so they look
 * and work like every other card) and swaps them in. The section sits lower on the page, so this is
 * done before the shopper scrolls to it. If it fails, the popular picks simply stay.
 */
const section = document.querySelector<HTMLElement>('[data-for-you]');
const like = recentCategories();
if (section && like.length) {
  const list = section.querySelector<HTMLElement>('[data-for-you-list]')!;
  const note = section.querySelector<HTMLElement>('[data-for-you-note]');
  const swap = async () => {
    try {
      const res = await fetch(`/fragments/for-you/?like=${encodeURIComponent(like.join(','))}`);
      if (!res.ok) return;
      const template = document.createElement('template');
      template.innerHTML = await res.text();
      template.content.querySelectorAll('script').forEach((s) => s.remove());
      const items = [...(template.content.querySelector('ul')?.children ?? [])];
      // Only a full set: never leave the section half empty.
      if (items.length < list.children.length) return;
      list.replaceChildren(...items);
      if (note) note.textContent = 'Picked from what you looked at lately';
      // The cart bubbles and business prices for the new cards (src/scripts/product-cards.ts).
      document.dispatchEvent(new Event('pt:cards'));
    } catch {
      // Offline or busy: the popular picks stay.
    }
  };
  // After the page has settled, so it never slows the first view.
  if ('requestIdleCallback' in window) requestIdleCallback(() => void swap(), { timeout: 2000 });
  else setTimeout(() => void swap(), 500);
}
