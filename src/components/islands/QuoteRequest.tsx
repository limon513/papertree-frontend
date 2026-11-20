import { useEffect, useState } from 'preact/hooks';
import { FileText, ShoppingBag } from 'lucide-preact';
import { selectedOf, useCart } from '@/lib/cart';
import { saveContact, savedContact } from '@/lib/contact';
import { useMe } from '@/lib/account';
import { API_PUBLIC_URL, cn, imageAt, money } from '@/lib/utils';

type Fields = Partial<Record<'name' | 'organisation' | 'phone' | 'email' | 'note', string>>;

const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const label = 'block text-sm font-medium text-zinc-800';

/**
 * Turns the ticked cart items into a quotation: who it is for, then the shop prices it (today's prices,
 * bulk discounts, a business's wholesale prices) and the shopper lands on its page to print or share.
 * The cart is left as it is.
 */
export default function QuoteRequest() {
  const s = useCart();
  const picked = selectedOf(s);
  const m = useMe();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ name: '', organisation: '', phone: '', email: '', note: '', website: '' });
  const [errors, setErrors] = useState<Fields>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const saved = savedContact();
    setForm((f) => ({ ...f, name: saved.name ?? '', phone: saved.phone ?? '', email: saved.email ?? '' }));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!m) return;
    setForm((f) => ({ ...f, name: f.name || m.name, phone: f.phone || m.phone, email: f.email || m.email || '', organisation: f.organisation || m.businessRequest?.businessName || '' }));
  }, [m?.id]);

  const set = (key: keyof typeof form) => (e: Event) => {
    setForm((f) => ({ ...f, [key]: (e.currentTarget as HTMLInputElement).value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  if (!ready) return <div class="mt-6 h-96 animate-pulse rounded-3xl bg-zinc-100" aria-busy="true" />;
  if (!picked.length) {
    return (
      <div class="mt-6 flex flex-col items-center rounded-3xl bg-zinc-50 px-6 py-14 text-center">
        <ShoppingBag class="size-10 text-zinc-400" />
        <p class="mt-3 font-display text-xl font-bold">Add products to your cart first</p>
        <p class="mt-1 max-w-sm text-sm text-zinc-500">Put what you need in the cart, with the quantities. Then come back here to get a quotation for it.</p>
        <a href="/" class="mt-5 flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white">Start shopping</a>
      </div>
    );
  }
  const pieces = picked.reduce((n, i) => n + i.quantity, 0);
  const about = picked.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const submit = async (e: Event) => {
    e.preventDefault();
    setProblem(null);
    const phone = form.phone.replace(/[\s()-]/g, '').replace(/^\+?880/, '0');
    const missing: Fields = {};
    if (form.name.trim().length < 2) missing.name = 'Enter your name';
    if (!/^0\d{9,10}$/.test(phone)) missing.phone = 'Enter a Bangladeshi number, like 01712345678';
    setErrors(missing);
    if (Object.keys(missing).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('form [aria-invalid=true]')?.focus());
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/quotations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: picked.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          name: form.name.trim(),
          organisation: form.organisation.trim(),
          phone,
          email: form.email.trim(),
          note: form.note.trim(),
          website: form.website,
        }),
      });
      const data = (await res.json().catch(() => null)) as { token?: string | null; error?: { message?: string; fields?: Record<string, string> } } | null;
      if (!res.ok || !data?.token) {
        const fields = data?.error?.fields ?? {};
        const own = Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith('items.'))) as Fields;
        setErrors(own);
        setProblem(Object.keys(own).length ? null : (data?.error?.message ?? 'Could not make the quotation. Please try again.'));
        return;
      }
      saveContact({ name: form.name.trim(), phone, email: form.email.trim() || null });
      location.href = `/quotation/${encodeURIComponent(data.token)}/`;
    } catch {
      setProblem('No connection. Check your internet and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <form onSubmit={submit} noValidate class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-6">
        <h2 class="font-display text-lg font-bold">Who is it for?</h2>
        <p class="mt-0.5 text-sm text-zinc-500">These go on the quotation.</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class={label}>
            Your name
            <input value={form.name} onInput={set('name')} autoComplete="name" maxLength={100} aria-invalid={!!errors.name} class={input} />
            {errors.name && <span class="mt-1 block text-sm font-normal text-red-600">{errors.name}</span>}
          </label>
          <label class={label}>
            School, office or shop <span class="font-normal text-zinc-400">(optional)</span>
            <input value={form.organisation} onInput={set('organisation')} autoComplete="organization" maxLength={150} aria-invalid={!!errors.organisation} class={input} />
            {errors.organisation && <span class="mt-1 block text-sm font-normal text-red-600">{errors.organisation}</span>}
          </label>
          <label class={label}>
            Phone
            <input value={form.phone} onInput={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" maxLength={20} aria-invalid={!!errors.phone} class={input} />
            {errors.phone && <span class="mt-1 block text-sm font-normal text-red-600">{errors.phone}</span>}
          </label>
          <label class={label}>
            Email <span class="font-normal text-zinc-400">(optional)</span>
            <input value={form.email} onInput={set('email')} type="email" autoComplete="email" maxLength={200} aria-invalid={!!errors.email} class={input} />
            {errors.email && <span class="mt-1 block text-sm font-normal text-red-600">{errors.email}</span>}
          </label>
        </div>
        <label class={cn(label, 'mt-4')}>
          Reference <span class="font-normal text-zinc-400">(optional)</span>
          <input value={form.note} onInput={set('note')} maxLength={500} placeholder="e.g. Class 5 art supplies, term 2" class={input} />
        </label>
        <input name="website" value={form.website} onInput={set('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" class="absolute -left-[9999px] size-px opacity-0" />
        {problem && <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{problem}</p>}
        <button type="submit" disabled={sending} class="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-8">
          <FileText class="size-5" /> {sending ? 'Making your quotation…' : 'Get the quotation'}
        </button>
        <p class="mt-3 text-xs text-zinc-500">Prices are fixed for 7 days. You can print it, share the link, or order it online at these prices.</p>
      </form>

      <aside class="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5" aria-label="What goes on it">
        <p class="font-semibold text-zinc-900">
          {picked.length} product{picked.length === 1 ? '' : 's'} · {pieces} piece{pieces === 1 ? '' : 's'}
        </p>
        <ul class="mt-3 max-h-96 divide-y divide-zinc-100 overflow-y-auto">
          {picked.map((i) => (
            <li key={i.variantId} class="flex items-center gap-3 py-2.5">
              <span class="size-11 shrink-0 overflow-hidden rounded-lg bg-zinc-50">{i.image && <img src={imageAt(i.image, 160)} alt="" class="size-full object-cover" loading="lazy" />}</span>
              <span class="min-w-0 flex-1 text-sm">
                <span class="line-clamp-2 text-zinc-900">{i.name}</span>
                {i.variantLabel && <span class="block text-xs text-zinc-500">{i.variantLabel}</span>}
              </span>
              <span class="text-sm whitespace-nowrap text-zinc-600 tabular-nums">× {i.quantity}</span>
            </li>
          ))}
        </ul>
        <p class="mt-3 flex justify-between border-t border-zinc-100 pt-3 text-sm">
          <span class="text-zinc-600">About</span>
          <span class="font-semibold tabular-nums">{money(about)}</span>
        </p>
        <p class="mt-1 text-xs text-zinc-500">Bulk discounts and your prices are worked out on the quotation. Delivery comes when you order.</p>
        <a href="/cart/" class="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">Change quantities in the cart</a>
      </aside>
    </div>
  );
}
