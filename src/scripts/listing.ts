/**
 * List pages: filters, sort and the phone filter sheet. Plain script, no framework.
 * - Sidebar (computers): each tick opens the filtered list at once.
 * - Sheet (phones): ticks stay in the sheet and the button shows the live number of products; the list
 *   opens on "Show N products". Closing the sheet without that puts the ticks back as they were.
 */
const FILTERS = ['brand', 'tag', 'min', 'max', 'inStock', 'onSale', 'page'];
const digits = (v: FormDataEntryValue | null) => String(v ?? '').replace(/\D/g, '').slice(0, 7);

/** The filters chosen in a form, as address options. */
function chosen(form: HTMLFormElement) {
  const data = new FormData(form);
  const q = new URLSearchParams();
  const brands = data.getAll('brand').map(String);
  if (brands.length) q.set('brand', brands.join(','));
  const tags = data.getAll('tag').map(String);
  if (tags.length) q.set('tag', tags.join(','));
  let min = digits(data.get('min'));
  let max = digits(data.get('max'));
  if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
  if (min) q.set('min', min);
  if (max) q.set('max', max);
  if (data.get('inStock')) q.set('inStock', 'true');
  if (data.get('onSale')) q.set('onSale', 'true');
  return q;
}

/** This page's address with the form's filters (sort and other options kept, back to page 1). */
function hrefFor(form: HTMLFormElement) {
  const q = new URLSearchParams(location.search);
  for (const key of FILTERS) q.delete(key);
  for (const [key, value] of chosen(form)) q.set(key, value);
  const s = q.toString();
  return s ? `${location.pathname}?${s}` : location.pathname;
}

/** Fade the products while the next page loads. */
function go(href: string) {
  document.getElementById('products')?.classList.add('opacity-40');
  location.href = href;
}

// Back to this page from the next one (the browser may keep the old page as it was): undo the fade.
addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.getElementById('products')?.classList.remove('opacity-40');
  const open = document.querySelector<HTMLDialogElement>('#filter-sheet[open]');
  if (open) {
    open.returnValue = '';
    open.close();
  }
});

// ---- Computers: instant ----
for (const form of document.querySelectorAll<HTMLFormElement>('form[data-filters=instant]')) {
  form.addEventListener('change', (e) => {
    // Price boxes apply with Enter or "Go".
    if ((e.target as HTMLInputElement).type === 'checkbox') go(hrefFor(form));
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go(hrefFor(form));
  });
}

// ---- Sort ----
for (const select of document.querySelectorAll<HTMLSelectElement>('select[data-sort]')) {
  select.addEventListener('change', () => go(select.value));
}

// ---- Phones: the sheet ----
const sheet = document.querySelector<HTMLDialogElement>('#filter-sheet');
const staged = sheet?.querySelector<HTMLFormElement>('form[data-filters=staged]');
const apply = sheet?.querySelector<HTMLButtonElement>('[data-apply-filters]');

if (sheet && staged && apply) {
  const label = (n: number) => `Show ${n} product${n === 1 ? '' : 's'}`;
  const pageTotal = Number(apply.dataset.total);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;

  /** Ask the API how many products the ticked filters give. */
  const recount = () => {
    clearTimeout(timer);
    request?.abort();
    apply.textContent = 'Counting…';
    timer = setTimeout(async () => {
      request = new AbortController();
      const url = new URL(staged.dataset.countUrl!);
      for (const [key, value] of chosen(staged)) url.searchParams.set(key, value);
      url.searchParams.set('pageSize', '1');
      try {
        const res = await fetch(url, { signal: request.signal });
        if (!res.ok) throw new Error(String(res.status));
        const total = ((await res.json()) as { total: number }).total;
        apply.textContent = label(total);
        apply.disabled = total === 0;
      } catch (err) {
        // Offline or the API is busy: the button still works, without a number.
        if ((err as Error).name !== 'AbortError') {
          apply.textContent = 'Show products';
          apply.disabled = false;
        }
      }
    }, 250);
  };

  /** Closed without "Show": back to the filters this page has. */
  const discard = () => {
    staged.reset();
    clearTimeout(timer);
    request?.abort();
    apply.textContent = label(pageTotal);
    apply.disabled = false;
  };
  const closeSheet = () => {
    discard();
    sheet.close();
  };

  document.querySelector('[data-open-filters]')?.addEventListener('click', () => {
    sheet.returnValue = '';
    sheet.showModal();
  });
  sheet.querySelector('[data-close-filters]')?.addEventListener('click', closeSheet);
  // A tap on the dark area outside the sheet closes it.
  sheet.addEventListener('click', (e) => e.target === sheet && closeSheet());
  // Escape or the phone's Back gesture close the sheet without our buttons.
  sheet.addEventListener('close', () => sheet.returnValue !== 'apply' && discard());

  staged.addEventListener('change', recount);
  staged.addEventListener('input', (e) => (e.target as HTMLInputElement).type !== 'checkbox' && recount());
  staged.addEventListener('submit', (e) => {
    e.preventDefault();
    apply.click();
  });
  sheet.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    for (const input of staged.querySelectorAll<HTMLInputElement>('input')) {
      if (input.type === 'checkbox') input.checked = false;
      else input.value = '';
    }
    recount();
  });
  apply.addEventListener('click', () => {
    sheet.returnValue = 'apply';
    go(hrefFor(staged));
  });
}
