import { apiFetch } from '../../../services/http/apiClient';
import type { CompletarLeccionApi, LeccionDetalleApi, MotivoBloqueoApi } from '../types/academy.types';
import { academySchemas, validarRespuesta } from './academySchemas';

/**
 * Endpoints de `LeccionController` (backend Java) — lado alumno. Mismo criterio que
 * `cursosApi.ts`: acá solo el "cómo se llama".
 */

/**
 * GET /api/v1/lecciones/{id} — la lección COMPLETA (`cuerpoHtml`/`cuerpoMd`, `videoUrl`,
 * `videoMiniaturaUrl`, `recursos`). `LeccionLiteResponse` (el árbol del curso) no trae nada de
 * esto, así que hace falta este pedido aparte recién cuando la persona abre una lección puntual
 * — mismo patrón "pedir bajo demanda" que ya usa `useWallFeed.cargarComentarios`.
 */
export async function obtenerLeccion(leccionId: string): Promise<LeccionDetalleApi> {
  const r = await apiFetch<unknown>(`/api/v1/lecciones/${leccionId}`);
  return validarRespuesta(academySchemas.leccionDetalle, r, 'GET /api/v1/lecciones/{id}');
}

/**
 * GET /api/v1/lecciones/{id}/preview — motivo de bloqueo de una lección puntual. Sin uso hoy:
 * dentro de un curso ya accesible, el `bloqueadaPorDia` que ya trae `LeccionLiteResponse`
 * (dentro del árbol de secciones) alcanza para decidir si se puede abrir — pedir esto de nuevo
 * sería una llamada redundante. Se deja disponible por si se agrega un deep link directo a una
 * lección sin pasar por el árbol del curso.
 */
export async function obtenerPreviewLeccion(leccionId: string): Promise<MotivoBloqueoApi> {
  const r = await apiFetch<unknown>(`/api/v1/lecciones/${leccionId}/preview`);
  return validarRespuesta(academySchemas.motivoBloqueo, r, 'GET /api/v1/lecciones/{id}/preview');
}

/** POST /api/v1/lecciones/{id}/complete — reemplaza la escritura directa que la app hacía contra `leccion_progreso`. */
export async function completarLeccion(leccionId: string): Promise<CompletarLeccionApi> {
  const r = await apiFetch<unknown>(`/api/v1/lecciones/${leccionId}/complete`, { method: 'POST' });
  return validarRespuesta(academySchemas.completarLeccion, r, 'POST /api/v1/lecciones/{id}/complete');
}

/** DELETE /api/v1/lecciones/{id}/complete — inverso de `completarLeccion`. Responde 204, sin cuerpo. */
export async function descompletarLeccion(leccionId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/lecciones/${leccionId}/complete`, { method: 'DELETE' });
}
