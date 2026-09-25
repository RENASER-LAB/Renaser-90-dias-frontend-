import { ApiError, apiFetch } from '../../../services/http/apiClient';
import type { FalloSemaforo } from '../hooks/useMiSemaforo';
import type { DetalleDelSemaforo, ResumenPorGrupos, SemaforoDelGrupo } from '../types/semaforo.types';
import {
  aDetalleDelSemaforo,
  aResumenPorGrupos,
  aSemaforoDelGrupo,
  semaforoSchemas,
  validarRespuesta,
} from './semaforoSchemas';

/**
 * El semáforo propio (contrato §4.1). Acá vive solo el "cómo se llama"; qué hacer con la respuesta
 * es de `hooks/useMiSemaforo`.
 *
 * Las tres rutas devuelven el MISMO formato —el detalle completo—, así que pausar o volver a medir
 * dejan la pantalla al día sin una segunda lectura.
 *
 * Más abajo, las rutas de quien mira a OTROS (§4.1 del mentor y de administración, §4.3 y §4.4).
 * Quién puede ver qué lo decide el servidor en cada llamada: la app solo elige la puerta.
 */

/** Lo que el contrato pide por defecto. */
export const SEMANAS_POR_DEFECTO = 8;
/** Los límites que acepta el servidor (`semanas` entre 1 y 13). Pedir fuera de eso es un 400. */
const SEMANAS_MINIMAS = 1;
const SEMANAS_MAXIMAS = 13;

function semanasValidas(semanas: number): number {
  if (!Number.isFinite(semanas)) return SEMANAS_POR_DEFECTO;
  return Math.min(SEMANAS_MAXIMAS, Math.max(SEMANAS_MINIMAS, Math.round(semanas)));
}

function aDetalle(respuesta: unknown, origen: string): DetalleDelSemaforo {
  return aDetalleDelSemaforo(validarRespuesta(semaforoSchemas.detalle, respuesta, origen));
}

/** `GET /api/v1/me/semaforo?semanas=N`: la ventana vigente, la pausa y las últimas semanas cerradas. */
export async function obtenerMiSemaforo(semanas: number = SEMANAS_POR_DEFECTO): Promise<DetalleDelSemaforo> {
  const respuesta = await apiFetch<unknown>(`/api/v1/me/semaforo?semanas=${semanasValidas(semanas)}`);
  return aDetalle(respuesta, 'GET /api/v1/me/semaforo');
}

/**
 * `PUT /api/v1/me/semaforo/pausa`: pausa desde hoy hasta `hasta` (inclusive, `yyyy-MM-dd`, en la
 * zona de la persona). Solo el staff con programa propio; al aprendiz el servidor le responde 403.
 * Si `hasta` quedara antes de hoy, el servidor responde 400 con el motivo.
 */
export async function pausarSemaforo(hasta: string): Promise<DetalleDelSemaforo> {
  const respuesta = await apiFetch<unknown>('/api/v1/me/semaforo/pausa', { method: 'PUT', body: { hasta } });
  return aDetalle(respuesta, 'PUT /api/v1/me/semaforo/pausa');
}

/** `DELETE /api/v1/me/semaforo/pausa`: termina la pausa y se vuelve a medir desde hoy. */
export async function reanudarSemaforo(): Promise<DetalleDelSemaforo> {
  const respuesta = await apiFetch<unknown>('/api/v1/me/semaforo/pausa', { method: 'DELETE' });
  return aDetalle(respuesta, 'DELETE /api/v1/me/semaforo/pausa');
}

// ------------------------------------------------------------------------------------------
// El semáforo de otros: mentor, líder de mentores y administración
// ------------------------------------------------------------------------------------------

/**
 * De quién es el detalle y por qué puerta se pide. El mentor entra por el grupo que acompaña (el
 * servidor comprueba que lo acompañe HOY y que la persona sea de ese grupo); administración, por
 * la persona.
 */
export type OrigenDelAprendiz =
  | { quien: 'mentor'; grupoId: string; aprendizId: string }
  | { quien: 'admin'; aprendizId: string };

/** De qué grupo es la tabla y por qué puerta se pide. Las dos devuelven el mismo formato (§4.3). */
export interface OrigenDelGrupo {
  quien: 'mentor' | 'admin';
  grupoId: string;
}

