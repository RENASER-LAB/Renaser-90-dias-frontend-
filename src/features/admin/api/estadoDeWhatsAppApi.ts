import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';

/**
 * El estado de los envíos por WhatsApp (spec 054 del backend, D-361): `GET /api/v1/admin/whatsapp/estado`. Solo ADMIN y
 * ALQUIMISTA; cualquier otro recibe 403 del servidor, que es quien autoriza. Sin números ni nombres: solo si la cuenta de YCloud
 * se quedó sin saldo, cuántos envíos fallaron por eso y desde cuándo (ISO-8601 en UTC; `null` si no hay aviso).
 */
const estadoSchema = z
  .object({
    sinSaldo: z.boolean(),
    fallaron: z.number(),
    desde: z.string().nullable(),
  })
  .passthrough();

export type EstadoDeWhatsApp = z.infer<typeof estadoSchema>;

export const RUTA_DEL_ESTADO_DE_WHATSAPP = '/api/v1/admin/whatsapp/estado';

export async function leerElEstadoDeWhatsApp(): Promise<EstadoDeWhatsApp> {
  return validarRespuesta<EstadoDeWhatsApp>(
    estadoSchema,
    await apiFetch<unknown>(RUTA_DEL_ESTADO_DE_WHATSAPP),
    `GET ${RUTA_DEL_ESTADO_DE_WHATSAPP}`,
  );
}
