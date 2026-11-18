import { recentCategories } from '@/lib/recent';

/**
 * "Just for you" on the home page: more products load by themselves as the shopper nears the end of
 * the list (18 at a time), until there are no more. The cards come ready-made from the site
 * (/fragments/for-you/), so they look and work like every other card.
 *
 * The first page comes with the page itself (for everyone, and for Google). A shopper who looked at
 * some categories lately gets a different order (their categories higher up): the list then asks
 * again from the first page and leaves out the products already on screen.
 */
const section = document.querySelector<HTMLElement>('[data-for-you]');
if (section) {
  const list = section.querySelector<HTMLElement>('[data-for-you-list]')!;
  const more = section.querySelector<HTMLElement>('[data-for-you-more]')!;
  const like = recentCategories();
  const shown = new Set([...list.querySelectorAll<HTMLElement>('[data-card]')].map((c) => c.dataset.card));
  let pages = Number(section.dataset.pages) || 1;
  let next = like.length ? 1 : 2;
  let busy = false;
  let failed = false;
  const done = () => next > pages;

  const render = () => {
    if (busy) {
      more.innerHTML = '<p class="flex items-center gap-2 text-sm text-zinc-500" role="status"><span class="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600"></span> Loading more products…</p>';
    } else if (failed) {
      more.innerHTML = '<button type="button" data-retry class="h-11 cursor-pointer rounded-xl bg-white px-5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 hover:ring-zinc-400">Could not load more. Try again</button>';
    } else if (done()) {
      more.innerHTML = '<p class="text-sm text-zinc-500">That is all for now. <a href="/shop/" class="font-semibold text-brand-700 hover:underline">Browse all products</a></p>';
    } else {
      more.innerHTML = '<button type="button" data-retry class="h-11 cursor-pointer rounded-xl bg-white px-5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 hover:ring-zinc-400">Show more</button>';
    }
  };

  const load = async () => {
    if (busy || done()) return;
    busy = true;
    failed = false;
    render();
    try {
      let added = 0;
      // Keep going until a few new products came (a page may be all products already on screen).
      while (!done() && added < 6) {
        const res = await fetch(`/fragments/for-you/?page=${next}${like.length ? `&like=${encodeURIComponent(like.join(','))}` : ''}`);
        if (!res.ok) throw new Error(`for-you ${res.status}`);
        const template = document.createElement('template');
        template.innerHTML = await res.text();
        template.content.querySelectorAll('script').forEach((s) => s.remove());
        const page = template.content.querySelector<HTMLElement>('ul');
        pages = Number(page?.dataset.pages) || pages;
        for (const item of [...(page?.children ?? [])]) {
          const id = item.querySelector<HTMLElement>('[data-card]')?.dataset.card;
          if (!id || shown.has(id)) continue;
          shown.add(id);
          list.append(item);
          added++;
        }
        next++;
      }
      // The cart bubbles and business prices for the new cards (src/scripts/product-cards.ts).
      document.dispatchEvent(new Event('pt:cards'));
    } catch {
      failed = true;
    } finally {
      busy = false;
      render();
      // Still near the end (a tall screen, or few new cards came)? Then on to the next page.
      if (!failed && !done()) requestAnimationFrame(() => more.getBoundingClientRect().top < innerHeight + 800 && void load());
    }
  };

  more.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-retry]')) void load();
  });
  render();
  // Start loading a little before the end of the list comes into view.
  new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && !failed && void load(), { rootMargin: '800px 0px' }).observe(more);
}
