import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';

/**
 * «Código Renaser en las fichas» (spec 034, D-299): si el mentor, la guía y el líder de mentores ven el Código Renaser de los
 * aprendices en sus fichas. `GET/PUT /api/v1/admin/codigo-renaser-en-fichas` — ADMIN, ALCHEMIST e IT_SUPPORT activos; cualquier
 * otro recibe 403 del servidor, que es quien autoriza. De fábrica está apagado.
 *
 * Esquema tolerante (`passthrough`): un campo nuevo del servidor no rompe un APK publicado. Un backend anterior a la spec 034
 * responde 404 y la pantalla lo dice con palabras.
 */
export const RUTA_DEL_CODIGO_RENASER_EN_FICHAS = '/api/v1/admin/codigo-renaser-en-fichas';

const ultimoCambioSchema = z
  .object({
    porId: z.string().nullish(),
    /** `null` si la cuenta de quien lo cambió ya no existe. */
    porNombre: z.string().nullish(),
    /** Instante ISO. */
    en: z.string().nullish(),
  })
  .passthrough();

export const codigoRenaserEnFichasSchema = z
  .object({
    visible: z.boolean(),
    /** Soporte TI dejó los tres roles distintos desde su consola: no «lo ven todos». */
    mixto: z.boolean().nullish().transform(v => v === true),
    porRol: z.record(z.string(), z.boolean()).nullish().transform(v => v ?? {}),
    ultimoCambio: ultimoCambioSchema.nullish().transform(v => v ?? null),
  })
  .passthrough();

export type CodigoRenaserEnFichasApi = z.infer<typeof codigoRenaserEnFichasSchema>;

export async function leerCodigoRenaserEnFichas(): Promise<CodigoRenaserEnFichasApi> {
  return validarRespuesta<CodigoRenaserEnFichasApi>(
    codigoRenaserEnFichasSchema,
    await apiFetch<unknown>(RUTA_DEL_CODIGO_RENASER_EN_FICHAS),
    `GET ${RUTA_DEL_CODIGO_RENASER_EN_FICHAS}`,
  );
}

/** Enciende (`true`) o apaga (`false`) para el mentor, la guía y el líder a la vez. Sin motivo: la confirmación está en la pantalla. */
export async function cambiarCodigoRenaserEnFichas(visible: boolean): Promise<CodigoRenaserEnFichasApi> {
  return validarRespuesta<CodigoRenaserEnFichasApi>(
    codigoRenaserEnFichasSchema,
    await apiFetch<unknown>(RUTA_DEL_CODIGO_RENASER_EN_FICHAS, { method: 'PUT', body: { visible } }),
    `PUT ${RUTA_DEL_CODIGO_RENASER_EN_FICHAS}`,
  );
}
