'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MapPin, X } from 'lucide-react';
import { cart, useCart } from '@/lib/cart';
import type { Places } from '@/lib/types';
import { ui, usePanel } from '@/lib/ui';
import { API_PUBLIC_URL, cn } from '@/lib/utils';

let placesCache: Promise<Places> | null = null;
/** Districts and areas, loaded once per visit. */
export function loadPlaces() {
  placesCache ??= fetch(`${API_PUBLIC_URL}/v1/store/places`).then((r) => r.json() as Promise<Places>);
  return placesCache;
}

/** "Deliver to Mirpur, Dhaka": the place decides the delivery charge shown in the cart. */
export function DeliverToButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { deliverTo } = useCart();
  if (compact) {
    // Phones: one slim line under the search box.
    return (
      <button type="button" onClick={() => ui.open('deliver-to')} className={cn('flex min-w-0 items-center gap-1 text-xs text-zinc-600', className)}>
        <MapPin className="size-3.5 shrink-0 text-brand-600" />
        <span className="truncate">
          Deliver to <span className="font-semibold text-zinc-900">{deliverTo?.label ?? 'choose your area'}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => ui.open('deliver-to')}
      className={cn('flex min-w-0 items-center gap-1.5 rounded-full text-left text-sm hover:text-brand-700', className)}
    >
      <MapPin className="size-4 shrink-0 text-brand-600" />
      <span className="min-w-0 leading-tight">
        <span className="block text-[11px] text-zinc-500">Deliver to</span>
        <span className="block truncate font-medium text-zinc-800">{deliverTo?.label ?? 'Choose your area'}</span>
      </span>
      <ChevronDown className="size-4 shrink-0 text-zinc-400" />
    </button>
  );
}

export function DeliverToDialog() {
  const open = usePanel() === 'deliver-to';
  const { deliverTo } = useCart();
  const [places, setPlaces] = useState<Places | null>(null);
  const [districtId, setDistrictId] = useState(deliverTo?.districtId ?? '');
  const [areaId, setAreaId] = useState(deliverTo?.areaId ?? '');

  useEffect(() => {
    if (!open) return;
    setDistrictId(deliverTo?.districtId ?? '');
    setAreaId(deliverTo?.areaId ?? '');
    loadPlaces().then(setPlaces, () => setPlaces(null));
  }, [open]);

  const areas = useMemo(
    () =>
      (places?.areas ?? [])
        .filter((a) => a.districtId === districtId)
        .sort((x, y) => Number(y.city) - Number(x.city) || x.name.localeCompare(y.name)),
    [places, districtId],
  );

  if (!open) return null;

  const save = () => {
    const district = places?.districts.find((d) => d.id === districtId);
    if (!district) return;
    const area = areas.find((a) => a.id === areaId);
    cart.setDeliverTo({ districtId, areaId: area?.id ?? null, label: area ? `${area.name}, ${district.name}` : district.name });
    ui.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-950/40 sm:items-center" onClick={ui.close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deliver-to-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-slide-up rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:animate-fade-in sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="deliver-to-title" className="font-display text-lg font-semibold">
            Where should we deliver?
          </h2>
          <button type="button" onClick={ui.close} aria-label="Close" className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">We show the delivery charge for your area in the cart.</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">District</span>
            <select
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setAreaId('');
              }}
              className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-[15px]"
            >
              <option value="">{places ? 'Choose your district' : 'Loading…'}</option>
              {places?.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">Area / thana</span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              disabled={!districtId}
              className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-[15px] disabled:bg-zinc-50"
            >
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
        <button
          type="button"
          onClick={save}
          disabled={!districtId}
          className="mt-5 h-12 w-full rounded-full bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
