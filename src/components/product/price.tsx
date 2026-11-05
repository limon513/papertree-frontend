import { cn, money, percentOff } from '@/lib/utils';

/** Price, with the normal price crossed out and the saving when on sale. */
export function Price({
  price,
  regularPrice,
  from = false,
  size = 'md',
  className,
}: {
  price: number;
  regularPrice: number | null;
  /** "from ৳15" for products with variants at different prices. */
  from?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const off = percentOff(price, regularPrice);
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-1.5', className)}>
      {from && <span className="text-xs text-zinc-500">from</span>}
      <span className={cn('font-semibold text-zinc-900 tabular-nums', size === 'lg' ? 'text-3xl' : 'text-[15px]')}>{money(price)}</span>
      {off > 0 && (
        <>
          <span className={cn('text-zinc-400 tabular-nums line-through', size === 'lg' ? 'text-base' : 'text-xs')}>{money(regularPrice!)}</span>
          {size === 'lg' && (
            <span className="rounded-md bg-marigold-300 px-1.5 py-0.5 text-xs font-semibold text-zinc-900">
              Save {money(regularPrice! - price)} ({off}%)
            </span>
          )}
        </>
      )}
    </div>
  );
}
