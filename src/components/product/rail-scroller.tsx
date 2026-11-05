'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Horizontal list that snaps to items, with arrow buttons on computers. */
export function RailScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const move = (direction: 1 | -1) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.9, behavior: 'smooth' });

  return (
    <div className="relative">
      <ul ref={ref} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:px-0">
        {children}
      </ul>
      {[
        { dir: -1 as const, hidden: edges.start, Icon: ChevronLeft, side: '-left-4', label: 'Previous' },
        { dir: 1 as const, hidden: edges.end, Icon: ChevronRight, side: '-right-4', label: 'Next' },
      ].map(({ dir, hidden, Icon, side, label }) => (
        <button
          key={dir}
          type="button"
          onClick={() => move(dir)}
          aria-label={label}
          className={cn(
            'absolute top-[38%] hidden size-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md ring-1 ring-zinc-200 transition hover:text-brand-700 lg:flex',
            side,
            hidden && 'pointer-events-none opacity-0',
          )}
        >
          <Icon className="size-5" />
        </button>
      ))}
    </div>
  );
}
