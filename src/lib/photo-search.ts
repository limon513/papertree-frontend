import type { ProductCard } from './types';
import { API_PUBLIC_URL } from './utils';

/**
 * Search by photo, in the browser. The photo is made small here first (at most 1024 px, JPEG), so it
 * sends fast on mobile data, then kept for this tab only (sessionStorage) while the results page
 * shows it. Nothing is kept on the device after the tab is closed.
 */
const KEY = 'pt-photo';
const MAX_SIDE = 1024;

export type MatchLevel = 'same' | 'close' | 'similar';
export type PhotoResult = ProductCard & { score: number; match: MatchLevel; category: { name: string; slug: string } | null };
export interface PhotoResults {
  searchId?: number | null;
  product?: { id: number; name: string; slug: string };
  items: PhotoResult[];
  categories: { name: string; slug: string; count: number }[];
  /** Where the item seems to be in the photo (looked at closer). */
  focus?: Box | null;
}

export class PhotoError extends Error {}

/** Decodes the picture upright (phones save sideways photos with a "turn me" note). */
async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    // Older browsers: through an <img> (also turns it upright nowadays).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } catch {
      throw new PhotoError('This photo could not be opened. Please try a JPG or PNG picture, or take a screenshot of it.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** The photo at most 1024 px on its longest side, as a JPEG data address. */
export async function shrinkPhoto(file: Blob): Promise<string> {
  if (file.type && !file.type.startsWith('image/')) throw new PhotoError('Please choose a photo (JPG, PNG or a screenshot).');
  if (file.size > 30 * 1024 * 1024) throw new PhotoError('This photo is too big. Please choose a smaller one.');
  const { source, width, height } = await decode(file);
  if (width < 32 || height < 32) throw new PhotoError('This picture is too small. Please use a clearer photo.');
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d')!;
  // Clear parts of a PNG become white, as on the shop's own pictures.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ('close' in source && typeof source.close === 'function') source.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}

/** Opens the results page for a photo (from the camera, the gallery, a drop or a paste). */
export async function startPhotoSearch(file: Blob) {
  const photo = await shrinkPhoto(file);
  try {
    sessionStorage.setItem(KEY, photo);
  } catch {
    throw new PhotoError('Your browser did not let us keep the photo. Please try again in a normal (not private) window.');
  }
  location.href = '/search/photo/';
}

export function keptPhoto(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const forgetPhoto = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Fine.
  }
};

const blobOf = async (dataUrl: string) => (await fetch(dataUrl)).blob();

/** Box drawn by the shopper, as fractions of the photo. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

async function failure(res: Response, fallback: string) {
  const e = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return new PhotoError(e?.error?.message ?? fallback);
}

export async function searchPhoto(photo: string, box: Box | null, signal?: AbortSignal): Promise<PhotoResults> {
  const form = new FormData();
  form.append('photo', await blobOf(photo), 'photo.jpg');
  if (box) form.append('crop', [box.x, box.y, box.w, box.h].map((n) => n.toFixed(4)).join(','));
  const res = await fetch(`${API_PUBLIC_URL}/v1/store/photo-search`, { method: 'POST', body: form, credentials: 'include', signal });
  if (!res.ok) throw await failure(res, 'Photo search did not work just now. Please try again.');
  return res.json() as Promise<PhotoResults>;
}

export async function similarTo(productId: number, signal?: AbortSignal): Promise<PhotoResults> {
  const res = await fetch(`${API_PUBLIC_URL}/v1/store/photo-search/similar/${productId}`, { signal });
  if (!res.ok) throw await failure(res, 'Similar items could not be loaded. Please try again.');
  return res.json() as Promise<PhotoResults>;
}

/** "Ask us to find it": the photo with the shopper's name and phone. */
export async function askWithPhoto(photo: string, input: { name: string; phone: string; details: string; website: string }) {
  const form = new FormData();
  form.append('photo', await blobOf(photo), 'photo.jpg');
  for (const [k, v] of Object.entries(input)) form.append(k, v);
  const res = await fetch(`${API_PUBLIC_URL}/v1/store/photo-search/request`, { method: 'POST', body: form });
  if (!res.ok) {
    const e = (await res.json().catch(() => null)) as { error?: { message?: string; fields?: Record<string, string> } } | null;
    return { ok: false as const, message: e?.error?.message ?? 'Could not send. Please try again.', fields: e?.error?.fields ?? {} };
  }
  return { ok: true as const };
}
