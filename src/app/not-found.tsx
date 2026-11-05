import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <SearchX className="size-12 text-zinc-400" />
      <h1 className="mt-4 font-display text-2xl font-bold">We couldn’t find that page</h1>
      <p className="mt-2 text-zinc-600">It may have moved, or the product is no longer sold. Try searching for it.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          Go home
        </Link>
        <Link href="/search/" className="rounded-full px-5 py-2.5 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300">
          Search
        </Link>
      </div>
    </div>
  );
}
