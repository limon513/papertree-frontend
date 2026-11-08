import { useEffect, useState } from 'preact/hooks';
import { ArrowRight, X } from 'lucide-preact';
import BuyBox from './BuyBox';
import { buyData } from '@/lib/product';
import type { Product } from '@/lib/types';
import { API_PUBLIC_URL, imageAt, links, srcSet } from '@/lib/utils';

/**
 * The "choose options" window: a product card with options (colours, sizes) opens this instead of
 * leaving the page. Same buy box as the product page. Cards call window.ptQuick(slug); until this
 * window is ready they open the product page instead.
 */
export default function QuickBuy() {
  const [slug, setSlug] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    window.ptQuick = (next) => {
      setSlug(next);
      setProduct(null);
    };
    return () => {
      window.ptQuick = undefined;
    };
  }, []);

  // Load the product when the window opens.
  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    fetch(`${API_PUBLIC_URL}/v1/store/products/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Product>) : Promise.reject(new Error(String(r.status)))))
      .then((p) => {
        setProduct(p);
        setShown(buyData(p).start);
      })
      .catch((err: Error) => {
        // Offline or gone: the product page explains.
        if (err.name !== 'AbortError') location.href = links.product(slug);
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSlug(null);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [slug]);

  if (!slug) return null;
  const close = () => setSlug(null);
  const data = product ? buyData(product) : null;
  const picture = data?.pictures[shown] ?? data?.pictures[0] ?? null;

  return (
    <div class="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-zinc-950/40 sm:items-center sm:p-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? `Choose options: ${product.name}` : 'Choose options'}
        onClick={(e) => e.stopPropagation()}
        class="relative max-h-[92dvh] w-full animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-3xl sm:animate-fade-in sm:rounded-3xl sm:p-6"
      >
        <button type="button" onClick={close} aria-label="Close" class="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-1.5 text-zinc-500 hover:bg-zinc-100">
          <X class="size-5" />
        </button>
        {!product || !data ? (
          <div class="grid gap-5 sm:grid-cols-2" aria-busy="true">
            <div class="aspect-square animate-pulse rounded-2xl bg-zinc-100" />
            <div class="space-y-3 pt-2">
              <div class="h-6 w-3/4 animate-pulse rounded bg-zinc-100" />
              <div class="h-8 w-1/3 animate-pulse rounded bg-zinc-100" />
              <div class="h-10 w-full animate-pulse rounded-full bg-zinc-100" />
            </div>
          </div>
        ) : (
          <div class="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div class="mx-auto aspect-square w-48 overflow-hidden rounded-2xl bg-zinc-50 sm:w-full">
              {picture && <img src={imageAt(picture, 800)} srcset={srcSet(picture)} sizes="(min-width: 640px) 360px, 192px" alt={picture.alt ?? product.name} class="size-full object-contain p-3" />}
            </div>
            <div>
              {product.brand && <p class="text-xs font-semibold tracking-wide text-brand-700 uppercase">{product.brand.name}</p>}
              <h2 class="mt-1 pr-8 font-display text-xl leading-tight font-bold text-zinc-900">{product.name}</h2>
              <BuyBox
                productId={product.id}
                slug={product.slug}
                name={product.name}
                options={product.options}
                variants={data.variants}
                startId={data.first.id}
                inWindow={{ onPicture: (i) => i >= 0 && setShown(i), onAdded: close }}
              />
              <a href={links.product(product.slug)} class="mt-4 flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                See full details <ArrowRight class="size-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
