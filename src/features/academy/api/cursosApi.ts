import { apiFetch } from '../../../services/http/apiClient';
import type {
  CursoBloqueadoApi,
  CursoDetalleApi,
  MiCursoApi,
  MotivoBloqueoApi,
  SeccionConLeccionesApi,
} from '../types/academy.types';
import { academySchemas, validarRespuesta } from './academySchemas';

/**
 * Endpoints de `CursoController` (backend Java) — lado alumno. Acá solo vive el "cómo se llama":
 * qué hacer con la respuesta es de `hooks/useCursos.ts` / `api/academyMappers.ts`, mismo criterio
 * que `features/community/api/wallApi.ts`.
 */

/** GET /api/v1/cursos — catálogo YA accesible del actor (rol + día de programa), con su progreso. */
export async function obtenerMisCursos(): Promise<MiCursoApi[]> {
  const r = await apiFetch<unknown>('/api/v1/cursos');
  return validarRespuesta(academySchemas.misCursos, r, 'GET /api/v1/cursos');
}

/**
 * GET /api/v1/cursos/bloqueados — los cursos "próximos" que se desbloquean más adelante por día
 * de programa, para pintarlos con candado en una escalera de catálogo.
 *
 * Queda sin conectar a la UI a propósito: la tarjeta de curso de `ComunidadScreen.tsx` no tiene
 * ningún estado visual de "bloqueado" (no hay esa pieza en el diseño actual, y la tarea prohíbe
 * inventar UI nueva para representarlo — ver el informe de la integración). Se deja lista para
 * cuando esa UI exista.
 */
export async function obtenerCursosBloqueados(): Promise<CursoBloqueadoApi[]> {
  const r = await apiFetch<unknown>('/api/v1/cursos/bloqueados');
  return validarRespuesta(academySchemas.cursosBloqueados, r, 'GET /api/v1/cursos/bloqueados');
}

/**
 * GET /api/v1/cursos/{id}/secciones — árbol de secciones + lecciones (metadata liviana, sin
 * cuerpo ni videoUrl) de un curso ya accesible. `useCursos` la pide para los 25 cursos EN
 * PARALELO al entrar a "Recursos Exclusivos" y cachea el resultado: es lo que permite que "%
 * completado" y "Módulos · Recursos" de la tarjeta salgan del árbol real (no de un número
 * inventado) y que "Explorar contenido" abra sin una ida y vuelta nueva a la red.
 */
export async function obtenerSeccionesCurso(cursoId: string): Promise<SeccionConLeccionesApi[]> {
  const r = await apiFetch<unknown>(`/api/v1/cursos/${cursoId}/secciones`);
  return validarRespuesta(academySchemas.secciones, r, 'GET /api/v1/cursos/{id}/secciones');
}

/**
 * GET /api/v1/cursos/{id} — detalle con `portadaFirmada`. Sin uso hoy: la vista de detalle del
 * curso ya arma todo lo que necesita con `obtenerMisCursos` + `obtenerSeccionesCurso`
 * (`hooks/useCursos.ts`); se deja disponible por si en el futuro se necesita la portada firmada
 * en esa vista (el diseño actual no pinta ninguna imagen de portada ahí).
 */
export async function obtenerDetalleCurso(cursoId: string): Promise<CursoDetalleApi> {
  const r = await apiFetch<unknown>(`/api/v1/cursos/${cursoId}`);
  return validarRespuesta(academySchemas.cursoDetalle, r, 'GET /api/v1/cursos/{id}');
}

/**
 * GET /api/v1/cursos/{id}/preview — motivo de bloqueo de un curso puntual. Sin uso hoy: la lista
 * de "mis cursos" (GET /api/v1/cursos) ya excluye los cursos no accesibles, así que ningún curso
 * bloqueado llega a poder tocarse desde la UI actual — no hay desde dónde pedir el motivo. Se
 * deja disponible para un futuro deep link directo a un curso por id.
 */
export async function obtenerPreviewCurso(cursoId: string): Promise<MotivoBloqueoApi> {
  const r = await apiFetch<unknown>(`/api/v1/cursos/${cursoId}/preview`);
  return validarRespuesta(academySchemas.motivoBloqueo, r, 'GET /api/v1/cursos/{id}/preview');
}
