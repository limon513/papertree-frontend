'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import type { CategoryNode } from '@/lib/types';
import { cn, iconUrl, links } from '@/lib/utils';

/** "All categories" on computers: main categories on the left, their sub-categories on the right. */
export function CategoriesMenu({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(0);
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setOpen(false), [pathname]);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  const current = categories[hovered];
  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
          open ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-800 hover:bg-brand-100',
        )}
      >
        <LayoutGrid className="size-4" /> All categories
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 flex w-[720px] animate-fade-in overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200">
          <ul className="w-64 shrink-0 border-r border-zinc-100 bg-zinc-50/60 py-2">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={links.category([c.slug])}
                  onMouseEnter={() => setHovered(i)}
                  className={cn('flex items-center gap-2.5 px-4 py-2 text-sm', i === hovered ? 'bg-white font-medium text-brand-800' : 'text-zinc-700')}
                >
                  {c.icon ? <img src={iconUrl(c.icon)} alt="" className="size-6" /> : <span className="size-6" />}
                  <span className="flex-1">{c.name}</span>
                  <ChevronRight className="size-4 text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
          {current && (
            <div className="flex-1 p-5">
              <Link href={links.category([current.slug])} className="font-display text-lg font-semibold text-zinc-900 hover:text-brand-700">
                {current.name}
              </Link>
              <p className="text-sm text-zinc-500">{current.productCount} products</p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {current.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={links.category([current.slug, child.slug])}
                      className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-brand-50"
                    >
                      {child.icon ? <img src={iconUrl(child.icon)} alt="" className="size-8" /> : <span className="size-8 rounded-lg bg-zinc-100" />}
                      <span className="text-sm text-zinc-800">
                        {child.name}
                        <span className="block text-xs text-zinc-500">{child.productCount} products</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={links.category([current.slug])} className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
                See all {current.name} →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
