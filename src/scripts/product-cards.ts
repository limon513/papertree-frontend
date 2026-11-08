import { effect } from '@preact/signals';
import { cart, cartState, loadSaved, type CartItem } from '@/lib/cart';

/**
 * Every product card on the page, run by this one small script (no app per card):
 * - Cart icon: adds to the cart; its bubble shows how many are in the cart, here or in another tab.
 * - Buy now: straight to checkout with just this product (the cart is left as it is).
 * - Products with options: both open the "choose options" window (or the product page, if the
 *   window is not ready yet).
 * - Computers: moving the mouse across the picture shows the product's other pictures.
 */
type Box = HTMLElement & { _item?: Omit<CartItem, 'quantity'> };
declare global {
  interface Window {
    /** Opens the "choose options" window (set by the QuickBuy island once it runs). */
    ptQuick?: (slug: string, intent: 'add' | 'buy') => void;
  }
}

const itemOf = (box: Box) => (box._item ??= JSON.parse(box.dataset.item!) as Omit<CartItem, 'quantity'>);

document.addEventListener('click', (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>('[data-act]');
  const box = button?.closest<Box>('[data-item], [data-quick]');
  if (!button || !box) return;
  const buy = button.dataset.act === 'buy';
  if (box.dataset.quick) {
    if (window.ptQuick) window.ptQuick(box.dataset.quick, buy ? 'buy' : 'add');
    else location.href = box.dataset.href!;
    return;
  }
  const item = itemOf(box);
  if (buy) location.href = `/checkout/?buy=${item.variantId}&qty=1`;
  else cart.add(item);
});

// The bubble on each cart icon: how many of this product are in the cart (all its options together).
effect(() => {
  const inCart = new Map<number, number>();
  for (const i of cartState.value.items) inCart.set(i.productId, (inCart.get(i.productId) ?? 0) + i.quantity);
  for (const box of document.querySelectorAll<HTMLElement>('[data-product]')) {
    const bubble = box.querySelector<HTMLElement>('[data-qty]');
    if (!bubble) continue;
    const n = inCart.get(Number(box.dataset.product)) ?? 0;
    bubble.hidden = n === 0;
    if (bubble.textContent !== String(n)) {
      bubble.textContent = n > 99 ? '99+' : String(n);
      // Replay the little "pop".
      bubble.classList.remove('animate-pop');
      void bubble.offsetWidth;
      bubble.classList.add('animate-pop');
    }
  }
});

// ---- Picture on hover (mouse only) ----
type Pics = HTMLElement & { _pics?: string[]; _at?: number; _orig?: { src: string; srcset: string }; _warm?: boolean };

const show = (box: Pics, i: number) => {
  const img = box.querySelector('img');
  if (!img || box._at === i) return;
  box._orig ??= { src: img.src, srcset: img.srcset };
  box._at = i;
  if (i === 0) {
    img.srcset = box._orig.srcset;
    img.src = box._orig.src;
  } else {
    img.srcset = '';
    img.src = box._pics![i]!;
  }
  box.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar, n) => {
    bar.classList.toggle('bg-brand-600', n === i);
    bar.classList.toggle('bg-zinc-900/15', n !== i);
  });
};

document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const box = (e.target as Element).closest<Pics>('[data-pics]');
  if (!box) return;
  box._pics ??= JSON.parse(box.dataset.pics!) as string[];
  if (!box._warm) {
    // Fetch the other pictures as soon as the card is pointed at.
    box._warm = true;
    for (const src of box._pics.slice(1)) new Image().src = src;
  }
  const r = box.getBoundingClientRect();
  show(box, Math.min(box._pics.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * box._pics.length))));
});

document.addEventListener('pointerout', (e) => {
  const box = (e.target as Element).closest<Pics>('[data-pics]');
  if (box && !box.contains(e.relatedTarget as Node | null)) show(box, 0);
});

loadSaved();
