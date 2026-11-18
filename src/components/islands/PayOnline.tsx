import { useState } from 'preact/hooks';
import { Banknote, Loader2, Lock, RefreshCw } from 'lucide-preact';
import { API_PUBLIC_URL, cn, money } from '@/lib/utils';

/**
 * Buttons on the order page for paying online: pay now (on to SSLCommerz's payment page), pay cash on
 * delivery instead, or check again while a payment is being confirmed. The amount is worked out by
 * the shop again when the payment opens.
 */
export default function PayOnline({
  token,
  amount,
  label = 'Pay',
  allowCod = false,
  checking = false,
  compact = false,
}: {
  token: string;
  amount: number;
  label?: string;
  allowCod?: boolean;
  /** A payment is waiting for SSLCommerz's answer: "Check again" first, paying again only if they did not pay. */
  checking?: boolean;
  /** A small link-like button (an offer on a cash-on-delivery order). */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<'pay' | 'cod' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const page = `/checkout/thank-you/?o=${encodeURIComponent(token)}`;

  const post = async (what: 'pay' | 'cod') => {
    setBusy(what);
    setProblem(null);
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/orders/${encodeURIComponent(token)}/${what}`, { method: 'POST' });
      const data = (await res.json().catch(() => null)) as { payUrl?: string; error?: { message?: string } } | null;
      if (res.ok && what === 'pay' && data?.payUrl) {
        location.href = data.payUrl;
        return;
      }
      if (res.ok && what === 'cod') {
        location.replace(page);
        return;
      }
      // Already paid (another tab, or the IPN came first): the page shows it.
      if (res.status === 409) {
        location.replace(page);
        return;
      }
      setProblem(data?.error?.message ?? 'That did not work. Please try again.');
    } catch {
      setProblem('No connection. Check your internet and try again.');
    }
    setBusy(null);
  };

  if (compact) {
    return (
      <span class="inline-flex flex-col">
        <button type="button" disabled={!!busy} onClick={() => void post('pay')} class="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-brand-700 hover:underline disabled:opacity-60">
          {busy ? <Loader2 class="size-4 animate-spin" /> : <Lock class="size-4" />} {label} {money(amount)} online
        </button>
        {problem && <span class="mt-1 text-sm text-red-700">{problem}</span>}
      </span>
    );
  }
  const primary = 'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-60';
  return (
    <div>
      <div class="flex flex-wrap gap-2">
        {checking && (
          <a href={page} class={cn(primary, 'bg-brand-600 text-white hover:bg-brand-700')}>
            <RefreshCw class="size-4" /> Check again
          </a>
        )}
        <button type="button" disabled={!!busy} onClick={() => void post('pay')} class={cn(primary, checking ? 'bg-white text-zinc-800 ring-1 ring-zinc-300 hover:ring-zinc-400' : 'bg-brand-600 text-white hover:bg-brand-700')}>
          {busy === 'pay' ? <Loader2 class="size-4 animate-spin" /> : <Lock class="size-4" />}
          {checking ? 'Did not pay? Pay again' : `${label} ${money(amount)} now`}
        </button>
        {allowCod && (
          <button type="button" disabled={!!busy} onClick={() => void post('cod')} class={cn(primary, 'bg-white text-zinc-800 ring-1 ring-zinc-300 hover:ring-zinc-400')}>
            {busy === 'cod' ? <Loader2 class="size-4 animate-spin" /> : <Banknote class="size-4" />} Pay cash on delivery instead
          </button>
        )}
      </div>
      {problem && (
        <p class="mt-2 text-sm text-red-700" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
