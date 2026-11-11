import { useEffect, useState } from 'preact/hooks';
import { UserRound } from 'lucide-preact';
import { initialOf, openSignIn, useMe } from '@/lib/account';
import { cn } from '@/lib/utils';

/**
 * Their Google photo (shown straight from Google, nothing stored by us), else the first letter of
 * their name. Google refuses its pictures to pages that send the page address, hence no-referrer.
 */
export function Avatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (url && !broken) {
    return <img src={url} alt="" width={40} height={40} referrerpolicy="no-referrer" onError={() => setBroken(true)} class={cn('rounded-full bg-zinc-100 object-cover', className)} />;
  }
  return <span class={cn('flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800', className)}>{initialOf(name)}</span>;
}

/** Header: "Sign in", or their picture (to the account page). Always the same size: nothing moves. */
export function HeaderAccount({ className }: { className?: string }) {
  const m = useMe();
  if (m) {
    return (
      <a href="/account/" aria-label={`Your account (${m.name})`} class={cn('flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ring-zinc-200 hover:ring-brand-400', className)}>
        <Avatar name={m.name} url={m.avatarUrl} className="size-9 text-sm" />
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openSignIn()}
      aria-label="Sign in"
      // Until we know, the button is there but quiet (no jump when it turns into the picture).
      class={cn('flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-brand-700', m === undefined && 'opacity-60', className)}
    >
      <UserRound class="size-5" strokeWidth={2} />
    </button>
  );
}

/** "Account" in the phone tab bar. */
export function TabAccount({ active }: { active: boolean }) {
  const m = useMe();
  const look = cn('flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium', active ? 'text-brand-700' : 'text-zinc-500');
  if (m) {
    return (
      <a href="/account/" aria-current={active ? 'page' : undefined} class={look}>
        <Avatar name={m.name} url={m.avatarUrl} className={cn('size-[24px] text-[11px]', active && 'ring-2 ring-brand-600')} />
        Account
      </a>
    );
  }
  return (
    <button type="button" onClick={() => openSignIn()} class={look}>
      <UserRound class="size-[22px]" strokeWidth={1.8} />
      Sign in
    </button>
  );
}
