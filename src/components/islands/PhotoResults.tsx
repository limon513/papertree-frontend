import { useEffect, useRef, useState } from 'preact/hooks';
import { BadgeCheck, Crop, ImageUp, PackagePlus, ScanSearch, SearchX, Sparkles, X } from 'lucide-preact';
import { askWithPhoto, forgetPhoto, keptPhoto, PhotoError, searchPhoto, similarTo, type Box, type PhotoResults as Results } from '@/lib/photo-search';
import { saveContact, savedContact } from '@/lib/contact';
import { cn, links } from '@/lib/utils';
import { PhotoPanel } from './PhotoPicker';

/**
 * The photo search results page.
 * - A photo (kept for this tab by the search box): shown with a box the shopper can drag to the item
 *   they mean; each change searches again. Best matches first, marked "Same item" / "Close match".
 * - ?like=ID: products that look like that product ("Find similar").
 * Category chips and "In stock only" narrow the list. When nothing close is found: "Ask us to find it",
 * which sends the photo to staff with the shopper's name and phone.
 */
const WHOLE: Box = { x: 0, y: 0, w: 1, h: 1 };
const isWhole = (b: Box) => b.w > 0.97 && b.h > 0.97;

export default function PhotoResults({ likeId = null, whatsapp = null }: { likeId?: number | null; whatsapp?: string | null }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [inStock, setInStock] = useState(false);
  const [newPhoto, setNewPhoto] = useState(false);
  const [cardsHtml, setCardsHtml] = useState<Map<number, Element>>(new Map());
  const grid = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!likeId) setPhoto(keptPhoto());
    setReady(true);
  }, []);

  // Search: on arrival, and again each time the box is moved (the last one wins).
  useEffect(() => {
    if (!ready || (!photo && !likeId)) return;
    const controller = new AbortController();
    setSearching(true);
    setProblem(null);
    (likeId ? similarTo(likeId, controller.signal) : searchPhoto(photo!, box, controller.signal))
      .then(async (r) => {
        // The shop's usual cards (hearts, add to cart), in our order.
        const ids = r.items.map((i) => i.id);
        const html = ids.length ? await (await fetch(`/fragments/cards/?ids=${ids.slice(0, 60).join(',')}`, { signal: controller.signal })).text() : '';
        const t = document.createElement('template');
        t.innerHTML = html;
        t.content.querySelectorAll('script').forEach((s) => s.remove());
        setCardsHtml(new Map([...t.content.querySelectorAll('li[data-item-of]')].map((li) => [Number((li as HTMLElement).dataset.itemOf), li])));
        setResults(r);
        setCategory(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setProblem(err instanceof PhotoError ? err.message : 'No connection. Check your internet and try again.');
      })
      .finally(() => !controller.signal.aborted && setSearching(false));
    return () => controller.abort();
  }, [ready, photo, likeId, box]);

  // Where the server looked closer (the item it found in the photo), until the shopper moves the box.
  const auto = !box && results?.focus ? results.focus : null;
  const shown = (results?.items ?? []).filter((i) => (!category || i.category?.slug === category) && (!inStock || i.inStock));
  const best = results?.items[0];
  const found = best && best.match !== 'similar';

  // Put the cards in the grid, with "Same item" / "Close match" on the close ones.
  useEffect(() => {
    if (!grid.current) return;
    const lis = shown.flatMap((item, n) => {
      const li = cardsHtml.get(item.id);
      if (!li) return [];
      li.querySelector('[data-match]')?.remove();
      if (item.match !== 'similar') {
        const tag = document.createElement('p');
        tag.dataset.match = '';
        tag.className = cn('mb-1.5 inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', item.match === 'same' ? 'bg-brand-600 text-white' : 'bg-lime-100 text-lime-900');
        tag.textContent = item.match === 'same' ? (n === 0 ? 'Best match' : 'Looks the same') : 'Close match';
        li.querySelector('.pc-body')?.prepend(tag);
      }
      return [li];
    });
    grid.current.replaceChildren(...lis);
    document.dispatchEvent(new Event('pt:cards'));
  }, [cardsHtml, category, inStock, results]);

  if (!ready) return <div class="h-96" />;

  // No photo (a new tab, or the photo was dropped): start here.
  if (!photo && !likeId) {
    return (
      <div class="mx-auto max-w-lg py-6">
        <h1 class="font-display text-2xl font-bold tracking-tight sm:text-3xl">Search by photo</h1>
        <div class="mt-4 rounded-2xl bg-white ring-1 ring-zinc-200">
          <PhotoPanel />
        </div>
      </div>
    );
  }

  const heading = likeId ? (
    <>
      Looks like{' '}
      {results?.product ? (
        <a href={links.product(results.product.slug)} class="text-brand-700 hover:underline">
          {results.product.name}
        </a>
      ) : (
        'this product'
      )}
    </>
  ) : searching && !results ? (
    'Looking at your photo…'
  ) : found ? (
    best.match === 'same' ? (
      'We found it'
    ) : (
      'Close matches for your photo'
    )
  ) : (
    'No exact match, but these look similar'
  );

  return (
    <div class="grid gap-5 py-4 sm:py-6 lg:grid-cols-[300px_1fr] lg:gap-8">
      {/* The photo, with the box. */}
      {photo && (
        <aside class="lg:sticky lg:top-28 lg:self-start">
          <PhotoBox photo={photo} box={box ?? auto} onChange={setBox} searching={searching} />
          <p class="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            <Crop class="size-3.5 shrink-0" /> {auto ? 'We looked closer here. Drag the box or its corners to change it.' : 'Drag the box or its corners onto the item you mean.'}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            {(box ? !isWhole(box) : !!auto) && (
              <button type="button" onClick={() => setBox(WHOLE)} class="h-9 cursor-pointer rounded-lg bg-white px-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50">
                Whole photo
              </button>
            )}
            <button type="button" onClick={() => setNewPhoto((v) => !v)} aria-expanded={newPhoto} class="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-zinc-700 ring-1 ring-zinc-300 hover:bg-zinc-50">
              <ImageUp class="size-4" /> New photo
            </button>
          </div>
          {newPhoto && (
            <div class="relative mt-3 rounded-2xl bg-white ring-1 ring-zinc-200">
              <button type="button" onClick={() => setNewPhoto(false)} aria-label="Close" class="absolute top-3 right-3 cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100">
                <X class="size-4" />
              </button>
              <PhotoPanel />
            </div>
          )}
        </aside>
      )}

      <section class={cn('min-w-0', !photo && 'lg:col-span-2')} aria-busy={searching}>
        <h1 class="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          {likeId ? <Sparkles class="size-6 shrink-0 text-brand-600" /> : found ? <BadgeCheck class="size-6 shrink-0 text-brand-600" /> : <ScanSearch class="size-6 shrink-0 text-brand-600" />}
          <span class="min-w-0">{heading}</span>
        </h1>

        {problem && (
          <p class="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {problem}
          </p>
        )}

        {results && results.items.length > 0 && (
          <div class="mt-3 flex flex-wrap items-center gap-2">
            {results.categories.length > 1 && (
              <ul aria-label="Filter by category" class="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <li>
                  <Chip on={!category} onClick={() => setCategory(null)}>
                    All <span class="opacity-60">{results.items.length}</span>
                  </Chip>
                </li>
                {results.categories.map((c) => (
                  <li key={c.slug}>
                    <Chip on={category === c.slug} onClick={() => setCategory(category === c.slug ? null : c.slug)}>
                      {c.name} <span class="opacity-60">{c.count}</span>
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
            <label class="flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-zinc-700 ring-1 ring-zinc-200">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.currentTarget.checked)} class="size-4 accent-brand-600" /> In stock only
            </label>
          </div>
        )}

        <div class={cn('relative mt-4 transition-opacity', searching && results && 'pointer-events-none opacity-50')}>
          {searching && !results && (
            <ul class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i} class="aspect-[3/4] animate-pulse rounded-2xl bg-zinc-100" />
              ))}
            </ul>
          )}
          <ul ref={grid} class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4" aria-label="Matching products" />
          {results && shown.length === 0 && results.items.length > 0 && <p class="py-8 text-center text-sm text-zinc-500">Nothing in stock here. Untick “In stock only” to see all.</p>}
          {results && results.items.length === 0 && (
            <div class="flex flex-col items-center py-10 text-center">
              <SearchX class="size-10 text-zinc-300" />
              <p class="mt-2 font-display text-lg font-bold">Nothing found</p>
            </div>
          )}
        </div>

        {/* Nothing close: staff can look for it. */}
        {photo && results && !found && !searching && <AskUs photo={photo} whatsapp={whatsapp} />}
      </section>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: preact.ComponentChildren }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      class={cn('flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ring-1 transition-colors', on ? 'bg-brand-600 font-semibold text-white ring-brand-600' : 'bg-white text-zinc-700 ring-zinc-200 hover:ring-brand-300')}
    >
      {children}
    </button>
  );
}

