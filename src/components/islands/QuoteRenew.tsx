import { useState } from 'preact/hooks';
import { RotateCcw } from 'lucide-preact';
import { orderAgain } from '@/lib/account';

/** An expired quotation: its items go back into the cart (today's prices), then a new quotation is made. */
export default function QuoteRenew({ items }: { items: { variantId: number | null; quantity: number }[] }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await orderAgain(items);
      if (!r.added) {
        setNote('These products are no longer available. Please call us.');
        return;
      }
      location.href = '/quotation/';
    } catch {
      setNote('No connection. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button type="button" onClick={() => void go()} disabled={busy} class="flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        <RotateCcw class="size-4" /> {busy ? 'Adding…' : 'Get a new one at today’s prices'}
      </button>
      {note && <p class="mt-2 text-sm text-red-700">{note}</p>}
    </div>
  );
}
