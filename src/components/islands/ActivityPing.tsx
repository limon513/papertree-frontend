import { useEffect } from 'preact/hooks';
import { staffView, useMe } from '@/lib/account';
import { API_PUBLIC_URL } from '@/lib/utils';

const LAST_VISIT = 'pt-visit';

/**
 * Tells the shop about a signed-in customer's visit (at most every 30 minutes) and the product they
 * are looking at, so staff understand what they like. Guests send nothing; nor does staff help.
 */
export default function ActivityPing({ productId }: { productId?: number }) {
  const m = useMe();
  useEffect(() => {
    if (!m || staffView.value) return;
    const send = (body: object) =>
      fetch(`${API_PUBLIC_URL}/v1/store/activity`, { method: 'POST', credentials: 'include', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => undefined);
    try {
      const last = Number(localStorage.getItem(LAST_VISIT) ?? 0);
      if (Date.now() - last > 30 * 60_000) {
        localStorage.setItem(LAST_VISIT, String(Date.now()));
        void send({ kind: 'visit' });
      }
    } catch {
      // Storage blocked: the shop counts each visit once in 30 minutes anyway.
      void send({ kind: 'visit' });
    }
    if (productId) void send({ kind: 'product', productId });
  }, [m?.id, productId]);
  return null;
}
