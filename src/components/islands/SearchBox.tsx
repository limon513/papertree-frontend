import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { ArrowRight, Loader2, Search, X } from 'lucide-preact';
import type { Suggestions } from '@/lib/types';
import { API_PUBLIC_URL, cn, iconUrl, imageAt, links, money } from '@/lib/utils';

/** The big search box: suggestions as you type, Enter for all results. */
export default function SearchBox({ className, initial = '', autoFocus = false }: { className?: string; initial?: string; autoFocus?: boolean }) {
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ q: string; result: Suggestions } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const query = text.trim();

  // The page has two boxes (computer and phone header): only the one on screen takes the cursor.
  useEffect(() => {
    if (autoFocus && input.current?.offsetParent) input.current.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_PUBLIC_URL}/v1/store/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (res.ok) setData({ q: query, result: (await res.json()) as Suggestions });
      } catch {
        // Typing on, or offline.
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const result = data && data.q === query ? data.result : null;
  const products = result?.products ?? [];
  const go = (href: string) => {
    setOpen(false);
    location.href = href;
  };
  const submit = () => {
    if (active >= 0 && products[active]) return go(links.product(products[active].slug));
    if (query) go(`/search/?q=${encodeURIComponent(query)}`);
  };
  const showPanel = open && query.length >= 2 && (result !== null || loading);

  return (
    <div ref={box} class={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        class="flex h-11 items-center rounded-full bg-zinc-100 pr-1 pl-4 ring-brand-500 transition focus-within:bg-white focus-within:ring-2"
      >
        <Search class="size-[18px] shrink-0 text-zinc-500" />
        <input
          type="search"
          value={text}
          onInput={(e) => {
            setText(e.currentTarget.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(products.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search pens, paper, colours…"
          ref={input}
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls={listId}
          autocomplete="off"
          enterKeyHint="search"
          class="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] outline-none placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {/* Always the same width, so the box never jumps while typing. Enter searches. */}
        <span class="flex size-9 shrink-0 items-center justify-center">
          {loading ? (
            <Loader2 class="size-4 animate-spin text-zinc-400" />
          ) : text ? (
            <button type="button" onClick={() => setText('')} aria-label="Clear search" class="rounded-full p-1.5 text-zinc-400 hover:text-zinc-700">
              <X class="size-4" />
            </button>
          ) : null}
        </span>
      </form>
      {showPanel && (
        <div id={listId} class="absolute inset-x-0 top-full z-50 mt-2 animate-fade-in overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200">
          {result?.search?.corrected && result.total > 0 && (
            <p class="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
              Showing results for <strong class="text-zinc-800">“{result.search.searched}”</strong>
            </p>
          )}
          {result && (result.categories.length > 0 || result.brands.length > 0) && (
            <div class="flex flex-wrap gap-2 border-b border-zinc-100 p-3">
              {result.categories.map((c) => (
                <a key={c.slug} href={`/product-category/${c.slug}/`} class="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-3 pl-1.5 text-sm text-brand-800 hover:bg-brand-100">
                  {c.icon ? <img src={iconUrl(c.icon)} alt="" class="size-5" /> : <span class="size-1" />}
                  {c.name}
                </a>
              ))}
              {result.brands.map((b) => (
                <a key={b.slug} href={links.brand(b.slug)} class="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200">
                  Brand: {b.name}
                </a>
              ))}
            </div>
          )}
          {products.length > 0 ? (
            <ul class="max-h-[60vh] overflow-y-auto py-1">
              {products.map((p, i) => (
                <li key={p.id}>
                  <a href={links.product(p.slug)} onMouseEnter={() => setActive(i)} class={cn('flex items-center gap-3 px-3 py-2', i === active && 'bg-zinc-50')}>
                    <span class="size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-50">
                      {p.image && <img src={imageAt(p.image, 160)} alt="" class="size-full object-contain" />}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="line-clamp-1 text-sm text-zinc-800">{p.name}</span>
                      <span class="text-xs text-zinc-500">
                        {p.brand?.name}
                        {!p.inStock && ' · out of stock'}
                      </span>
                    </span>
                    <span class="text-sm font-semibold text-zinc-900 tabular-nums">{money(p.price)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            result && <p class="px-4 py-5 text-sm text-zinc-500">No products match “{query}”. Try a shorter word.</p>
          )}
          {result && result.total > products.length && (
            <button type="button" onClick={submit} class="flex w-full items-center justify-center gap-1.5 border-t border-zinc-100 py-3 text-sm font-semibold text-brand-700 hover:bg-zinc-50">
              See all {result.total} results <ArrowRight class="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
