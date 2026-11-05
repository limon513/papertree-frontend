import Link from 'next/link';
import { ArrowRight, Building2, Flame, Phone, Sparkles, Truck, Wallet } from 'lucide-react';
import { getCatalog, getHome } from '@/lib/api';
import { iconUrl, links } from '@/lib/utils';
import { ProductRail } from '@/components/product/product-rail';
import { ApiImage } from '@/components/ui/api-image';

export default async function HomePage() {
  const [home, catalog] = await Promise.all([getHome(), getCatalog()]);
  const { store, categories, brands } = catalog;
  // A few real product pictures for the banner.
  const showcase = [...home.deals, ...home.newArrivals].filter((p) => p.image).slice(0, 4);

  return (
    <>
      {/* Banner: what the shop is, in one look. */}
      <section className="bg-paper">
        {/* Phones: kept short, so products show on the first screen. */}
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-5 sm:px-6 sm:py-8 md:grid-cols-[1.1fr_1fr] md:py-10">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              <Truck className="size-3.5" /> Delivery all over Bangladesh
            </p>
            <h1 className="mt-3 font-display text-[1.7rem] leading-[1.1] font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Paper, pens & art supplies.
              <span className="block text-brand-700">All in one basket.</span>
            </h1>
            <p className="mt-3 hidden max-w-md text-[15px] text-zinc-600 sm:block">
              Add what you need with one tap — school, office or studio. Pay cash when it arrives.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
              <Link href="/deals/" className="flex h-10 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 sm:h-11 sm:px-5">
                Today’s deals <ArrowRight className="size-4" />
              </Link>
              <Link href="/categories/" className="flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 hover:ring-zinc-400 sm:h-11 sm:px-5">
                Browse categories
              </Link>
            </div>
          </div>
          {showcase.length >= 3 && (
            <div className="hidden grid-cols-2 gap-3 md:grid">
              {showcase.map((p, i) => (
                <Link
                  key={p.id}
                  href={links.product(p.slug)}
                  className={`flex aspect-[4/3] items-center justify-center rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/70 transition hover:-translate-y-0.5 ${i % 2 ? 'translate-y-4' : ''}`}
                >
                  <ApiImage image={p.image!} alt={p.name} sizes="240px" priority={i < 2} className="max-h-full" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category shelf. */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:px-0 lg:grid-cols-7">
          {categories.map((c) => (
            <li key={c.id} className="w-24 shrink-0 sm:w-auto">
              <Link
                href={links.category([c.slug])}
                className="flex h-full flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center ring-1 ring-zinc-200/80 transition hover:-translate-y-0.5 hover:ring-brand-300"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50">
                  {c.icon ? <img src={iconUrl(c.icon)} alt="" className="size-9" /> : <Sparkles className="size-6 text-brand-600" />}
                </span>
                <span className="text-xs leading-tight font-medium text-zinc-800 sm:text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Why order here, said once and quietly. */}
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <ul className="grid grid-cols-2 gap-2 text-xs text-zinc-700 sm:grid-cols-4 sm:text-sm">
          {[
            { Icon: Wallet, text: 'Cash on delivery' },
            { Icon: Truck, text: 'All 64 districts' },
            { Icon: Building2, text: 'Wholesale prices' },
            { Icon: Phone, text: store.phone ? `Call ${store.phone}` : 'Order by phone' },
          ].map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2.5">
              <Icon className="size-4 shrink-0 text-brand-600" />
              <span className="truncate">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <ProductRail title="Today’s deals" icon={<Flame className="size-6 text-marigold-500" />} href="/deals/" products={home.deals} tone="deals" />
      {home.bestSellers.length >= 4 && <ProductRail title="Best sellers" href="/shop/?sort=popular" products={home.bestSellers} />}
      <ProductRail title="New arrivals" href="/new/" products={home.newArrivals} />

      {home.categoryRows.map((row) => (
        <ProductRail
          key={row.category.slug}
          title={row.category.name}
          icon={row.category.icon ? <img src={iconUrl(row.category.icon)} alt="" className="size-7" /> : undefined}
          href={links.category([row.category.slug])}
          products={row.products}
        />
      ))}

      {brands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Shop by brand</h2>
            <Link href="/brands/" className="flex items-center gap-1 text-sm font-semibold text-brand-700">
              All brands <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-10">
            {brands.map((b) => (
              <li key={b.slug}>
                <Link
                  href={links.brand(b.slug)}
                  className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-2 text-center ring-1 ring-zinc-200/80 transition hover:ring-brand-300"
                >
                  {b.image ? (
                    <ApiImage image={b.image} alt={b.name} sizes="120px" className="h-9 w-auto" />
                  ) : b.icon ? (
                    <img src={iconUrl(b.icon)} alt="" className="size-8" />
                  ) : null}
                  <span className="text-xs font-semibold text-zinc-800">{b.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Wholesale: until business sign-up is online, by phone or WhatsApp. */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-brand-800 p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <Building2 className="size-10 shrink-0 text-brand-300" />
          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Buying for a shop, school or office?</h2>
            <p className="mt-1 text-sm text-brand-100">Wholesale prices, a small advance and the rest cash on delivery.</p>
          </div>
          {store.whatsapp && (
            <a
              href={`https://wa.me/88${store.whatsapp}?text=${encodeURIComponent('Hello PaperTree, I want to buy wholesale.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 shrink-0 items-center rounded-full bg-white px-5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              Ask on WhatsApp
            </a>
          )}
        </div>
      </section>
    </>
  );
}
