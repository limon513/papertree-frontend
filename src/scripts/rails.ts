/**
 * Rows that scroll sideways (product rows, the category row): arrow buttons on computers, hidden at
 * the ends. Markup: an element with class "rail" holding the <ul> and two .rail-arrow buttons.
 */
for (const rail of document.querySelectorAll<HTMLElement>('.rail')) {
  const list = rail.querySelector('ul')!;
  const [prev, next] = rail.querySelectorAll<HTMLButtonElement>('.rail-arrow');
  const update = () => {
    const atStart = list.scrollLeft < 8;
    const atEnd = list.scrollLeft + list.clientWidth > list.scrollWidth - 8;
    prev!.classList.toggle('opacity-0', atStart);
    prev!.classList.toggle('pointer-events-none', atStart);
    next!.classList.toggle('opacity-0', atEnd);
    next!.classList.toggle('pointer-events-none', atEnd);
  };
  for (const button of [prev!, next!]) {
    button.addEventListener('click', () => list.scrollBy({ left: Number(button.dataset.dir) * list.clientWidth * 0.9, behavior: 'smooth' }));
  }
  list.addEventListener('scroll', update, { passive: true });
  // Rows further down are skipped by the browser until they come near the screen: check again then.
  rail.closest('section')?.addEventListener('contentvisibilityautostatechange', update);
  rail.addEventListener('pointerenter', update);
  addEventListener('resize', update);
  update();
}
