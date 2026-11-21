import { useEffect, useRef, useState } from 'preact/hooks';
import { Camera, ImageUp, Loader2, ScanSearch } from 'lucide-preact';
import { PhotoError, startPhotoSearch } from '@/lib/photo-search';
import { cn } from '@/lib/utils';

/** Starts a photo search; returns an error message for the shopper, or nothing (the page moves on). */
export async function searchWithFile(file: File | Blob | null | undefined): Promise<string | null> {
  if (!file) return null;
  try {
    await startPhotoSearch(file);
    return null;
  } catch (err) {
    return err instanceof PhotoError ? err.message : 'This photo could not be opened. Please try another one.';
  }
}

/** The first picture in a paste or a drop, if any. */
export const pictureIn = (data: DataTransfer | null) => [...(data?.files ?? [])].find((f) => f.type.startsWith('image/')) ?? null;

/**
 * "Search with a photo": take a photo (phones), choose one, or drop / paste one (computers).
 * Shown under the search box when the camera button is pressed, and on the photo results page.
 */
export function PhotoPanel({ className, onBusy, file }: { className?: string; onBusy?: (busy: boolean) => void; file?: File | null }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  const use = async (file: File | null | undefined) => {
    if (!file) return;
    setBusy(true);
    onBusy?.(true);
    setProblem(null);
    const message = await searchWithFile(file);
    // Still here only when something went wrong.
    if (message) {
      setProblem(message);
      setBusy(false);
      onBusy?.(false);
    }
  };
  // A photo pasted or dropped on the search box itself.
  useEffect(() => void use(file), [file]);
  const picked = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    void use(input.files?.[0]);
    input.value = '';
  };

  return (
    <div class={cn('p-4', className)}>
      <p class="flex items-center gap-2 font-display text-base font-bold text-zinc-900">
        <ScanSearch class="size-5 text-brand-600" /> Search with a photo
      </p>
      <p class="mt-0.5 text-sm text-zinc-500">Take or choose a photo of what you want. We’ll find it, or things that look like it.</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void use(pictureIn(e.dataTransfer));
        }}
        class={cn(
          'mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors',
          over ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 bg-zinc-50/60',
        )}
      >
        {busy ? (
          <p class="flex items-center gap-2 py-6 text-sm font-medium text-zinc-700" role="status">
            <Loader2 class="size-5 animate-spin text-brand-600" /> Getting your photo ready…
          </p>
        ) : (
          <>
            <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              {/* Phones open the camera straight away; computers have no such button. */}
              <button type="button" onClick={() => camera.current?.click()} class="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 pointer-fine:hidden">
                <Camera class="size-5" /> Take a photo
              </button>
              <button
                type="button"
                onClick={() => gallery.current?.click()}
                class="flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50 pointer-fine:bg-brand-600 pointer-fine:text-white pointer-fine:ring-0 pointer-fine:hover:bg-brand-700"
              >
                <ImageUp class="size-5" /> Choose a photo
              </button>
            </div>
            <p class="mt-3 hidden text-sm text-zinc-500 pointer-fine:block">
              or drag a photo here · or paste one with <kbd class="rounded bg-white px-1.5 py-0.5 font-sans text-xs ring-1 ring-zinc-300">Ctrl</kbd> + <kbd class="rounded bg-white px-1.5 py-0.5 font-sans text-xs ring-1 ring-zinc-300">V</kbd>
            </p>
          </>
        )}
      </div>
      {problem && (
        <p class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {problem}
        </p>
      )}
      <p class="mt-2.5 text-xs text-zinc-500">Tip: fill the photo with the product, in good light. Screenshots work too.</p>
      <input ref={camera} type="file" accept="image/*" capture="environment" class="hidden" onChange={picked} />
      <input ref={gallery} type="file" accept="image/*" class="hidden" onChange={picked} />
    </div>
  );
}
