import { apiFetch } from '../../../services/http/apiClient';
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
  const validado = validarRespuesta(homeSchemas.resumen, r, 'GET /api/v1/home');

  return {
    ...validado,
    rocasHoy: validado.rocasHoy
      ? { completados: validado.rocasHoy.completadas, total: validado.rocasHoy.total }
      : null,
  };
}
