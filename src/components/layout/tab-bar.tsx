'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Percent, Search, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** Bottom tab bar on phones and tablets. */
export function TabBar() {
  const pathname = usePathname();
  const { count } = useCart();
  const tabs = [
    { href: '/', label: 'Home', Icon: Home, active: pathname === '/' },
    { href: '/categories/', label: 'Categories', Icon: LayoutGrid, active: pathname.startsWith('/categories') || pathname.startsWith('/product-category') },
    { href: '/search/', label: 'Search', Icon: Search, active: pathname.startsWith('/search') },
    { href: '/deals/', label: 'Deals', Icon: Percent, active: pathname.startsWith('/deals') },
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {tabs.map(({ href, label, Icon, active }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active ? 'text-brand-700' : 'text-zinc-500')}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => ui.open('cart')}
            aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-zinc-500"
          >
            <span className="relative">
              <ShoppingBag className="size-[22px]" strokeWidth={1.8} />
              {count > 0 && (
                <span
                  key={count}
                  className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white"
                >
                  {count}
                </span>
              )}
            </span>
            Cart
          </button>
        </li>
      </ul>
    </nav>
  );
}
