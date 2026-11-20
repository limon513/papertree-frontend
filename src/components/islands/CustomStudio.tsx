import { useEffect, useRef, useState } from 'preact/hooks';
import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, Folder, Frame, LogIn, Palette, Paperclip, PenLine, Sparkles, Sticker, Trash2, X } from 'lucide-preact';
import { CUSTOM_KINDS, type CustomKind } from '@/lib/custom-kinds';
import { saveContact, savedContact } from '@/lib/contact';
import { openSignIn, useMe } from '@/lib/account';
import { API_PUBLIC_URL, cn } from '@/lib/utils';

const ICONS: Record<CustomKind['key'], typeof BookOpen> = {
  notebook: BookOpen,
  canvas: Frame,
  pen: PenLine,
  paper: FileText,
  sketchbook: Palette,
  sticker: Sticker,
  folder: Folder,
  other: Sparkles,
};
const STEPS = ['Choose', 'Details', 'Contact', 'Review'];
const SAVED = 'pt-custom-order';
const MAX_FILES = 3;

interface State {
  step: 0 | 1 | 2 | 3;
  kind: CustomKind['key'] | null;
  answers: Record<string, string>;
  quantity: string;
  notes: string;
  name: string;
  phone: string;
  email: string;
  city: string;
}
interface Upload {
  id: number;
  fileName: string;
  size: number;
}
const EMPTY: State = { step: 0, kind: null, answers: {}, quantity: '', notes: '', name: '', phone: '', email: '', city: '' };

const input = 'mt-1 h-12 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[16px] outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-red-500';
const label = 'block text-sm font-medium text-zinc-800';

/** The questions to ask now: a "Custom size" box only when the answer before it was a custom one. */
const asked = (kind: CustomKind, answers: Record<string, string>) =>
  kind.questions.filter((q, i) => !q.onlyIf || (answers[kind.questions[i - 1]?.label ?? ''] ?? '').startsWith(q.onlyIf));

/**
 * Custom Order Studio: choose what to make, answer a few questions, say how many and who you are
 * (signed-in customers can attach their artwork), check and send. Staff call back with a priced
 * quotation. Answers are kept on this page if it is reloaded (sign-in, a dropped connection).
 */
