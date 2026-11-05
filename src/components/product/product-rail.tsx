import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ProductCard as Card } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProductCard } from './product-card';
import { RailScroller } from './rail-scroller';

/** A titled row of products: swipe on phones, arrows on computers. */
export function ProductRail({
  title,
  icon,
  href,
  products,
  tone = 'plain',
}: {
  title: string;
  icon?: ReactNode;
  href?: string;
  products: Card[];
  /** "deals" puts the row on a soft highlighter-yellow band. */
  tone?: 'plain' | 'deals';
}) {
  if (!products.length) return null;
  return (
    <section className={cn('py-6 sm:py-8', tone === 'deals' && 'bg-marigold-50')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            {icon}
            {title}
          </h2>
          {href && (
            <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
              See all <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
        <RailScroller>
          {products.map((p) => (
            <li key={p.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] md:w-[23%] lg:w-[calc((100%-5*0.75rem)/6)]">
              <ProductCard product={p} className="h-full" />
            </li>
          ))}
        </RailScroller>
      </div>
    </section>
  );
}