type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se';
const MIN = 0.12;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The photo with a box over it: drag the box to move it, or a corner to resize. A new search starts
 * when the finger or mouse is lifted. With no box yet, the whole photo is searched.
 */
function PhotoBox({ photo, box, onChange, searching }: { photo: string; box: Box | null; onChange: (b: Box | null) => void; searching: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Box | null>(null);
  const drag = useRef<{ handle: Handle; x: number; y: number; start: Box } | null>(null);
  const shown = live ?? box ?? WHOLE;

  const down = (handle: Handle) => (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: shown };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    const rect = frame.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.x) / rect.width;
    const dy = (e.clientY - d.y) / rect.height;
    const s = d.start;
    let { x, y, w, h } = s;
    if (d.handle === 'move') {
      x = clamp(s.x + dx, 0, 1 - s.w);
      y = clamp(s.y + dy, 0, 1 - s.h);
    } else {
      if (d.handle.includes('w')) {
        x = clamp(s.x + dx, 0, s.x + s.w - MIN);
        w = s.x + s.w - x;
      } else w = clamp(s.w + dx, MIN, 1 - s.x);
      if (d.handle.includes('n')) {
        y = clamp(s.y + dy, 0, s.y + s.h - MIN);
        h = s.y + s.h - y;
      } else h = clamp(s.h + dy, MIN, 1 - s.y);
    }
    setLive({ x, y, w, h });
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    if (live) {
      const before = box ?? WHOLE;
      const changed = Math.abs(live.x - before.x) + Math.abs(live.y - before.y) + Math.abs(live.w - before.w) + Math.abs(live.h - before.h) > 0.01;
      if (changed) onChange(live);
    }
    setLive(null);
  };

  const corner = 'absolute size-7 touch-none before:absolute before:size-4 before:border-white before:content-[""]';
  return (
    <div class="flex justify-center rounded-2xl bg-zinc-900/95 p-2">
      <div ref={frame} class="relative inline-block max-w-full touch-none overflow-hidden rounded-lg select-none" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <img src={photo} alt="Your photo" class="block max-h-64 w-auto max-w-full lg:max-h-[420px]" draggable={false} />
        <div
          onPointerDown={down('move')}
          class="absolute cursor-move touch-none rounded-md ring-2 ring-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%` }}
          aria-label="Search area"
        >
          {searching && <span class="photo-scan pointer-events-none absolute inset-x-0 h-0.5 bg-lime-300 shadow-[0_0_12px_2px_rgba(190,242,100,0.8)]" />}
          <span onPointerDown={down('nw')} class={cn(corner, '-top-1.5 -left-1.5 cursor-nwse-resize before:top-1 before:left-1 before:rounded-tl-md before:border-t-4 before:border-l-4')} />
          <span onPointerDown={down('ne')} class={cn(corner, '-top-1.5 -right-1.5 cursor-nesw-resize before:top-1 before:right-1 before:rounded-tr-md before:border-t-4 before:border-r-4')} />
          <span onPointerDown={down('sw')} class={cn(corner, '-bottom-1.5 -left-1.5 cursor-nesw-resize before:bottom-1 before:left-1 before:rounded-bl-md before:border-b-4 before:border-l-4')} />
          <span onPointerDown={down('se')} class={cn(corner, '-right-1.5 -bottom-1.5 cursor-nwse-resize before:right-1 before:bottom-1 before:rounded-br-md before:border-r-4 before:border-b-4')} />
        </div>
      </div>
    </div>
  );
}

