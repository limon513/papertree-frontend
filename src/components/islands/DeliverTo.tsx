import { useEffect, useMemo, useState } from 'preact/hooks';
import { ChevronDown, MapPin, X } from 'lucide-preact';
import { cart, panel, useCart } from '@/lib/cart';
import type { Places } from '@/lib/types';
import { areasOf, loadPlaces } from '@/lib/places';
import { cn } from '@/lib/utils';


/** "Deliver to Mirpur, Dhaka". `compact` is the slim phone line. */
export function DeliverToButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const deliverTo = useCart().deliverTo;
  if (compact) {
    return (
      <button type="button" onClick={() => (panel.value = 'deliver-to')} class={cn('flex min-w-0 items-center gap-1 text-xs text-zinc-600', className)}>
        <MapPin class="size-3.5 shrink-0 text-brand-600" />
        <span class="truncate">
          Deliver to <span class="font-semibold text-zinc-900">{deliverTo?.label ?? 'choose your area'}</span>
        </span>
        <ChevronDown class="size-3.5 shrink-0 text-zinc-400" />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => (panel.value = 'deliver-to')} class={cn('flex min-w-0 items-center gap-1.5 rounded-full text-left text-sm hover:text-brand-700', className)}>
      <MapPin class="size-4 shrink-0 text-brand-600" />
      <span class="min-w-0 leading-tight">
        <span class="block text-[11px] text-zinc-500">Deliver to</span>
        <span class="block truncate font-medium text-zinc-800">{deliverTo?.label ?? 'Choose your area'}</span>
      </span>
      <ChevronDown class="size-4 shrink-0 text-zinc-400" />
    </button>
  );
}

export function DeliverToDialog() {
  const open = panel.value === 'deliver-to';
  const deliverTo = useCart().deliverTo;
  const [places, setPlaces] = useState<Places | null>(null);
  const [districtId, setDistrictId] = useState('');
  const [areaId, setAreaId] = useState('');

  useEffect(() => {
    if (!open) return;
    setDistrictId(deliverTo?.districtId ?? '');
    setAreaId(deliverTo?.areaId ?? '');
    loadPlaces().then(setPlaces, () => setPlaces(null));
  }, [open]);

  const areas = useMemo(
    () => areasOf(places, districtId),
    [places, districtId],
  );
  if (!open) return null;
  const close = () => (panel.value = null);
  const save = () => {
    const district = places?.districts.find((d) => d.id === districtId);
    if (!district) return;
    const area = areas.find((a) => a.id === areaId);
    cart.setDeliverTo({ districtId, areaId: area?.id ?? null, label: area ? `${area.name}, ${district.name}` : district.name });
    close();
  };

  return (
    <div class="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 sm:items-center" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="Where should we deliver?" onClick={(e) => e.stopPropagation()} class="w-full max-w-md animate-slide-up rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:animate-fade-in sm:rounded-3xl">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-semibold">Where should we deliver?</h2>
          <button type="button" onClick={close} aria-label="Close" class="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X class="size-5" />
          </button>
        </div>
        <p class="mt-1 text-sm text-zinc-500">We show the delivery charge for your area in the cart.</p>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-sm font-medium text-zinc-800">District</span>
            <select value={districtId} onChange={(e) => (setDistrictId(e.currentTarget.value), setAreaId(''))} class="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-[15px]">
              <option value="">{places ? 'Choose your district' : 'Loading…'}</option>
              {places?.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label class="block">
            <span class="text-sm font-medium text-zinc-800">Area / thana</span>
            <select value={areaId} onChange={(e) => setAreaId(e.currentTarget.value)} disabled={!districtId} class="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-[15px] disabled:bg-zinc-50">
              <option value="">Choose your area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.city ? ' (Dhaka City)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={save} disabled={!districtId} class="mt-5 h-12 w-full rounded-full bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-40">
          Save
        </button>
      </div>
    </div>
  );
}
