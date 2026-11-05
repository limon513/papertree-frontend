'use client';

import { useEffect } from 'react';
import './globals.css';

/**
 * The whole site could not load (the header needs the catalog from the API). Replaces the layout,
 * so it has its own <html> and <body>.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-paper px-4 font-sans">
        <div className="max-w-md text-center">
          <div className="font-display text-2xl font-bold text-brand-800 uppercase">PaperTree</div>
          <h1 className="mt-6 text-xl font-semibold text-zinc-900">We’ll be right back</h1>
          <p className="mt-2 text-zinc-600">The shop is starting up or being updated. Please try again in a minute — your cart is safe.</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Try again
          </button>
          {error.digest && <p className="mt-6 text-xs text-zinc-400">Error code: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
