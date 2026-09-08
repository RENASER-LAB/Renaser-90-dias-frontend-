import { Platform } from 'react-native';

import { apiFetch } from '../../../services/http/apiClient';

const RUTA_SERVICE_WORKER = '/renaser-push-sw.js';

type SuscripcionWebJson = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function claveVapid(): string {
  return process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || '';
}

function base64UrlABytes(valor: string): ArrayBuffer {
  const padding = '='.repeat((4 - (valor.length % 4)) % 4);
  const base64 = (valor + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binario = window.atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  // TS 6 distingue ArrayBuffer de SharedArrayBuffer en BufferSource. Copiar los bytes a un
  // buffer propio deja el tipo y el runtime alineados con PushManager.subscribe.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function navegadorCompatible(): boolean {
  return Platform.OS === 'web'
    && typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window;
}

/**
 * Prepara y registra la suscripción del navegador en el backend.
 *
 * Es idempotente: `pushManager.getSubscription()` reutiliza la suscripción existente y el
 * endpoint de tokens hace upsert por token. La identidad del usuario viaja únicamente en la
 * sesión `X-Auth-Token`; nunca se acepta un `userId` desde este bundle.
 */
export async function registrarSuscripcionWebPush(): Promise<boolean> {
  if (!navegadorCompatible() || !claveVapid()) return false;

  try {
    const permiso = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permiso !== 'granted') return false;

    const registro = await navigator.serviceWorker.register(RUTA_SERVICE_WORKER);
    await navigator.serviceWorker.ready;
    let suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlABytes(claveVapid()),
      });
    }

    const datos = suscripcion.toJSON() as SuscripcionWebJson;
    const endpoint = datos.endpoint;
    const p256dh = datos.keys?.p256dh;
    const auth = datos.keys?.auth;
    if (!endpoint || !p256dh || !auth) return false;

    await apiFetch('/api/v1/push-tokens', {
      method: 'POST',
      body: {
        platform: 'WEB',
        token: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
      },
    });
    return true;
  } catch {
    return false;
  }
}
