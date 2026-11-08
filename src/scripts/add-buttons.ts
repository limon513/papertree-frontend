import { effect } from '@preact/signals';
import { cart, cartState, loadSaved, type CartItem } from '@/lib/cart';

/**
 * Every "Add" button on the page, handled by this one small script (no app per card): a tap adds to the
 * cart, and each card switches between "Add" and "− 2 +" as the cart changes, in this tab or another.
 */
type Box = HTMLElement & { _item?: Omit<CartItem, 'quantity'> };

const itemOf = (box: Box) => (box._item ??= JSON.parse(box.dataset.item!) as Omit<CartItem, 'quantity'>);

document.addEventListener('click', (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>('[data-act]');
  const box = button?.closest<Box>('[data-item]');
  if (!button || !box) return;
  const item = itemOf(box);
  const quantity = cartState.value.items.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
  if (button.dataset.act === 'less') cart.setQuantity(item.variantId, quantity - 1);
  else cart.add(item);
});

effect(() => {
  const quantities = new Map(cartState.value.items.map((i) => [i.variantId, i.quantity]));
  for (const box of document.querySelectorAll<Box>('[data-item]')) {
    const item = itemOf(box);
    const quantity = quantities.get(item.variantId) ?? 0;
    const counter = box.querySelector<HTMLElement>('[data-counter]')!;
    const qty = counter.querySelector<HTMLElement>('[data-qty]')!;
    box.querySelector<HTMLElement>('[data-act=add]')!.hidden = quantity > 0;
    counter.hidden = quantity === 0;
    if (qty.textContent !== String(quantity)) {
      qty.textContent = String(quantity);
      // Replay the little "pop".
      qty.classList.remove('animate-pop');
      void qty.offsetWidth;
      qty.classList.add('animate-pop');
    }
    counter.querySelector<HTMLButtonElement>('[data-act=more]')!.disabled = item.maxQuantity !== null && quantity >= item.maxQuantity;
  }
});

loadSaved();
