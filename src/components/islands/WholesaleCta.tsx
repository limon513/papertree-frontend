import { CheckCircle2, Clock } from 'lucide-preact';
import { useMe } from '@/lib/account';
import { cn } from '@/lib/utils';

/**
 * The Wholesale page's main button. It knows the shopper: everyone is sent to the business sign-up
 * (which asks them to sign in first); a pending request and an approved account say so instead.
 */
export default function WholesaleCta({ whatsapp, dark = false }: { whatsapp: string | null; dark?: boolean }) {
  const m = useMe();
  const request = m?.businessRequest;
  const primary = cn('flex h-12 items-center rounded-xl px-6 font-semibold', dark ? 'bg-white text-brand-800 hover:bg-brand-50' : 'bg-brand-700 text-white hover:bg-brand-800');
  const second = cn('flex h-12 items-center rounded-xl px-6 font-semibold ring-1', dark ? 'text-white ring-white/40 hover:bg-white/10' : 'text-brand-700 ring-brand-200 hover:bg-brand-50');
  const note = cn('flex items-start gap-2 text-sm', dark ? 'text-brand-100' : 'text-zinc-600');

  if (m?.business) {
    return (
      <div class="flex flex-col items-start gap-3">
        <p class={note}>
          <CheckCircle2 class="mt-0.5 size-4 shrink-0" /> Your business account is active: you see wholesale prices while signed in.
        </p>
        <a href="/shop/" class={primary}>
          Start shopping
        </a>
      </div>
    );
  }
  if (request?.status === 'pending') {
    return (
      <div class="flex flex-col items-start gap-3">
        <p class={note}>
          <Clock class="mt-0.5 size-4 shrink-0" /> We got your request{request.businessName ? ` for ${request.businessName}` : ''}. We will call you on {m!.phone} to confirm it.
        </p>
        <a href="/account/#business" class={second}>
          See your request
        </a>
      </div>
    );
  }
  return (
    <div class="flex flex-wrap gap-2">
      <a href="/account/?business" class={primary}>
        Ask for wholesale prices
      </a>
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" class={second}>
          Ask on WhatsApp
        </a>
      )}
    </div>
  );
}
