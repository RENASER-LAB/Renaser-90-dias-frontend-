import { z } from 'zod';

/**
 * Validación en runtime de lo que responde el backend.
 *
 * Los tipos de TypeScript desaparecen al compilar: `apiFetch<UsuarioApi>` no comprueba nada, solo
 * le promete al compilador que el JSON tendrá esa forma. Si el backend renombra un campo, la app
 * no falla ahí — falla mucho después, con un `undefined` en una pantalla, lejos de la causa.
 *
 * Esto ya pasó en este proyecto: al escribir el cliente se asumió `{ disponible }` y `{ id }`
 * cuando el backend devuelve `{ available }` y `{ accountRequestId }`. Se detectó leyendo el
 * código Java; con estos esquemas se habría detectado solo, en la primera llamada.
 *
 * `passthrough()` a propósito: que el backend agregue campos nuevos NO debe romper la app; lo que
 * rompe es que falte o cambie de tipo uno de los que sí usamos.
 */

export const usuarioApiSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    status: z.string(),
    fullName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    bio: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
  })
  .passthrough();

export const disponibilidadEmailSchema = z.object({ available: z.boolean() }).passthrough();

export const verificacionEmailSchema = z.object({ verificationToken: z.string() }).passthrough();

/**
 * `CodigoResetVerificadoResponse` (200 de `POST /auth/password/verify-code`, D-102): el token de
 * un solo uso que después acepta `POST /auth/password/reset-confirm` junto con la contraseña nueva.
 */
export const codigoResetVerificadoSchema = z.object({ resetToken: z.string() }).passthrough();

export const solicitudCreadaSchema = z.object({ accountRequestId: z.string() }).passthrough();

/**
 * `RegistroPendienteSocialResponse` (202 de `POST /auth/social` cuando la identidad es nueva,
 * D-65): identidad verificada por el proveedor + el token de un solo uso que hay que reenviar a
 * `POST /auth/social/complete`. Sin `accountRequestId` — todavía no existe ninguna solicitud.
 */
export const registroPendienteSocialSchema = z
  .object({
    registroPendienteToken: z.string(),
    email: z.string(),
    fullName: z.string(),
  })
  .passthrough();

export const estadoSolicitudSchema = z
  .object({
    status: z.string(),
    rejectionReason: z.string().nullable(),
  })
  .passthrough();

/**
 * Valida y devuelve el dato con el tipo que el resto del código ya espera. Si la forma no coincide
 * se lanza un error que dice QUÉ campo falló y en qué endpoint — que es toda la diferencia entre
 * media hora de depuración y treinta segundos.
 */
export function validarRespuesta<T>(schema: z.ZodType, dato: unknown, endpoint: string): T {
  const resultado = schema.safeParse(dato);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('; ');
    throw new Error(`El backend respondió algo inesperado en ${endpoint} — ${detalle}`);
  }
  return resultado.data as T;
}
