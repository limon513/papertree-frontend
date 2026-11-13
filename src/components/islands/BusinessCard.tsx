import { useEffect, useState } from 'preact/hooks';
import { Building2, CheckCircle2, Clock, Loader2 } from 'lucide-preact';
import { changeAccount, type Me } from '@/lib/account';
import { cn } from '@/lib/utils';

/**
 * "Business account" on the account page: ask for wholesale prices, see the answer. Opens the form at
 * once from a link with ?business (the "wholesale price for businesses" hints).
 */

const TYPES = [
  ['shop', 'Shop or reseller'],
  ['school', 'School, college or coaching centre'],
  ['office', 'Office or company'],
  ['other', 'Other'],
] as const;
type BusinessType = (typeof TYPES)[number][0];

const card = 'rounded-2xl bg-white ring-1 ring-zinc-200';
const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const label = 'block text-sm font-medium text-zinc-800';
const primary = 'flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white hover:bg-brand-800 disabled:opacity-50';
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function BusinessCard({ m }: { m: Me }) {
  const request = m.businessRequest;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType | ''>('');
  const [address, setAddress] = useState('');
  const [licence, setLicence] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Typing in a field clears its error. */
  const fix = (field: string) => errors[field] && setErrors(({ [field]: _gone, ...rest }) => rest);

  const canApply = !request || request.status === 'rejected';
  useEffect(() => {
    if (canApply && new URLSearchParams(location.search).has('business')) {
      setOpen(true);
      document.getElementById('business')?.scrollIntoView({ block: 'start' });
    }
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const r = await changeAccount('/me/business', { businessName: name.trim(), businessType: type || undefined, address: address.trim(), tradeLicense: licence.trim() || null }).catch(() => ({
      ok: false as const,
      message: 'No connection. Please try again.',
      fields: {} as Record<string, string>,
    }));
    setBusy(false);
    if (r.ok) return setOpen(false);
    setErrors(Object.keys(r.fields).length ? r.fields : { form: r.message });
  };

  return (
    <section id="business" class={cn(card, 'scroll-mt-24 p-5 lg:col-start-1')}>
      <h2 class="flex items-center gap-2 font-display text-lg font-bold">
        <Building2 class="size-5 text-brand-700" /> Business account
      </h2>

      {request?.status === 'approved' ? (
        <p class="mt-2 flex gap-2 text-sm text-zinc-700">
          <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-brand-600" />
          <span>
            <strong>{request.businessName}</strong> buys at wholesale prices. You see them on every product while signed in.
          </span>
        </p>
      ) : request?.status === 'pending' ? (
        <p class="mt-2 flex gap-2 text-sm text-zinc-700">
          <Clock class="mt-0.5 size-4 shrink-0 text-marigold-500" />
          <span>
            We got your request for <strong>{request.businessName}</strong>
            {request.appliedAt && <> on {day(request.appliedAt)}</>}. We will call you on {m.phone} to confirm it, then wholesale prices switch on.
          </span>
        </p>
      ) : !open ? (
        <>
          <p class="mt-2 text-sm text-zinc-600">
            {request?.status === 'rejected'
              ? 'Your last request was not approved. If something has changed, you can ask again or call us.'
              : 'Buying for a shop, school or office? Ask for a business account to get wholesale prices.'}
          </p>
          <button type="button" onClick={() => setOpen(true)} class="mt-3 flex h-10 items-center rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100">
            Ask for wholesale prices
          </button>
          <a href="/wholesale/" class="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
            How wholesale works
          </a>
        </>
      ) : (
        <form onSubmit={submit} noValidate class="mt-3 space-y-3">
          <label class={label}>
            Business name
            <input value={name} onInput={(e) => (setName(e.currentTarget.value), fix('businessName'))} autocomplete="organization" maxLength={150} class={input} aria-invalid={!!errors.businessName} />
            {errors.businessName && <p class="mt-1 text-sm text-red-600">{errors.businessName}</p>}
          </label>
          <fieldset>
            <legend class={label}>What kind of business?</legend>
            <div class="mt-1.5 grid gap-1.5">
              {TYPES.map(([value, text]) => (
                <label
                  key={value}
                  class={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ring-1',
                    type === value ? 'bg-brand-50 font-medium text-brand-900 ring-brand-500' : 'ring-zinc-300 hover:bg-zinc-50',
                  )}
                >
                  <input type="radio" name="business-type" value={value} checked={type === value} onChange={() => (setType(value), fix('businessType'))} class="accent-brand-700" />
                  {text}
                </label>
              ))}
            </div>
            {errors.businessType && <p class="mt-1 text-sm text-red-600">{errors.businessType}</p>}
          </fieldset>
          <label class={label}>
            Business address
            <textarea value={address} onInput={(e) => (setAddress(e.currentTarget.value), fix('address'))} rows={2} maxLength={500} class={cn(input, 'h-auto py-3')} aria-invalid={!!errors.address} />
            {errors.address && <p class="mt-1 text-sm text-red-600">{errors.address}</p>}
          </label>
          <label class={label}>
            Trade licence number <span class="font-normal text-zinc-500">(if you have one)</span>
            <input value={licence} onInput={(e) => (setLicence(e.currentTarget.value), fix('tradeLicense'))} maxLength={60} class={input} aria-invalid={!!errors.tradeLicense} />
            {errors.tradeLicense && <p class="mt-1 text-sm text-red-600">{errors.tradeLicense}</p>}
          </label>
          <p class="text-xs text-zinc-500">We call you on {m.phone} to confirm, usually within a working day.</p>
          {errors.form && <p class="text-sm text-red-600">{errors.form}</p>}
          <div class="flex gap-2">
            <button type="submit" disabled={busy} class={cn(primary, 'h-11 flex-1 text-sm')}>
              {busy && <Loader2 class="size-4 animate-spin" />} Send request
            </button>
            <button type="button" onClick={() => (setOpen(false), setErrors({}))} class="h-11 rounded-full px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
