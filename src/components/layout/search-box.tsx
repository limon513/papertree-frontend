'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import type { Suggestions } from '@/lib/types';
import { API_PUBLIC_URL, cn, iconUrl, imageAt, links, money } from '@/lib/utils';

/** The big search box: suggestions as you type, Enter for all results. */
export function SearchBox({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ q: string; result: Suggestions } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const query = text.trim();

  // Ask the API after a short pause in typing.
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
        // Typing on, or offline: keep what is shown.
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // Only show results for what is typed now.
  const result = data && data.q === query ? data.result : null;
  const products = result?.products ?? [];

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const submit = () => {
    if (active >= 0 && products[active]) return go(links.product(products[active].slug));
    if (query) go(`/search/?q=${encodeURIComponent(query)}`);
  };

  const showPanel = open && query.length >= 2 && (result !== null || loading);

  return (
    <div ref={box} className={cn('relative', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex h-11 items-center rounded-full bg-zinc-100 pr-1 pl-4 ring-brand-500 transition focus-within:bg-white focus-within:ring-2"
      >
        <Search className="size-[18px] shrink-0 text-zinc-500" />
        <input
          type="search"
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => {
            setText(e.target.value);
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
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls={listId}
          autoComplete="off"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] outline-none placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <Loader2 className="mr-1 size-4 animate-spin text-zinc-400" />}
        {text && !loading && (
          <button type="button" onClick={() => setText('')} aria-label="Clear search" className="mr-1 rounded-full p-1.5 text-zinc-400 hover:text-zinc-700">
            <X className="size-4" />
          </button>
        )}
        <button type="submit" className="flex h-9 items-center rounded-full bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
          Search
        </button>
      </form>

      {showPanel && (
        <div id={listId} className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200 animate-fade-in">
          {result && (result.categories.length > 0 || result.brands.length > 0) && (
            <div className="flex flex-wrap gap-2 border-b border-zinc-100 p-3">
              {result.categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => go(`/product-category/${c.slug}/`)}
                  className="flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-3 pl-1.5 text-sm text-brand-800 hover:bg-brand-100"
                >
                  {c.icon ? <img src={iconUrl(c.icon)} alt="" className="size-5" /> : <span className="size-1" />}
                  {c.name}
                </button>
              ))}
              {result.brands.map((b) => (
                <button
                  key={b.slug}
                  type="button"
                  onClick={() => go(links.brand(b.slug))}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200"
                >
                  Brand: {b.name}
                </button>
              ))}
            </div>
          )}
          {products.length > 0 ? (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {products.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={links.product(p.slug)}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex items-center gap-3 px-3 py-2', i === active && 'bg-zinc-50')}
                  >
                    <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-50">
                      {p.image && <img src={imageAt(p.image, 160)} alt="" className="size-full object-contain" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm text-zinc-800">{p.name}</span>
                      <span className="text-xs text-zinc-500">
                        {p.brand?.name}
                        {!p.inStock && ' · out of stock'}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 tabular-nums">{money(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            result && <p className="px-4 py-5 text-sm text-zinc-500">No products match “{query}”. Try a shorter word.</p>
          )}
          {result && result.total > products.length && (
            <button
              type="button"
              onClick={submit}
              className="flex w-full items-center justify-center gap-1.5 border-t border-zinc-100 py-3 text-sm font-semibold text-brand-700 hover:bg-zinc-50"
            >
              See all {result.total} results <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
