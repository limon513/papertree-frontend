import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import type { ProductCard as Card } from '@/lib/types';
import { cn, links, percentOff } from '@/lib/utils';
import { ApiImage } from '@/components/ui/api-image';
import { AddButton } from './add-button';
import { Price } from './price';

/** One product in a grid or row: picture, name, price and a one-tap Add. */
export function ProductCard({ product, className, priority }: { product: Card; className?: string; priority?: boolean }) {
  const off = percentOff(product.price, product.regularPrice);
  return (
    <div className={cn('group flex flex-col rounded-2xl bg-white p-2.5 ring-1 ring-zinc-200/80 transition hover:ring-zinc-300 sm:p-3', className)}>
      <Link href={links.product(product.slug)} className="relative block aspect-square overflow-hidden rounded-xl bg-zinc-50">
        {product.image ? (
          <ApiImage
            image={product.image}
            alt={product.name}
            sizes="(min-width: 1280px) 220px, (min-width: 640px) 30vw, 45vw"
            priority={priority}
            className={cn('size-full p-2 transition duration-300 group-hover:scale-[1.04]', !product.inStock && 'opacity-50')}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-zinc-300">
            <ImageOff className="size-8" />
          </span>
        )}
        {/* Only the discount is marked: "New" on most cards would mean nothing (the New arrivals row covers it). */}
        {off >= 5 && (
          <span className="absolute top-2 left-2 rounded-md bg-marigold-300 px-1.5 py-0.5 text-[11px] font-bold text-zinc-900">−{off}%</span>
        )}
      </Link>
      <div className="mt-2.5 flex flex-1 flex-col px-0.5">
        {/* Always takes its line, so the Add buttons in a row line up. */}
        <span className="h-4 truncate text-[11px] leading-4 font-medium tracking-wide text-zinc-500 uppercase">{product.brand?.name}</span>
        <Link href={links.product(product.slug)} className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-zinc-800 hover:text-brand-700">
          {product.name}
        </Link>
        <Price price={product.price} regularPrice={product.regularPrice} from={product.variantCount > 1} className="mt-1.5" />
        <span className="mt-0.5 h-4 text-xs text-marigold-700">{product.lowStock ? `Only ${product.lowStock} left` : ''}</span>
        <AddButton product={product} className="mt-2" />
      </div>
    </div>
  );
}
