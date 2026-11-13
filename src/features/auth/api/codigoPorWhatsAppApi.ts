import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';

/**
 * El código de verificación por WhatsApp (spec 043, D-325), para cuando no llega al correo. Tres llamadas públicas, sin sesión: quien las hace todavía
 * no tiene cuenta (el alta) o no puede entrar (recuperar la contraseña). El código se verifica por los endpoints de siempre.
 */

const disponibilidadSchema = z.object({ available: z.boolean() }).passthrough();
const enviadoSchema = z.object({ sentTo: z.string().nullish() }).passthrough();

/**
 * ¿Se puede ofrecer? `true` solo si el servidor responde 200 con `available: true`. Con el interruptor `auth.codigo_whatsapp` apagado (404), contra
 * un backend anterior (404) o ante cualquier error, `false`: la app queda como siempre (FR-013). Nunca lanza.
 */
export async function codigoPorWhatsAppDisponible(): Promise<boolean> {
  try {
    const r = await apiFetch<unknown>('/api/v1/auth/whatsapp-code', { conSesion: false, timeoutMs: 10_000 });
    const leido = disponibilidadSchema.safeParse(r);
    return leido.success && leido.data.available;
  } catch {
    return false;
  }
}

/** El código del alta al WhatsApp que se escribió. Devuelve el número enmascarado al que se mandó (`null` si el servidor no lo dice). */
export async function pedirCodigoDelRegistroPorWhatsApp(email: string, whatsapp: string): Promise<string | null> {
  const r = await apiFetch<unknown>('/api/v1/auth/whatsapp-code/registration', {
    method: 'POST',
    body: { email: email.trim(), whatsapp: whatsapp.trim() },
    conSesion: false,
  });
  const leido = enviadoSchema.safeParse(r);
  return leido.success ? leido.data.sentTo ?? null : null;
}

/**
 * El paso del WhatsApp de «Solicitar acceso»: ¿ese número ya es de otra cuenta? (spec 051, FR-014, decisión del dueño del 13/11: «el número es
 * único»). Resuelve si está libre. Un 409 `NUMERO_EN_USO`, un 422 o un 429 lanzan el `ApiError` del servidor, cuyo `message` ya está listo para
 * mostrarse. Contra un servidor anterior (404) o con el interruptor apagado resuelve sin más: la app queda como siempre y la solicitud
 * igual la valida el servidor al crearse.
 */
export async function comprobarNumeroDelRegistro(whatsapp: string): Promise<void> {
  try {
    await apiFetch<void>('/api/v1/auth/whatsapp-code/number', {
      method: 'POST',
      body: { whatsapp: whatsapp.trim() },
      conSesion: false,
    });
  } catch (error) {
    if ((error as { status?: number } | null)?.status === 404) return;
    throw error;
  }
}

/**
 * El código de la recuperación al WhatsApp GUARDADO de la cuenta. No lleva número a propósito (FR-008), y el servidor responde igual exista o no la
 * cuenta (FR-009): no hay nada que leer de la respuesta.
 */
export function pedirCodigoDeRecuperacionPorWhatsApp(email: string): Promise<void> {
  return apiFetch<void>('/api/v1/auth/whatsapp-code/password', {
    method: 'POST',
    body: { email: email.trim() },
    conSesion: false,
  });
}
