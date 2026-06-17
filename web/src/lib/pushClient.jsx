// Client-side push notification helper.
// Subscribes the current browser to web push using the VAPID public key
// exposed by /api/push/settings, and POSTs the subscription to
// /api/push/subscribe. Falls back gracefully when:
//   - browser doesn't support Push API (Safari < 16, etc.)
//   - permission denied
//   - no VAPID public key configured server-side
import { api } from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no_service_worker' };
  if (!('PushManager' in window))    return { ok: false, reason: 'no_push_manager' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'permission_denied' };

  // Fetch VAPID public key from server
  const cfg = await api('/api/push/settings').catch(() => null);
  if (!cfg?.vapid_public_key) return { ok: false, reason: 'no_vapid_public_key' };

  // Wait for the SW to be ready (registered in index.html)
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(cfg.vapid_public_key),
    });
  }
  await api('/api/push/subscribe', {
    method: 'POST',
    body: { endpoint: sub.endpoint, keys: sub.toJSON().keys },
  });
  return { ok: true };
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return { ok: false };
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return { ok: false };
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api('/api/push/unsubscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe();
  }
  return { ok: true };
}

export async function pushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, permission: 'denied', subscribed: false };
  }
  const permission = Notification.permission;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return { supported: true, permission, subscribed: !!sub };
}
