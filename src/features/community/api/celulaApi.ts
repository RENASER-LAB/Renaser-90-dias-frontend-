import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { CellMember, CelulaDelAprendiz, MiCelulaInfo } from '../types/community.types';
import {
  cellMembersResponseSchema,
  miCelulaResponseSchema,
  misCelulasResponseSchema,
  validarRespuesta,
} from './celulaSchemas';

/**
 * Endpoints de "mi célula" (`MiCelulaController` en el backend Java). Mismo criterio que
 * `wallApi.ts`: acá solo vive el "cómo se llama"; qué hacer con la respuesta es del hook
 * `useMiCelula`.
 */

/**
 * `GET /api/v1/me/cell` — mentor y célula del aprendiz que llama.
 *
 * Contempla DOS formas de "sin célula asignada", a propósito: el backend correcto (corregido en
 * esta misma tarea, ver `docs/informes/comunidad-mentor-y-tribu.md`) responde `200
 * {"assigned":false}`, pero hasta que el servidor en ejecución se recompile con ese cambio
 * sigue respondiendo `404` con el mismo cuerpo — un estado válido, no un error. Sin este
 * `catch`, cada aprendiz sin célula vería "no pudimos cargar tu mentor" en vez del mensaje
 * correcto. Una vez que el backend desplegado tenga el fix, la rama del `catch` deja de
 * ejercitarse sola (nunca vuelve a lanzar 404 para este caso) — no hace falta retirarla a mano.
 */
export async function obtenerMiCelula(): Promise<MiCelulaInfo> {
  try {
    const r = await apiFetch<unknown>('/api/v1/me/cell');
    return normalizarMiCelula(r);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && esCuerpoSinAsignar(error.body)) {
      return { assigned: false };
    }
    throw error;
  }
}

function esCuerpoSinAsignar(body: unknown): boolean {
  return !!body && typeof body === 'object' && (body as { assigned?: unknown }).assigned === false;
}

function normalizarMiCelula(respuesta: unknown): MiCelulaInfo {
  const validado = validarRespuesta<{ assigned: false } | Record<string, unknown>>(
    miCelulaResponseSchema,
    respuesta,
    'GET /api/v1/me/cell'
  );
  if ('assigned' in validado && validado.assigned === false) {
    return { assigned: false };
  }
  return { assigned: true, ...(validado as Omit<Extract<MiCelulaInfo, { assigned: true }>, 'assigned'>) };
}

/** `GET /api/v1/me/cell/members` — integrantes de la célula. Sin célula: `{"members": []}`,
 * ya en 200 hoy (no tiene el defecto de §6.1). */
export async function obtenerMisCompaneros(): Promise<CellMember[]> {
  const r = await apiFetch<unknown>('/api/v1/me/cell/members');
  const validado = validarRespuesta<{ members: CellMember[] }>(
    cellMembersResponseSchema,
    r,
    'GET /api/v1/me/cell/members'
  );
  return validado.members;
}

/**
 * `GET /api/v1/me/cells` — TODOS los grupos del aprendiz, el principal primero (D-142).
 *
 * Distinto de `obtenerMiCelula`, que responde por uno solo. Existe porque desde que alguien puede
 * pertenecer a varios grupos, preguntarle "¿cuál es tu grupo?" al backend y usar esa respuesta para
 * pintar la info de cualquiera de ellos mostraba siempre el mismo — el principal.
 *
 * Sin grupos devuelve `[]`, que es un estado válido: no se distingue de un error porque el backend
 * responde 200 igual.
 */
export async function obtenerMisCelulas(): Promise<CelulaDelAprendiz[]> {
  const r = await apiFetch<unknown>('/api/v1/me/cells');
  const validado = validarRespuesta<{ cells: CelulaDelAprendiz[] }>(
    misCelulasResponseSchema,
    r,
    'GET /api/v1/me/cells'
  );
  return validado.cells;
}

/**
 * `GET /api/v1/me/cells/{cellId}/members` — los integrantes de UNO de sus grupos (D-142).
 *
 * El backend responde 403 si el aprendiz no pertenece a ese grupo; no se traduce a lista vacía acá,
 * porque una lista vacía es indistinguible de "el grupo está vacío" y quien llame no podría
 * distinguir un grupo ajeno de uno propio recién creado.
 */
export async function obtenerIntegrantesDeGrupo(cellId: string): Promise<CellMember[]> {
  const r = await apiFetch<unknown>(`/api/v1/me/cells/${encodeURIComponent(cellId)}/members`);
  const validado = validarRespuesta<{ members: CellMember[] }>(
    cellMembersResponseSchema,
    r,
    'GET /api/v1/me/cells/{cellId}/members'
  );
  return validado.members;
}
