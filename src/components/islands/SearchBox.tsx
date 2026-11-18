import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { ArrowRight, ArrowUpLeft, History, Loader2, Search, TrendingUp, X } from 'lucide-preact';
import type { Suggestions } from '@/lib/types';
import { useMe } from '@/lib/account';
import { clearSearches, forgetSearch, popularSearches, recentSearches, rememberSearch } from '@/lib/searches';
import { wholesalePrices, type WholesalePrice } from '@/lib/wholesale';
import { API_PUBLIC_URL, cn, iconUrl, imageAt, links, money } from '@/lib/utils';

/**
 * The big search box.
 * - Opened, before typing: the shopper's recent searches (their browser only) and popular searches.
 * - While typing: suggested searches ("pen" -> "pencil", "gel pen"), categories, brands and products.
 * Arrow keys move through all of them; Enter opens the chosen one, or searches what is typed.
 */
type Option = { kind: 'recent' | 'popular' | 'term'; text: string } | { kind: 'product'; slug: string };

export default function SearchBox({ className, initial = '', autoFocus = false }: { className?: string; initial?: string; autoFocus?: boolean }) {
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ q: string; result: Suggestions } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const query = text.trim();

  // The page has two boxes (computer and phone header): only the one on screen takes the cursor.
  useEffect(() => {
    if (autoFocus && input.current?.offsetParent) input.current.focus();
    // On the search page: what was searched goes into the shopper's recent searches.
    if (initial.trim()) rememberSearch(initial);
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

  // Close when the shopper taps or clicks elsewhere, or moves on (Tab, the phone keyboard's "Done").
  // A press inside the box (a suggestion, a ×) never closes it first: phones take the focus away
  // from the typing field before the tap lands on the suggestion.
  const pressing = useRef(false);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const inside = !!box.current?.contains(e.target as Node);
      pressing.current = inside;
      if (!inside) setOpen(false);
    };
    const onUp = () => setTimeout(() => (pressing.current = false), 0);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);
  const left = () => {
    setTimeout(() => {
      if (!pressing.current && !box.current?.contains(document.activeElement)) setOpen(false);
    }, 120);
  };

  const result = data && data.q === query ? data.result : null;
  const products = result?.products ?? [];
  const typing = query.length >= 2;
  const terms = typing ? (result?.terms ?? []) : [];
  const shownPopular = popular.filter((p) => !recent.some((r) => r.toLowerCase() === p)).slice(0, 8);

  // Everything the arrow keys move through, in the order shown.
  const options: Option[] = typing
    ? [...terms.map((t) => ({ kind: 'term' as const, text: t })), ...products.map((p) => ({ kind: 'product' as const, slug: p.slug }))]
    : [...recent.map((t) => ({ kind: 'recent' as const, text: t })), ...shownPopular.map((t) => ({ kind: 'popular' as const, text: t }))];
  const at = (o: Option) => options.indexOf(o);

  // A signed-in approved business sees its wholesale prices here too.
  const m = useMe();
  const [wholesale, setWholesale] = useState<Map<number, WholesalePrice>>(new Map());
  const ids = products.map((p) => p.id).join(',');
  useEffect(() => {
    if (!m?.business || !ids) return;
    let live = true;
    void wholesalePrices({ products: ids.split(',').map(Number) }).then((r) => live && setWholesale((old) => new Map([...old, ...r.products])));
    return () => {
      live = false;
    };
  }, [m?.business, ids]);

  const go = (href: string) => {
    setOpen(false);
    location.href = href;
  };
  const search = (q: string) => {
    rememberSearch(q);
    go(`/search/?q=${encodeURIComponent(q)}`);
  };
  const choose = (o: Option) => {
    if (o.kind !== 'product') return search(o.text);
    rememberSearch(query);
    go(links.product(o.slug));
  };
  const submit = () => {
    const o = options[active];
    if (o) return choose(o);
    if (query) search(query);
  };
  const opened = () => {
    setOpen(true);
    setRecent(recentSearches());
    void popularSearches().then(setPopular);
  };
  const remove = (q: string) => {
    forgetSearch(q);
    setRecent(recentSearches());
    setActive(-1);
    input.current?.focus();
  };

  const showPanel = open && (typing ? result !== null || loading : recent.length > 0 || shownPopular.length > 0);
  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div ref={box} onFocusOut={left} class={cn('relative', className)}>
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
          onFocus={opened}
          onClick={() => {
            if (!open) opened();
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!open) opened();
              setActive((a) => Math.min(options.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === 'Escape') {
              // Only close the list: a search field would also empty itself.
              e.preventDefault();
              setOpen(false);
              setActive(-1);
            }
          }}
          placeholder="Search pens, paper, colours…"
          ref={input}
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
          autocomplete="off"
          enterKeyHint="search"
          class="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] outline-none placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {/* Always the same width, so the box never jumps while typing. Enter searches. */}
        <span class="flex size-9 shrink-0 items-center justify-center">
          {loading ? (
            <Loader2 class="size-4 animate-spin text-zinc-400" />
          ) : text ? (
            <button
              type="button"
              onClick={() => {
                setText('');
                setActive(-1);
                input.current?.focus();
              }}
              aria-label="Clear search"
              class="rounded-full p-1.5 text-zinc-400 hover:text-zinc-700"
            >
              <X class="size-4" />
            </button>
          ) : null}
        </span>
      </form>
      {showPanel && (
        <div id={listId} role="listbox" aria-label="Search help" class="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] animate-fade-in overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200">
          {!typing ? (
            <>
              {recent.length > 0 && (
                <div class="py-2">
                  <div class="flex items-center justify-between px-4 pb-1">
                    <p class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Recent searches</p>
                    <button
                      type="button"
                      onClick={() => {
                        clearSearches();
                        setRecent([]);
                        setActive(-1);
                        input.current?.focus();
                      }}
                      class="cursor-pointer text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <ul>
                    {recent.map((t) => {
                      const i = at(options.find((o) => o.kind === 'recent' && o.text === t)!);
                      return (
                        <li key={t} class={cn('group flex items-center', i === active && 'bg-zinc-50')}>
                          <button id={optionId(i)} role="option" aria-selected={i === active} type="button" onClick={() => search(t)} onMouseEnter={() => setActive(i)} class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pr-2 pl-4 text-left text-sm text-zinc-800">
                            <History class="size-4 shrink-0 text-zinc-400" />
                            <span class="truncate">{t}</span>
                          </button>
                          <button type="button" onClick={() => remove(t)} aria-label={`Remove “${t}” from recent searches`} class="mr-2 cursor-pointer rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                            <X class="size-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {shownPopular.length > 0 && (
                <div class={cn('px-4 py-3', recent.length > 0 && 'border-t border-zinc-100')}>
                  <p class="pb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">Popular searches</p>
                  <div class="flex flex-wrap gap-2">
                    {shownPopular.map((t) => {
                      const i = at(options.find((o) => o.kind === 'popular' && o.text === t)!);
                      return (
                        <button
                          key={t}
                          id={optionId(i)}
                          role="option"
                          aria-selected={i === active}
                          type="button"
                          onClick={() => search(t)}
                          onMouseEnter={() => setActive(i)}
                          class={cn('flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1', i === active ? 'bg-lime-50 text-zinc-900 ring-lime-300' : 'bg-white text-zinc-700 ring-zinc-200')}
                        >
                          <TrendingUp class="size-3.5 text-brand-600" />
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {terms.length > 0 && (
                <ul class="border-b border-zinc-100 py-1">
                  {terms.map((t) => {
                    const i = at(options.find((o) => o.kind === 'term' && o.text === t)!);
                    return (
                      <li key={t}>
                        <button id={optionId(i)} role="option" aria-selected={i === active} type="button" onClick={() => search(t)} onMouseEnter={() => setActive(i)} class={cn('flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm text-zinc-800', i === active && 'bg-zinc-50')}>
                          <Search class="size-4 shrink-0 text-zinc-400" />
                          <span class="min-w-0 flex-1 truncate">
                            <Marked text={t} typed={query} />
                          </span>
                          <ArrowUpLeft class="size-4 shrink-0 text-zinc-300" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {result?.search?.corrected && result.total > 0 && (
                <p class="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
                  Showing results for <strong class="text-zinc-800">“{result.search.searched}”</strong>
                </p>
              )}
              {result && (result.categories.length > 0 || result.brands.length > 0) && (
                <div class="flex flex-wrap gap-2 border-b border-zinc-100 p-3">
                  {result.categories.map((c) => (
                    <a key={c.slug} href={`/product-category/${c.slug}/`} onClick={() => rememberSearch(query)} class="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-3 pl-1.5 text-sm text-brand-800 hover:bg-brand-100">
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
                <ul class="py-1">
                  {products.map((p) => {
                    const i = at(options.find((o) => o.kind === 'product' && o.slug === p.slug)!);
                    return (
                      <li key={p.id}>
                        <a id={optionId(i)} role="option" aria-selected={i === active} href={links.product(p.slug)} onClick={() => rememberSearch(query)} onMouseEnter={() => setActive(i)} class={cn('flex items-center gap-3 px-3 py-2', i === active && 'bg-zinc-50')}>
                          <span class="size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-50">{p.image && <img src={imageAt(p.image, 160)} alt="" class="size-full object-contain" />}</span>
                          <span class="min-w-0 flex-1">
                            <span class="line-clamp-1 text-sm text-zinc-800">{p.name}</span>
                            <span class="text-xs text-zinc-500">
                              {p.brand?.name}
                              {!p.inStock && ' · out of stock'}
                            </span>
                          </span>
                          <span class="text-sm font-semibold text-zinc-900 tabular-nums">{money(wholesale.get(p.id)?.price ?? p.price)}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                result && terms.length === 0 && <p class="px-4 py-5 text-sm text-zinc-500">No products match “{query}”. Try a shorter word.</p>
              )}
              {result && result.total > products.length && (
                <button type="button" onClick={() => search(query)} class="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-zinc-100 py-3 text-sm font-semibold text-brand-700 hover:bg-zinc-50">
                  See all {result.total} results <ArrowRight class="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** The suggested search with the typed part in bold where it starts ("pen" in "gel **pen**"). */
function Marked({ text, typed }: { text: string; typed: string }) {
  const q = typed.toLowerCase();
  const start = text.startsWith(q) ? 0 : text.indexOf(` ${q}`) + 1;
  if (!q || start < 0 || (start === 0 && !text.startsWith(q))) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <strong class="font-semibold text-zinc-900">{text.slice(start, start + q.length)}</strong>
      {text.slice(start + q.length)}
    </>
  );
}
