import { useEffect, useState } from 'preact/hooks';
import { UserCog } from 'lucide-preact';
import { loadMe } from '@/lib/account';
import { API_PUBLIC_URL } from '@/lib/utils';
import { forgetCustomer } from './StaffBanner';

/** Opens a staff member's one-time "log in as customer" link (the token is after the #). */
export default function LoginAs() {
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    const token = location.hash.slice(1);
    // The token leaves the address bar at once.
    history.replaceState(history.state, '', location.pathname);
    if (!token) return setProblem('This link is not complete. Make a new one in the admin.');
    fetch(`${API_PUBLIC_URL}/v1/store/auth/as`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (r) => {
        if (!r.ok) {
          const e = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          return setProblem(e?.error?.message ?? 'This link has expired or was already used. Make a new one in the admin.');
        }
        // Start clean: nothing of this browser's own cart or saved details mixes with the customer's.
        forgetCustomer();
        await loadMe(true);
        location.replace('/account/');
      })
      .catch(() => setProblem('No connection. Please try again.'));
  }, []);
  return (
    <div class="mx-auto mt-16 flex max-w-md flex-col items-center px-4 text-center">
      <span class="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <UserCog class="size-7" />
      </span>
      {problem ? (
        <>
          <p class="mt-4 font-display text-xl font-bold text-zinc-900">Could not log in as the customer</p>
          <p class="mt-1 text-zinc-600">{problem}</p>
        </>
      ) : (
        <p class="mt-4 font-display text-xl font-bold text-zinc-900" role="status">
          Logging in as the customer…
        </p>
      )}
    </div>
  );
}
