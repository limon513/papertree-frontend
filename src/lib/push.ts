import type { PushConfig } from './types';
import { API_PUBLIC_URL } from './utils';

/**
 * Push notifications in the browser (Firebase Cloud Messaging). Firebase is loaded only when the
 * shopper turns alerts on (or once a week to keep the device's token fresh), never on a normal visit.
 * The alerts themselves are shown by /sw.js. iPhones take web alerts only from the Home Screen app.
 */
const TOKEN = 'pt_push_token';
const LATER = 'pt_push_later';
const CHECKED = 'pt_push_checked';
const LINKED = 'pt_push_linked';
const LATER_DAYS = 14;

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'on' | 'off';

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      // Storage blocked: alerts still work, the page just asks again next time.
    }
  },
};

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Can this browser take alerts, and are they on? */
export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  // An iPhone in Safari: alerts work once the site is added to the Home Screen and opened from there.
  if (isIos() && !standalone()) return 'ios-install';
  if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && store.get(TOKEN)) return 'on';
  return 'off';
}

/** "Not now" was tapped lately: the shop does not ask again for two weeks. */
export const askedLately = () => Date.now() - Number(store.get(LATER) ?? 0) < LATER_DAYS * 86_400_000;
export const notNow = () => store.set(LATER, String(Date.now()));

/** "Chrome on Android": so a customer can tell their devices apart. */
function deviceName() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPod/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'a device';
  return `${browser} on ${os}`;
}

async function swRegistration() {
  const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
  await navigator.serviceWorker.ready;
  return reg;
}

/** This device's Firebase token (Firebase loaded now; a separate app from Google sign-in). */
async function fcmToken(config: PushConfig) {
  const [{ initializeApp, getApps }, m] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!(await m.isSupported())) throw new Error('This browser cannot take alerts');
  const app =
    getApps().find((a) => a.name === 'push') ??
    initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId }, 'push');
  return m.getToken(m.getMessaging(app), { vapidKey: config.vapidKey, serviceWorkerRegistration: await swRegistration() });
}

const tell = (path: string, body: object) =>
  fetch(`${API_PUBLIC_URL}/v1/store${path}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** Turn alerts on for this device: the browser asks permission (only now, after the shopper tapped). */
export async function turnOn(config: PushConfig): Promise<'on' | 'denied' | 'failed'> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'failed';
    const token = await fcmToken(config);
    const res = await tell('/push/devices', { token, device: deviceName() });
    if (!res.ok) return 'failed';
    store.set(TOKEN, token);
    store.set(CHECKED, String(Date.now()));
    return 'on';
  } catch {
    return 'failed';
  }
}

/** Turn alerts off for this device. */
export async function turnOff(config: PushConfig | null) {
  const token = store.get(TOKEN);
  store.set(TOKEN, null);
  store.set(LINKED, null);
  if (!token) return;
  await tell('/push/devices/remove', { token }).catch(() => undefined);
  if (!config) return;
  try {
    const [{ getApps }, m] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
    const app = getApps().find((a) => a.name === 'push');
    if (app) await m.deleteToken(m.getMessaging(app));
  } catch {
    // The shop has forgotten the device anyway.
  }
}

/**
 * On a visit with alerts on: the device is linked to the account once signed in (once per sign-in), and
 * its token is checked about once a week (Firebase may change it). Cheap: usually nothing happens.
 */
export async function keepPushFresh(config: PushConfig | null, customerId: number | null) {
  if (!config || pushState() !== 'on') return;
  const token = store.get(TOKEN)!;
  const linkKey = `${customerId ?? 'guest'}:${token.slice(-12)}`;
  const weekOld = Date.now() - Number(store.get(CHECKED) ?? 0) > 7 * 86_400_000;
  if (weekOld) {
    try {
      const fresh = await fcmToken(config);
      store.set(CHECKED, String(Date.now()));
      if (fresh !== token) {
        store.set(TOKEN, fresh);
        await tell('/push/devices/remove', { token }).catch(() => undefined);
        await tell('/push/devices', { token: fresh, device: deviceName() });
        store.set(LINKED, `${customerId ?? 'guest'}:${fresh.slice(-12)}`);
        return;
      }
    } catch {
      return;
    }
  }
  if (customerId && store.get(LINKED) !== linkKey) {
    const res = await tell('/push/devices', { token, device: deviceName() }).catch(() => null);
    if (res?.ok) store.set(LINKED, linkKey);
  }
}
