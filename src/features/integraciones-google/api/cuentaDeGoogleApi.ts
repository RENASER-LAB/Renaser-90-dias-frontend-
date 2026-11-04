import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';

/**
 * La cuenta de Google que organiza las salas de Meet (spec 040, D-321): `/api/v1/admin/integraciones/google`. Solo ADMIN y ALCHEMIST;
 * cualquier otro recibe 403 del servidor, que es quien autoriza.
 *
 * **Nunca viaja un permiso ni un token**: el estado trae el correo, cuándo se conectó y las últimas acciones. Conectar es abrir en el
 * navegador la dirección de Google que devuelve `POST …/connect`; Google vuelve al servidor (no a la app) y la app relee el estado al
 * volver al frente.
 *
 * Esquema tolerante (`passthrough`): un campo nuevo no rompe un APK publicado. Un backend anterior a la spec 040 responde 404.
 */
export const RUTA_DE_LA_CUENTA_DE_GOOGLE = '/api/v1/admin/integraciones/google';

const accionSchema = z
  .object({
    en: z.string().nullish(),
    accion: z.string().nullish(),
    quien: z.string().nullish(),
    exito: z.boolean().nullish(),
    codigoHttp: z.number().nullish(),
  })
  .passthrough();

export const cuentaDeGoogleSchema = z
  .object({
    /** El servidor tiene las credenciales de Google y la clave de cifrado: sin eso no se puede conectar. */
    configurada: z.boolean(),
    conectada: z.boolean(),
    correo: z.string().nullish(),
    /** `ACTIVA` o `REVOCADA`; `null` sin cuenta. */
    estado: z.string().nullish(),
    conectadaEn: z.string().nullish(),
    ultimoUso: z.string().nullish(),
    ultimoError: z.string().nullish(),
    acciones: z.array(accionSchema).nullish().transform(v => v ?? []),
  })
  .passthrough();

export type CuentaDeGoogleApi = z.infer<typeof cuentaDeGoogleSchema>;
export type AccionDeGoogleApi = z.infer<typeof accionSchema>;

export async function leerLaCuentaDeGoogle(): Promise<CuentaDeGoogleApi> {
  return validarRespuesta<CuentaDeGoogleApi>(
    cuentaDeGoogleSchema,
    await apiFetch<unknown>(RUTA_DE_LA_CUENTA_DE_GOOGLE),
    `GET ${RUTA_DE_LA_CUENTA_DE_GOOGLE}`,
  );
}

const conexionSchema = z.object({ url: z.string().min(1) }).passthrough();

/** La dirección de Google adonde hay que mandar a la persona. 409 si el servidor no tiene las credenciales. */
export async function empezarLaConexionConGoogle(): Promise<string> {
  const r = conexionSchema.safeParse(await apiFetch<unknown>(`${RUTA_DE_LA_CUENTA_DE_GOOGLE}/connect`, { method: 'POST' }));
  if (!r.success) throw new Error(`El backend respondió algo inesperado en POST ${RUTA_DE_LA_CUENTA_DE_GOOGLE}/connect`);
  return r.data.url;
}

/** Revoca el permiso en Google y lo borra. Los enlaces ya creados siguen funcionando. */
export async function desconectarLaCuentaDeGoogle(): Promise<void> {
  await apiFetch<unknown>(RUTA_DE_LA_CUENTA_DE_GOOGLE, { method: 'DELETE' });
}
