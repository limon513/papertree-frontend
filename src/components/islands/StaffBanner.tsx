import { useEffect, useState } from 'preact/hooks';
import { UserCog } from 'lucide-preact';
import { cart } from '@/lib/cart';
import { loadMe, signOut, staffView, useMe } from '@/lib/account';

/** What a staff member's browser should not keep from a customer it helped: their cart and details. */
export function forgetCustomer() {
  cart.clear();
  try {
    localStorage.removeItem('pt-contact');
  } catch {
    // Fine.
  }
}

/**
 * A staff member logged in as a customer (from the admin): a bar on every page saying so, with the
 * time left and "End". When the 30 minutes are up, the browser is signed out.
 */
export default function StaffBanner() {
  const m = useMe();
  const staff = staffView.value;
  const [now, setNow] = useState(Date.now());
  useEffect(() => void loadMe(), []);
  useEffect(() => {
    if (!staff) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [staff?.until]);

  const left = staff ? Math.ceil((new Date(staff.until).getTime() - now) / 60_000) : 0;
  const end = async () => {
    await signOut();
    forgetCustomer();
    location.href = '/';
  };
  useEffect(() => {
    if (staff && left <= 0) void end();
  }, [left <= 0, !!staff]);

  if (!staff || !m) return null;
  return (
    <>
      {/* At the top of every page… */}
      <div class="bg-amber-400 text-amber-950 print:hidden" role="status">
        <div class="mx-auto flex max-w-site flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
          <UserCog class="size-4 shrink-0" />
          <span class="min-w-0 flex-1">
            <strong>Staff view:</strong> you ({staff.name}) are logged in as <strong>{m.name}</strong> ({m.phone}). Orders you place are marked with your name.
          </span>
          <span class="tabular-nums">{left > 0 ? `${left} min left` : 'Ending…'}</span>
          <button type="button" onClick={() => void end()} class="h-8 rounded-lg bg-amber-950 px-3 font-semibold text-white hover:bg-black">
            End
          </button>
        </div>
      </div>
      {/* …and always on screen while scrolling (above the phone's tab bar). */}
      <div class="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 z-[70] flex items-center gap-2 rounded-full bg-amber-400 py-1.5 pr-1.5 pl-3 text-xs font-semibold text-amber-950 shadow-lg ring-1 ring-amber-500 lg:bottom-4 print:hidden">
        <UserCog class="size-4" /> Staff view: {m.name}
        <button type="button" onClick={() => void end()} class="rounded-full bg-amber-950 px-2.5 py-1 text-white hover:bg-black">
          End
        </button>
      </div>
    </>
  );
}