/** "Can't find it? We'll look for it": the photo goes to staff with a name and phone. */
function AskUs({ photo, whatsapp }: { photo: string; whatsapp: string | null }) {
  const saved = savedContact();
  const [name, setName] = useState(saved.name ?? '');
  const [phone, setPhone] = useState(saved.phone ?? '');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const bot = useRef<HTMLInputElement>(null);
  const input = 'mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-[15px] aria-[invalid=true]:border-red-500';

  // A message under a box goes as soon as the shopper types in it.
  const clear = (field: string) => setErrors((old) => (old[field] ? Object.fromEntries(Object.entries(old).filter(([k]) => k !== field && k !== 'form')) : old));
  const send = async (e: Event) => {
    e.preventDefault();
    const missing: Record<string, string> = {};
    if (!name.trim()) missing.name = 'Enter your name';
    if (!phone.trim()) missing.phone = 'Enter your phone number';
    setErrors(missing);
    if (Object.keys(missing).length) return;
    setSending(true);
    try {
      const r = await askWithPhoto(photo, { name: name.trim(), phone: phone.trim(), details: details.trim() || 'Do you have this? (see the photo)', website: bot.current?.value ?? '' });
      if (!r.ok) return setErrors(Object.keys(r.fields).length ? r.fields : { form: r.message });
      saveContact({ name: name.trim(), phone: phone.trim() });
      setSent(true);
      forgetPhoto();
    } catch {
      setErrors({ form: 'No connection. Check your internet and try again.' });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div class="mt-8 rounded-2xl bg-lime-50 p-5 text-center ring-1 ring-lime-200" role="status">
        <p class="font-display text-lg font-bold text-brand-800">Thank you! We got your photo.</p>
        <p class="mt-1 text-sm text-zinc-600">We’ll look for it and call you on {phone} soon.</p>
      </div>
    );
  }
  return (
    <form onSubmit={send} novalidate class="mt-8 max-w-xl rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
      <p class="flex items-center gap-2 font-display text-base font-bold text-zinc-900">
        <PackagePlus class="size-5 text-brand-600" /> Can’t see it? We’ll find it for you
      </p>
      <p class="mt-1 text-sm text-zinc-500">
        We send your photo to our team. They’ll call you back, usually the same day.
        {whatsapp && (
          <>
            {' '}
            Or{' '}
            <a href={`https://wa.me/88${whatsapp}?text=${encodeURIComponent('Hello PaperTree, do you have this item? (I will send a photo)')}`} target="_blank" rel="noopener noreferrer" class="font-medium text-brand-700 hover:underline">
              send it on WhatsApp
            </a>
            .
          </>
        )}
      </p>
      <label class="mt-4 block text-sm font-medium text-zinc-800">
        Anything to add? <span class="font-normal text-zinc-500">(optional)</span>
        <input value={details} onInput={(e) => setDetails(e.currentTarget.value)} maxLength={1000} placeholder="Colour, size, how many…" class={input} />
      </label>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label class="block text-sm font-medium text-zinc-800">
          Your name
          <input value={name} onInput={(e) => (setName(e.currentTarget.value), clear('name'))} autocomplete="name" maxLength={100} aria-invalid={!!errors.name} class={input} />
          {errors.name && <span class="mt-1 block text-sm font-normal text-red-600">{errors.name}</span>}
        </label>
        <label class="block text-sm font-medium text-zinc-800">
          Phone
          <input value={phone} onInput={(e) => (setPhone(e.currentTarget.value), clear('phone'))} type="tel" inputMode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" maxLength={20} aria-invalid={!!errors.phone} class={input} />
          {errors.phone && <span class="mt-1 block text-sm font-normal text-red-600">{errors.phone}</span>}
        </label>
      </div>
      {/* Only bots fill this box (it is hidden from people). */}
      <input ref={bot} name="website" tabIndex={-1} autocomplete="off" aria-hidden="true" class="absolute -left-[9999px] size-px opacity-0" />
      {(errors.form || errors.photo || errors.details) && <p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form ?? errors.photo ?? errors.details}</p>}
      <button type="submit" disabled={sending} class="mt-4 h-11 w-full cursor-pointer rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {sending ? 'Sending…' : 'Send the photo to the shop'}
      </button>
    </form>
  );
}
