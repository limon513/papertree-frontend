import { useEffect, useState } from 'preact/hooks';
import { Loader2, TicketPercent, X } from 'lucide-preact';
import { cart, cleanCoupon, couponFromLink, useCart } from '@/lib/cart';
import type { CartCheck } from '@/lib/types';
import { cn, money } from '@/lib/utils';

/**
 * The coupon part of a total. The shop works it out on every cart check; this only reads its answer
 * (and only when the answer is for the code in the cart now).
 */
export function couponOf(check: CartCheck | null | undefined, code: string | null) {
  const c = check?.coupon;
  if (!code || !c || c.code !== code) return { itemsOff: 0, deliveryOff: 0, ok: false };
  return { itemsOff: c.ok ? c.itemsOff : 0, deliveryOff: c.ok ? c.deliveryOff : 0, ok: c.ok };
}

/** "Have a coupon?" — type a code, see what it gives (or why not), take it off. */
export function CouponBox({ check, checking, className }: { check: CartCheck | null; checking: boolean; className?: string }) {
  const s = useCart();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const answer = s.coupon && check?.coupon?.code === s.coupon ? check.coupon : null;
  // Business accounts: wholesale prices instead of coupons.
  if (check?.wholesale) return null;

  if (!s.coupon && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} class={cn('flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline', className)}>
        <TicketPercent class="size-4" /> Have a coupon code?
      </button>
    );
  }

  if (!s.coupon) {
    const apply = (e: Event) => {
      e.preventDefault();
      const code = cleanCoupon(typed);
      if (!code) return setError('Letters and numbers only, like SCHOOL10');
      setError(null);
      cart.setCoupon(code);
      setTyped('');
    };
    return (
      <form onSubmit={apply} class={className} noValidate>
        <div class="flex gap-2">
          <input
            value={typed}
            onInput={(e) => (setTyped(e.currentTarget.value.toUpperCase()), setError(null))}
            placeholder="Coupon code"
            aria-label="Coupon code"
            autocomplete="off"
            autocapitalize="characters"
            maxLength={30}
            class="h-11 min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 font-mono text-[15px] tracking-wide uppercase outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <button type="submit" class="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
            Apply
          </button>
        </div>
        {error && <p class="mt-1 text-sm text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div class={cn('rounded-xl px-3 py-2.5 text-sm ring-1', answer?.ok ? 'bg-brand-50 ring-brand-200' : answer ? 'bg-amber-50 ring-amber-200' : 'bg-zinc-50 ring-zinc-200', className)} aria-live="polite">
      <div class="flex items-center gap-2">
        <TicketPercent class={cn('size-4 shrink-0', answer?.ok ? 'text-brand-700' : 'text-zinc-500')} />
        <span class="font-mono font-semibold tracking-wide">{s.coupon}</span>
        {answer?.ok && answer.label && <span class="text-brand-800">· {answer.label}</span>}
        {!answer && checking && <Loader2 class="size-4 animate-spin text-zinc-400" />}
        <button type="button" onClick={() => (cart.setCoupon(null), setOpen(false))} aria-label={`Remove the coupon ${s.coupon}`} class="ml-auto rounded-full p-1 text-zinc-500 hover:bg-white">
          <X class="size-4" />
        </button>
      </div>
      {answer && !answer.ok && <p class="mt-1 text-amber-900">{answer.message}</p>}
      {answer?.ok && answer.itemsOff + answer.deliveryOff === 0 && (
        <p class="mt-1 text-zinc-600">{answer.label === 'Free delivery' ? 'Choose your area: the delivery charge comes off.' : 'Applied.'}</p>
      )}
    </div>
  );
}

/** Opened a shared link with a coupon: say it is in the cart. */
export function CouponLinkNotice() {
  useCart();
  const code = couponFromLink.value;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!code) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [code]);
  if (!code || !visible) return null;
  return (
    <div class="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-3">
      <div role="status" class="pointer-events-auto flex animate-fade-in items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-xl">
        <TicketPercent class="size-4 text-marigold-300" />
        Coupon <span class="font-mono font-semibold">{code}</span> added. It comes off at checkout.
      </div>
    </div>
  );
}

/** A summary row: "Coupon SCHOOL10 −৳120". */
export function CouponRow({ code, off }: { code: string | null; off: number }) {
  if (!code || off <= 0) return null;
  return (
    <div class="flex justify-between text-brand-700">
      <dt>
        Coupon <span class="font-mono">{code}</span>
      </dt>
      <dd class="font-medium tabular-nums">−{money(off)}</dd>
    </div>
  );
}
