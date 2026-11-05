import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { Catalog } from '@/lib/types';
import { links } from '@/lib/utils';

const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok' } as const;

export function Footer({ catalog }: { catalog: Catalog }) {
  const { store, categories } = catalog;
  const social = Object.entries(store.social).filter((e): e is [keyof typeof SOCIAL_LABELS, string] => !!e[1]);
  return (
    <footer className="mt-12 bg-brand-950 text-brand-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="font-display text-xl font-bold text-white uppercase">{store.name}</div>
          {store.tagline && <p className="mt-2 text-sm text-brand-200">{store.tagline}</p>}
          {social.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {social.map(([key, url]) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20">
                    {SOCIAL_LABELS[key]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link href={links.category([c.slug])} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">More</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/deals/" className="hover:text-white">Deals</Link>
            </li>
            <li>
              <Link href="/new/" className="hover:text-white">New arrivals</Link>
            </li>
            <li>
              <Link href="/brands/" className="hover:text-white">All brands</Link>
            </li>
            <li>
              <Link href="/shop/" className="hover:text-white">All products</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Contact us</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {store.phone && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" />
                <a href={`tel:${store.phone}`} className="hover:text-white">{store.phone}</a>
              </li>
            )}
            {store.email && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0" />
                <a href={`mailto:${store.email}`} className="break-all hover:text-white">{store.email}</a>
              </li>
            )}
            {store.address && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                {store.address}
              </li>
            )}
            {store.openingHours && (
              <li className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" />
                {store.openingHours}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-brand-300 sm:px-6">
          <span>© {new Date().getFullYear()} {store.name} Bangladesh</span>
          <span>Cash on delivery · bKash · Nagad · Cards</span>
        </div>
      </div>
    </footer>
  );
}
