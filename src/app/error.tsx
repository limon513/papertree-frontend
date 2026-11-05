'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

/** A page could not be made (usually the shop API is busy or restarting). Header and footer stay. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <RefreshCw className="size-10 text-brand-600" />
      <h1 className="mt-4 font-display text-2xl font-bold">This page didn’t load</h1>
      <p className="mt-2 text-zinc-600">The shop is busy for a moment. Please try again — your cart is safe.</p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={reset} className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          Try again
        </button>
        <Link href="/" className="rounded-full px-5 py-2.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300">
          Go home
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-zinc-400">Error code: {error.digest}</p>}
    </div>
  );
}
