import type { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import { aSemaforoDeHoy } from '../../semaforo/api/semaforoSchemas';
import type { ResumenHomeApi } from '../types/home.types';
import { homeSchemas, validarRespuesta } from './homeSchemas';

/**
 * `GET /api/v1/home` — el agregador del dia para la pantalla de Inicio.
 *
 * Aca vive solo el "como se llama": que hacer con la respuesta es de `hooks/`.
 *
 * El backend normaliza `rocasHoy.completadas` (femenino) a `completados` para que la pantalla
 * lea un solo nombre en los dos conteos.
 */
export async function obtenerResumenHome(): Promise<ResumenHomeApi> {
  const r = await apiFetch<unknown>('/api/v1/home');
  return aResumenHome(validarRespuesta(homeSchemas.resumen, r, 'GET /api/v1/home'));
}

/**
 * De lo validado a lo que lee la pantalla. Separado de la llamada para poder probarlo sin red.
 *
 * `semaforo` ausente (backend anterior al semaforo) y `null` (no se mide) quedan igual: `null`.
 */
export function aResumenHome(validado: z.infer<typeof homeSchemas.resumen>): ResumenHomeApi {
  return {
    ...validado,
    rocasHoy: validado.rocasHoy
      ? { completados: validado.rocasHoy.completadas, total: validado.rocasHoy.total }
      : null,
    semaforo: validado.semaforo ? aSemaforoDeHoy(validado.semaforo) : null,
  };
}