export default function CustomStudio({ whatsapp }: { whatsapp: string | null }) {
  const [s, setS] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const m = useMe();

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SAVED) ?? 'null') as { s: State; files: Upload[] } | null;
      if (saved?.s) {
        setS(saved.s);
        setFiles(saved.files ?? []);
      } else {
        const c = savedContact();
        setS((x) => ({ ...x, name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '' }));
      }
    } catch {
      // Storage blocked: start fresh.
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || done) return;
    try {
      sessionStorage.setItem(SAVED, JSON.stringify({ s, files }));
    } catch {
      // Not kept: fine.
    }
  }, [s, files, ready]);
  useEffect(() => {
    if (!m) return;
    setS((x) => ({ ...x, name: x.name || m.name, phone: x.phone || m.phone, email: x.email || m.email || '' }));
  }, [m?.id]);

  const kind = CUSTOM_KINDS.find((k) => k.key === s.kind) ?? null;
  const set = (patch: Partial<State>) => setS((x) => ({ ...x, ...patch }));
  const go = (step: State['step']) => {
    set({ step });
    setErrors({});
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const answer = (q: string, value: string) => {
    set({ answers: { ...s.answers, [q]: value } });
    setErrors((e) => ({ ...e, [q]: '' }));
  };

  if (!ready) return <div class="mt-6 h-96 animate-pulse rounded-3xl bg-zinc-100" aria-busy="true" />;

  if (done) {
    return (
      <div class="mt-6 flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-zinc-200" role="status">
        <span class="flex size-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Check class="size-8" />
        </span>
        <p class="mt-4 font-display text-2xl font-bold text-zinc-900">Thank you, {s.name.split(' ')[0]}!</p>
        <p class="mt-1 text-zinc-600">
          We got your request <strong>{done}</strong>.
        </p>
        <p class="mt-1 max-w-md text-zinc-600">
          Our team will call you on <strong class="text-zinc-900">{s.phone}</strong> to talk it through, then send you a priced quotation you can order online.
        </p>
        <a href="/" class="mt-6 flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
          Continue shopping
        </a>
      </div>
    );
  }

  // ---- Checks per step ----
  const detailsOk = () => {
    if (!kind) return false;
    const e: Record<string, string> = {};
    for (const q of asked(kind, s.answers)) {
      const a = (s.answers[q.label] ?? '').trim();
      if ((q.options || q.required) && !a) e[q.label] = q.options ? 'Choose one' : 'Please fill this in';
    }
    const qty = Number(s.quantity);
    if (!Number.isInteger(qty) || qty < 1) e.quantity = 'Enter how many you need';
    setErrors(e);
    if (Object.values(e).some(Boolean)) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
    return !Object.values(e).some(Boolean);
  };
  const contactOk = () => {
    const e: Record<string, string> = {};
    const phone = s.phone.replace(/[\s()-]/g, '').replace(/^\+?880/, '0');
    if (s.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^0\d{9,10}$/.test(phone)) e.phone = 'Enter a Bangladeshi number, like 01712345678';
    if (s.email.trim() && !/^\S+@\S+\.\S+$/.test(s.email.trim())) e.email = 'Enter a valid email, or leave it empty';
    setErrors(e);
    if (Object.keys(e).length) requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid=true]')?.focus());
    return !Object.keys(e).length;
  };

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    setFileNote(null);
    if (file.size > 5 * 1024 * 1024) return setFileNote('Files up to 5 MB, please.');
    if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(file.type)) return setFileNote('Use a JPG, PNG, WebP picture or a PDF.');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/custom-requests/files`, { method: 'POST', credentials: 'include', body: form });
      const data = (await res.json().catch(() => null)) as (Upload & { error?: { message?: string } }) | null;
      if (!res.ok || !data?.id) return setFileNote(data?.error?.message ?? 'Could not attach the file. Please try again.');
      setFiles((f) => [...f, { id: data.id, fileName: data.fileName, size: data.size }]);
    } catch {
      setFileNote('No connection. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  const removeFile = async (id: number) => {
    setFiles((f) => f.filter((x) => x.id !== id));
    await fetch(`${API_PUBLIC_URL}/v1/store/custom-requests/files/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => undefined);
  };

  const send = async () => {
    if (!kind) return;
    setSending(true);
    setProblem(null);
    const phone = s.phone.replace(/[\s()-]/g, '').replace(/^\+?880/, '0');
    try {
      const res = await fetch(`${API_PUBLIC_URL}/v1/store/custom-requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: kind.key,
          specs: asked(kind, s.answers)
            .map((q) => ({ label: q.label, value: (s.answers[q.label] ?? '').trim() }))
            .filter((a) => a.value),
          quantity: Number(s.quantity),
          notes: s.notes.trim() || null,
          name: s.name.trim(),
          phone,
          email: s.email.trim() || null,
          city: s.city.trim() || null,
          fileIds: m ? files.map((f) => f.id) : [],
        }),
      });
      const data = (await res.json().catch(() => null)) as { number?: string; error?: { message?: string } } | null;
      if (!res.ok || !data?.number) {
        setProblem(data?.error?.message ?? 'Could not send. Please try again.');
        return;
      }
      saveContact({ name: s.name.trim(), phone, email: s.email.trim() || null });
      try {
        sessionStorage.removeItem(SAVED);
      } catch {
        // Fine.
      }
      setDone(data.number);
      requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch {
      setProblem('No connection. Check your internet and try again.');
    } finally {
      setSending(false);
    }
  };

  const err = (key: string) => (errors[key] ? <span class="mt-1 block text-sm font-normal text-red-600">{errors[key]}</span> : null);
  const back = (step: State['step']) => (
    <button type="button" onClick={() => go(step)} class="flex h-12 items-center gap-2 rounded-xl px-4 font-semibold text-zinc-700 ring-1 ring-zinc-300 hover:ring-zinc-400">
      <ArrowLeft class="size-4" /> Back
    </button>
  );

  return (
    <div ref={top} class="mt-6 scroll-mt-28">
      {/* Where they are */}
      <ol class="mb-5 grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((name, i) => (
          <li key={name} aria-current={i === s.step ? 'step' : undefined} class={cn('rounded-lg px-2 py-2 text-center text-xs font-semibold sm:text-sm', i === s.step ? 'bg-brand-700 text-white' : i < s.step ? 'bg-brand-100 text-brand-800' : 'bg-zinc-100 text-zinc-500')}>
            {i + 1}. {name}
          </li>
        ))}
      </ol>

      <div class="rounded-3xl bg-white p-5 ring-1 ring-zinc-200 sm:p-8">
        {s.step === 0 && (
          <>
            <h2 class="font-display text-xl font-bold">What would you like made?</h2>
            <p class="mt-1 text-sm text-zinc-500">Choose one. You only get the questions for that item.</p>
            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CUSTOM_KINDS.map((k) => {
                const Icon = ICONS[k.key];
                return (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => (k.key !== s.kind && set({ kind: k.key, answers: {} }), go(1))}
                    class={cn('flex flex-col items-start gap-2 rounded-2xl p-4 text-left ring-1 transition hover:bg-brand-50 hover:ring-brand-300', s.kind === k.key ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-zinc-200')}
                  >
                    <span class="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                      <Icon class="size-5" />
                    </span>
                    <span class="font-semibold text-zinc-900">{k.label}</span>
                    <span class="text-xs text-zinc-500">{k.hint}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {s.step === 1 && kind && (
          <>
            <h2 class="font-display text-xl font-bold">{kind.label}</h2>
            <p class="mt-1 text-sm text-zinc-500">Tell us how you want it. Not sure? Pick the closest; we will help you on the phone.</p>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              {asked(kind, s.answers).map((q) => (
                <label key={q.label} class={label}>
                  {q.label}
                  {!q.options && !q.required && <span class="font-normal text-zinc-400"> (optional)</span>}
                  {q.options ? (
                    <select value={s.answers[q.label] ?? ''} onChange={(e) => answer(q.label, e.currentTarget.value)} aria-invalid={!!errors[q.label]} class={input}>
                      <option value="">Choose…</option>
                      {q.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={s.answers[q.label] ?? ''} onInput={(e) => answer(q.label, e.currentTarget.value)} placeholder={q.placeholder} maxLength={300} aria-invalid={!!errors[q.label]} class={input} />
                  )}
                  {err(q.label)}
                </label>
              ))}
              <label class={label}>
                How many?
                <input
                  value={s.quantity}
                  onInput={(e) => (set({ quantity: e.currentTarget.value.replace(/\D/g, '') }), setErrors((x) => ({ ...x, quantity: '' })))}
                  inputMode="numeric"
                  placeholder="e.g. 200"
                  aria-invalid={!!errors.quantity}
                  class={input}
                />
                {err('quantity')}
              </label>
            </div>
            <label class={cn(label, 'mt-4')}>
              Anything else? <span class="font-normal text-zinc-400">(optional)</span>
              <textarea value={s.notes} onInput={(e) => set({ notes: e.currentTarget.value })} rows={3} maxLength={2000} placeholder="Colours, text to print, when you need it…" class={cn(input, 'h-auto py-2.5')} />
            </label>
            <div class="mt-6 flex justify-between gap-3">
              {back(0)}
              <button type="button" onClick={() => detailsOk() && go(2)} class="flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700">
                Next <ArrowRight class="size-4" />
              </button>
            </div>
          </>
        )}

        {s.step === 2 && (
          <>
            <h2 class="font-display text-xl font-bold">Your details and artwork</h2>
            <p class="mt-1 text-sm text-zinc-500">So we can call you about it.</p>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <label class={label}>
                Your name
                <input value={s.name} onInput={(e) => (set({ name: e.currentTarget.value }), setErrors((x) => ({ ...x, name: '' })))} autoComplete="name" maxLength={100} aria-invalid={!!errors.name} class={input} />
                {err('name')}
              </label>
              <label class={label}>
                Phone
                <input value={s.phone} onInput={(e) => (set({ phone: e.currentTarget.value }), setErrors((x) => ({ ...x, phone: '' })))} type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" aria-invalid={!!errors.phone} class={input} />
                {err('phone')}
              </label>
              <label class={label}>
                Email <span class="font-normal text-zinc-400">(optional)</span>
                <input value={s.email} onInput={(e) => (set({ email: e.currentTarget.value }), setErrors((x) => ({ ...x, email: '' })))} type="email" autoComplete="email" aria-invalid={!!errors.email} class={input} />
                {err('email')}
              </label>
              <label class={label}>
                City or district <span class="font-normal text-zinc-400">(optional)</span>
                <input value={s.city} onInput={(e) => set({ city: e.currentTarget.value })} autoComplete="address-level2" maxLength={100} class={input} />
              </label>
            </div>

            <section class="mt-6 rounded-2xl bg-zinc-50 p-4" aria-labelledby="artwork-title">
              <p id="artwork-title" class="flex items-center gap-2 font-semibold text-zinc-900">
                <Paperclip class="size-4" /> Artwork or a picture <span class="font-normal text-zinc-400">(optional)</span>
              </p>
              {m ? (
                <>
                  <p class="mt-1 text-sm text-zinc-500">Your logo, design or a photo of what you want. Up to {MAX_FILES} files: JPG, PNG, WebP or PDF, 5 MB each.</p>
                  {files.length > 0 && (
                    <ul class="mt-3 space-y-2">
                      {files.map((f) => (
                        <li key={f.id} class="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-zinc-200">
                          <FileText class="size-4 text-zinc-400" />
                          <span class="min-w-0 flex-1 truncate">{f.fileName}</span>
                          <span class="text-xs text-zinc-400">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                          <button type="button" onClick={() => void removeFile(f.id)} aria-label={`Remove ${f.fileName}`} class="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                            <Trash2 class="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {files.length < MAX_FILES && (
                    <label class="mt-3 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
                      <Paperclip class="size-4" /> {uploading ? 'Attaching…' : 'Attach a file'}
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="sr-only" disabled={uploading} onChange={(e) => (void addFile(e.currentTarget.files?.[0]), (e.currentTarget.value = ''))} />
                    </label>
                  )}
                  {fileNote && <p class="mt-2 text-sm text-red-700">{fileNote}</p>}
                </>
              ) : (
                <>
                  <p class="mt-1 text-sm text-zinc-500">Sign in with your phone number to attach files{whatsapp ? ', or send them to us on WhatsApp after sending this' : ''}.</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openSignIn({ reason: 'Sign in to attach your artwork' })} class="flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">
                      <LogIn class="size-4" /> Sign in to attach
                    </button>
                  </div>
                </>
              )}
            </section>

            <div class="mt-6 flex justify-between gap-3">
              {back(1)}
              <button type="button" onClick={() => contactOk() && go(3)} disabled={uploading} class="flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                Review <ArrowRight class="size-4" />
              </button>
            </div>
          </>
        )}

        {s.step === 3 && kind && (
          <>
            <h2 class="font-display text-xl font-bold">Check and send</h2>
            <dl class="mt-4 divide-y divide-zinc-100 rounded-2xl ring-1 ring-zinc-200">
              {[
                ['Item', kind.label],
                ...asked(kind, s.answers)
                  .filter((q) => (s.answers[q.label] ?? '').trim())
                  .map((q) => [q.label, s.answers[q.label]!]),
                ['Quantity', s.quantity],
                ...(s.notes.trim() ? [['Notes', s.notes.trim()]] : []),
                ['Name', s.name],
                ['Phone', s.phone],
                ...(s.email.trim() ? [['Email', s.email.trim()]] : []),
                ...(s.city.trim() ? [['City', s.city.trim()]] : []),
                ...(m && files.length ? [['Artwork', files.map((f) => f.fileName).join(', ')]] : []),
              ].map(([k, v]) => (
                <div key={k} class="grid grid-cols-[minmax(110px,1fr)_2fr] gap-3 px-4 py-2.5 text-sm">
                  <dt class="text-zinc-500">{k}</dt>
                  <dd class="font-medium break-words whitespace-pre-line text-zinc-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p class="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">Nothing to pay now. We call you, agree the details, then send a priced quotation you can order online.</p>
            {problem && (
              <p class="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                <X class="mt-0.5 size-4 shrink-0" /> {problem}
              </p>
            )}
            <div class="mt-6 flex justify-between gap-3">
              {back(2)}
              <button type="button" onClick={() => void send()} disabled={sending} class="flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