/** Un tramo de la ruta, escapado: un id con `/` o `%` no puede cambiar a qué ruta se llama. */
const tramo = encodeURIComponent;

/** Sin `semanaHasta`, la ventana vigente; con él (un viernes), esa semana sábado→viernes. */
function conSemana(ruta: string, semanaHasta?: string | null): string {
  return semanaHasta ? `${ruta}?semanaHasta=${tramo(semanaHasta)}` : ruta;
}

/** §4.1: `…/mentor/groups/{g}/learners/{u}/semaforo` o `…/admin/trainees/{t}/semaforo`, con `?semanas=N`. */
export function rutaDelSemaforoDeAprendiz(origen: OrigenDelAprendiz, semanas: number = SEMANAS_POR_DEFECTO): string {
  const base =
    origen.quien === 'mentor'
      ? `/api/v1/mentor/groups/${tramo(origen.grupoId)}/learners/${tramo(origen.aprendizId)}/semaforo`
      : `/api/v1/admin/trainees/${tramo(origen.aprendizId)}/semaforo`;
  return `${base}?semanas=${semanasValidas(semanas)}`;
}

/** §4.3: `…/mentor/groups/{g}/semaforo` o `…/admin/semaforo/groups/{g}`. */
export function rutaDelSemaforoDelGrupo(origen: OrigenDelGrupo, semanaHasta?: string | null): string {
  const base =
    origen.quien === 'mentor'
      ? `/api/v1/mentor/groups/${tramo(origen.grupoId)}/semaforo`
      : `/api/v1/admin/semaforo/groups/${tramo(origen.grupoId)}`;
  return conSemana(base, semanaHasta);
}

/** §4.4: `/api/v1/semaforo/groups`. */
export function rutaDelResumenPorGrupos(semanaHasta?: string | null): string {
  return conSemana('/api/v1/semaforo/groups', semanaHasta);
}

/** El detalle de una persona que no es uno mismo: el mismo formato que `/me/semaforo` (§4.1). */
export async function obtenerSemaforoDeAprendiz(
  origen: OrigenDelAprendiz,
  semanas: number = SEMANAS_POR_DEFECTO,
): Promise<DetalleDelSemaforo> {
  const respuesta = await apiFetch<unknown>(rutaDelSemaforoDeAprendiz(origen, semanas));
  return aDetalle(
    respuesta,
    origen.quien === 'mentor'
      ? 'GET /api/v1/mentor/groups/{g}/learners/{u}/semaforo'
      : 'GET /api/v1/admin/trainees/{t}/semaforo',
  );
}

/** La tabla de un grupo, CON nombres (§4.3). Solo el mentor que lo acompaña y administración. */
export async function obtenerSemaforoDelGrupo(
  origen: OrigenDelGrupo,
  semanaHasta?: string | null,
): Promise<SemaforoDelGrupo> {
  const respuesta = await apiFetch<unknown>(rutaDelSemaforoDelGrupo(origen, semanaHasta));
  return aSemaforoDelGrupo(
    validarRespuesta(
      semaforoSchemas.grupo,
      respuesta,
      origen.quien === 'mentor' ? 'GET /api/v1/mentor/groups/{g}/semaforo' : 'GET /api/v1/admin/semaforo/groups/{g}',
    ),
  );
}

/** El resumen por grupos, SIN nombres (§4.4): líder de mentores, administración y alquimista. */
export async function obtenerResumenPorGrupos(semanaHasta?: string | null): Promise<ResumenPorGrupos> {
  const respuesta = await apiFetch<unknown>(rutaDelResumenPorGrupos(semanaHasta));
  return aResumenPorGrupos(validarRespuesta(semaforoSchemas.grupos, respuesta, 'GET /api/v1/semaforo/groups'));
}

/** El endpoint no está desplegado (404): no es un fallo de nadie y reintentar no sirve. */
export function esNoDisponible(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function esProhibido(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/** No hubo respuesta: backend apagado, sin red, URL mal puesta. */
export function esDeRed(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/** Por qué falló una lectura, con la misma clasificación que `useMiSemaforo`. */
export function falloDeLectura(error: unknown): FalloSemaforo {
  if (esNoDisponible(error)) return 'no_disponible';
  if (esProhibido(error)) return 'sin_permiso';
  if (esDeRed(error)) return 'sin_red';
  return 'error';
}
