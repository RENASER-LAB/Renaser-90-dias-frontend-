import { apiFetch } from '../../../services/http/apiClient';
import type { AgenteRenasia, HistorialRenasiaApi, ResultadoPropuestaApi } from '../types/renasia.types';
import { renasiaSchemas, validarRespuesta } from './renasiaSchemas';

/**
 * `GET /api/v1/renasia/mensajes?agent=` — historial paginado por cursor DEL AGENTE pedido
 * (D-102: el acompañante y Sparkie tienen historiales separados; sin `agent` el backend asume el
 * acompañante, pero acá se manda siempre para que ningún panel cargue el historial equivocado).
 *
 * Acá solo vive el "cómo se llama": qué hacer con la respuesta (invertir el orden, pegarla con
 * lo que ya había en pantalla) es de `hooks/useRenasiaChat`, no de esta capa — mismo criterio que
 * `features/home/api/homeApi.ts` y `features/community/api/wallApi.ts`.
 *
 * El streaming de `POST /api/v1/renasia/mensajes` NO vive acá: `apiFetch` termina en
 * `JSON.parse` sobre el texto completo de la respuesta, y ese endpoint responde
 * `text/event-stream`. Ver `renasiaStream.ts`.
 */
export async function obtenerHistorialRenasia(
  agent: AgenteRenasia,
  cursor?: string,
  limit = 30
): Promise<HistorialRenasiaApi> {
  const params = new URLSearchParams();
  params.set('agent', agent);
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  const r = await apiFetch<unknown>(`/api/v1/renasia/mensajes?${params.toString()}`);
  return validarRespuesta<HistorialRenasiaApi>(renasiaSchemas.historial, r, 'GET /api/v1/renasia/mensajes');
}

/**
 * `POST /api/v1/renasia/propuestas/{id}/confirmar` — D-153. Ejecuta UNA vez la acción que propuso
 * el acompañante: un doble toque o un reintento devuelven el mismo resultado sin repetirla.
 *
 * - 200 `{estado:"CONFIRMADA"|"FALLIDA", mensaje}`: `FALLIDA` es que el negocio la rechazó al
 *   aplicarla (se venció el hábito, se acabó el cupo); `mensaje` es apto para mostrar.
 * - 409: la propuesta venció o ya se canceló. 403: no es tuya o la cuenta está suspendida.
 */
export async function confirmarPropuestaRenasia(id: string): Promise<ResultadoPropuestaApi> {
  const r = await apiFetch<unknown>(`/api/v1/renasia/propuestas/${encodeURIComponent(id)}/confirmar`, {
    method: 'POST',
  });
  return validarRespuesta<ResultadoPropuestaApi>(
    renasiaSchemas.resultadoPropuesta,
    r,
    'POST /api/v1/renasia/propuestas/{id}/confirmar'
  );
}

/** `POST /api/v1/renasia/propuestas/{id}/cancelar` — 204, idempotente (D-153). */
export async function cancelarPropuestaRenasia(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/renasia/propuestas/${encodeURIComponent(id)}/cancelar`, { method: 'POST' });
}
