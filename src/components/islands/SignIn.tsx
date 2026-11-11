import { useEffect, useRef, useState } from 'preact/hooks';
import { ArrowLeft, Loader2, Phone, X } from 'lucide-preact';
import { api, signedIn, signInOpen, type Me } from '@/lib/account';
import type { GoogleConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'code' | 'name';
type ApiError = { error?: { code?: string; message?: string; fields?: Record<string, string> } };

const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const cleanPhone = (v: string) => v.replace(/[\s()-]/g, '').replace(/^\+?880/, '0');

/** Google's own "G", in its colours (Google asks for it on sign-in buttons). */
const GoogleG = () => (
  <svg viewBox="0 0 48 48" class="size-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
  </svg>
);

/** Google sign-in in a popup. Firebase is loaded only now (it is big), and keeps nothing on the device. */
async function googleIdToken(config: GoogleConfig) {
  const [{ initializeApp, getApps }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const app = getApps()[0] ?? initializeApp(config);
  const a = auth.initializeAuth(app, { persistence: auth.inMemoryPersistence, popupRedirectResolver: auth.browserPopupRedirectResolver });
  const result = await auth.signInWithPopup(a, new auth.GoogleAuthProvider().setCustomParameters({ prompt: 'select_account' }));
  const token = await result.user.getIdToken();
  await a.signOut();
  return token;
}

/**
 * The sign-in window: phone number and a code by SMS, or Google. A new number also gives a name; a
 * first Google sign-in adds a phone once (we deliver by phone), after that Google is one tap.
 */
export default function SignIn({ google }: { google: GoogleConfig | null }) {
  const open = signInOpen.value;
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'code' | 'verify' | 'google' | null>(null);
  const [wait, setWait] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  /** From a first Google sign-in, until a phone is confirmed. */
  const [ticket, setTicket] = useState<{ ticket: string; name: string | null; avatarUrl: string | null } | null>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep('phone');
    setCode('');
    setError(null);
    setTicket(null);
    setDevCode(null);
    try {
      const saved = JSON.parse(localStorage.getItem('pt-contact') ?? 'null') as { phone?: string } | null;
      if (saved?.phone) setPhone(saved.phone);
    } catch {
      // ignore
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [!!open]);

  // The cursor goes to the box of each step.
  useEffect(() => {
    if (open) requestAnimationFrame(() => field.current?.focus());
  }, [!!open, step]);

  // "Send again in 42 s".
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!open) return null;
  const close = () => (signInOpen.value = null);

  const done = (customer: Me) => {
    signedIn(customer);
    const then = open.then;
    close();
    if (then) location.href = then;
  };

  const sendCode = async (e?: Event) => {
    e?.preventDefault();
    const p = cleanPhone(phone);
    if (!/^0\d{9,10}$/.test(p)) return setError('Enter a Bangladeshi number, like 01712345678');
    setError(null);
    setBusy('code');
    try {
      const res = await api('/auth/code', { phone: p });
      const data = (await res.json()) as { seconds?: number; devCode?: string } & ApiError;
      if (!res.ok) return setError(data.error?.fields?.phone ?? data.error?.message ?? 'Could not send the code. Please try again.');
      setPhone(p);
      setCode('');
      setDevCode(data.devCode ?? null);
      setWait(data.seconds ?? 60);
      setStep('code');
    } catch {
      setError('No connection. Check your internet and try again.');
    } finally {
      setBusy(null);
    }
  };

  const verify = async (codeNow = code, e?: Event) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(codeNow)) return setError('Enter the 6-digit code');
    if (step === 'name' && name.trim().length < 2) return setError('Enter your name');
    setError(null);
    setBusy('verify');
    try {
      const res = await api('/auth/verify', { phone, code: codeNow, ...(step === 'name' && { name: name.trim() }), ...(ticket && { googleTicket: ticket.ticket }) });
      const data = (await res.json()) as { customer?: Me; needsName?: boolean } & ApiError;
      if (res.ok && data.customer) return done(data.customer);
      if (res.ok && data.needsName) {
        setName(ticket?.name ?? '');
        return setStep('name');
      }
      setError(data.error?.fields?.name ?? data.error?.message ?? 'That did not work. Please try again.');
    } catch {
      setError('No connection. Check your internet and try again.');
    } finally {
      setBusy(null);
    }
  };

  const withGoogle = async () => {
    if (!google) return;
    setError(null);
    setBusy('google');
    try {
      const idToken = await googleIdToken(google);
      const res = await api('/auth/google', { idToken });
      const data = (await res.json()) as { customer?: Me; needsPhone?: boolean; ticket?: string; name?: string | null; avatarUrl?: string | null } & ApiError;
      if (res.ok && data.customer) return done(data.customer);
      if (res.ok && data.needsPhone && data.ticket) {
        setTicket({ ticket: data.ticket, name: data.name ?? null, avatarUrl: data.avatarUrl ?? null });
        return setStep('phone');
      }
      setError(data.error?.message ?? 'Google sign-in did not work. Please try again.');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      // They closed the Google window: nothing to say.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(
        code === 'auth/popup-blocked'
          ? 'Your browser blocked the Google window. Allow pop-ups, or sign in with your phone number.'
          : code === 'auth/unauthorized-domain'
            ? 'Google sign-in is not set up for this website yet. Please use your phone number.'
            : 'Google sign-in did not work here. Please use your phone number.',
      );
    } finally {
      setBusy(null);
    }
  };

  const title = step === 'phone' ? (ticket ? 'Add your phone number' : 'Sign in or create an account') : step === 'code' ? 'Enter the code' : 'What is your name?';

  return (
    <div class="fixed inset-0 z-[70] flex items-end justify-center bg-zinc-950/40 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        class="w-full max-w-md animate-slide-up rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:animate-fade-in sm:rounded-3xl sm:p-6"
      >
        <div class="flex items-center gap-2">
          {step !== 'phone' && (
            <button type="button" onClick={() => (setStep(step === 'name' ? 'code' : 'phone'), setError(null))} aria-label="Back" class="-ml-1.5 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
              <ArrowLeft class="size-5" />
            </button>
          )}
          <h2 class="flex-1 font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={close} aria-label="Close" class="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X class="size-5" />
          </button>
        </div>

        {step === 'phone' && (
          <form onSubmit={sendCode} noValidate>
            {ticket ? (
              <div class="mt-3 flex items-center gap-3 rounded-2xl bg-brand-50 p-3">
                {ticket.avatarUrl && <img src={ticket.avatarUrl} alt="" width={40} height={40} referrerpolicy="no-referrer" class="size-10 rounded-full" />}
                <p class="text-sm text-zinc-700">
                  Hi{ticket.name ? ` ${ticket.name.split(' ')[0]}` : ''}! Add your phone number once: we call it to confirm orders. Next time, Google signs you straight in.
                </p>
              </div>
            ) : (
              <p class="mt-1 text-sm text-zinc-500">{open.reason ?? 'See your orders, and order faster next time.'}</p>
            )}
            <label class="mt-4 block text-sm font-medium text-zinc-800">
              Phone number
              <input
                ref={field}
                value={phone}
                onInput={(e) => (setPhone(e.currentTarget.value), setError(null))}
                type="tel"
                inputMode="tel"
                autocomplete="tel"
                placeholder="01XXXXXXXXX"
                maxLength={20}
                class={input}
                aria-invalid={!!error}
              />
            </label>
            {error && <p class="mt-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={!!busy} class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
              {busy === 'code' ? <Loader2 class="size-5 animate-spin" /> : <Phone class="size-4" />}
              Send me a code
            </button>
            {google && !ticket && (
              <>
                <div class="my-4 flex items-center gap-3 text-xs text-zinc-400">
                  <span class="h-px flex-1 bg-zinc-200" />
                  or
                  <span class="h-px flex-1 bg-zinc-200" />
                </div>
                <button type="button" onClick={withGoogle} disabled={!!busy} class="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
                  {busy === 'google' ? <Loader2 class="size-5 animate-spin" /> : <GoogleG />}
                  Continue with Google
                </button>
              </>
            )}
            <p class="mt-4 text-center text-xs text-zinc-500">No password needed. New here? Your account is made when you sign in.</p>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={(e) => verify(code, e)} noValidate>
            <p class="mt-1 text-sm text-zinc-500">
              We sent a 6-digit code to <span class="font-semibold text-zinc-800">{phone}</span>.
            </p>
            {devCode && (
              <button type="button" onClick={() => (setCode(devCode), verify(devCode))} class="mt-3 w-full rounded-xl bg-marigold-100 px-3 py-2 text-left text-sm text-zinc-800">
                Test mode (no SMS sent): your code is <span class="font-bold tracking-widest">{devCode}</span>. Tap to use it.
              </button>
            )}
            <input
              ref={field}
              value={code}
              onInput={(e) => {
                const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                setError(null);
                // All six digits (typed, pasted or filled from the SMS): check at once.
                if (v.length === 6 && busy !== 'verify') verify(v);
              }}
              inputMode="numeric"
              autocomplete="one-time-code"
              placeholder="••••••"
              maxLength={6}
              aria-label="The 6-digit code"
              aria-invalid={!!error}
              class={cn(input, 'mt-4 text-center text-2xl font-semibold tracking-[0.5em]')}
            />
            {error && <p class="mt-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={!!busy || code.length !== 6} class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
              {busy === 'verify' && <Loader2 class="size-5 animate-spin" />}
              Sign in
            </button>
            <p class="mt-4 text-center text-sm text-zinc-500">
              {wait > 0 ? (
                `Send again in ${wait} s`
              ) : (
                <button type="button" onClick={() => sendCode()} disabled={!!busy} class="font-semibold text-brand-700 hover:underline">
                  Send the code again
                </button>
              )}
            </p>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={(e) => verify(code, e)} noValidate>
            <p class="mt-1 text-sm text-zinc-500">Welcome! One last thing, for your orders.</p>
            <label class="mt-4 block text-sm font-medium text-zinc-800">
              Your name
              <input ref={field} value={name} onInput={(e) => (setName(e.currentTarget.value), setError(null))} autocomplete="name" maxLength={100} class={input} aria-invalid={!!error} />
            </label>
            {error && <p class="mt-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={!!busy} class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-50">
              {busy === 'verify' && <Loader2 class="size-5 animate-spin" />}
              Create my account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
