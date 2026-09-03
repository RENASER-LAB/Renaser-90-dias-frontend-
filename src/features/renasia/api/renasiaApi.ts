import { apiFetch } from '../../../services/http/apiClient';
import type { HistorialRenasiaApi } from '../types/renasia.types';
import { renasiaSchemas, validarRespuesta } from './renasiaSchemas';

/**
 * `GET /api/v1/renasia/mensajes` — historial paginado por cursor.
 *
 * Acá solo vive el "cómo se llama": qué hacer con la respuesta (invertir el orden, pegarla con
 * lo que ya había en pantalla) es de `hooks/useRenasiaChat`, no de esta capa — mismo criterio que
 * `features/home/api/homeApi.ts` y `features/community/api/wallApi.ts`.
 *
 * El streaming de `POST /api/v1/renasia/mensajes` NO vive acá: `apiFetch` termina en
 * `JSON.parse` sobre el texto completo de la respuesta, y ese endpoint responde
 * `text/event-stream`. Ver `renasiaStream.ts`.
 */
export async function obtenerHistorialRenasia(cursor?: string, limit = 30): Promise<HistorialRenasiaApi> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const r = await apiFetch<unknown>(`/api/v1/renasia/mensajes?${params.toString()}`);
  return validarRespuesta<HistorialRenasiaApi>(renasiaSchemas.historial, r, 'GET /api/v1/renasia/mensajes');
}
