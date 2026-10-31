import { apiFetch } from '../../../services/http/apiClient';
import type { CierreDelDia, CierresDeLaSemana, CuerpoDelCierre } from '../types/cierre.types';
import { leerCierreDelDia, leerCierresDeLaSemana } from './cierreSchemas';

/**
 * Las lecturas y la escritura de «Cierra tu día» (spec 017, `contracts/api.md`).
 *
 * - **La persona** (Training): `GET /api/v1/rocks/day-closure?date=` (sin `date`, hoy en su zona) y
 *   `PUT /api/v1/rocks/day-closure`. Cerrar **solo** guarda respuestas: nunca completa una acción, paga puntos ni
 *   publica nada, así que esta capa no toca `/rocks/{id}/evidence` ni `/habit-tracks/{id}/complete`.
 * - **Su acompañamiento** (la ficha): la misma semana por dos puertas, como el Radar y el tiempo libre:
 *   el mentor o la guía vigente, `/api/v1/mentor/groups/{g}/learners/{u}/cierres`; el líder de mentores, el
 *   administrador y el alquimista, `/api/v1/leadership/groups/{g}/people/{p}/cierres`.
 *
 * `semana` es el lunes (`yyyy-MM-dd`); sin ella, la semana en curso de la persona. Una semana futura o anterior a su
 * primera semana la rechaza el servidor (400): la sección no navega hasta ahí.
 */

/** Los pedidos cortos vencen: Training no se queda esperando un cierre que no llega. */
const TIEMPO_MAXIMO_MS = 15_000;

/** Un tramo de la ruta, escapado: un id con `/` o `%` no puede cambiar a qué ruta se llama. */
const tramo = encodeURIComponent;

export const RUTA_DEL_CIERRE = '/api/v1/rocks/day-closure';

/** `fecha` = `YYYY-MM-DD`; sin ella, hoy en la zona de la persona (lo decide el servidor). */
export async function obtenerCierreDelDia(fecha?: string | null): Promise<CierreDelDia> {
  const ruta = fecha ? `${RUTA_DEL_CIERRE}?date=${tramo(fecha)}` : RUTA_DEL_CIERRE;
  const respuesta = await apiFetch<unknown>(ruta, { timeoutMs: TIEMPO_MAXIMO_MS });
  return leerCierreDelDia(respuesta, 'GET /rocks/day-closure');
}

/** Cierra (o vuelve a cerrar) el día de hoy. Idempotente: reemplaza todas las respuestas del día. */
export async function guardarCierreDelDia(cuerpo: CuerpoDelCierre): Promise<CierreDelDia> {
  const respuesta = await apiFetch<unknown>(RUTA_DEL_CIERRE, { method: 'PUT', body: cuerpo, timeoutMs: TIEMPO_MAXIMO_MS });
  return leerCierreDelDia(respuesta, 'PUT /rocks/day-closure');
}

/** De qué ruta vino la respuesta, para el mensaje de un error: la de la persona sin grupo o la del grupo. */
function origenDeLaPersona(grupoId: string | null, que: string): string {
  return grupoId === null ? `GET /leadership/people/{p}/${que}` : `GET /leadership/groups/{g}/people/{p}/${que}`;
}

function conSemana(ruta: string, semana?: string | null): string {
  return semana ? `${ruta}?semana=${tramo(semana)}` : ruta;
}

export function rutaDeLosCierresDelAlumno(grupoId: string, alumnoId: string, semana?: string | null): string {
  return conSemana(`/api/v1/mentor/groups/${tramo(grupoId)}/learners/${tramo(alumnoId)}/cierres`, semana);
}

/** Con `grupoId` en `null`, la puerta sin grupo del líder: `/leadership/people/{p}/cierres` (2026-10-31). */
export function rutaDeLosCierresDePersona(grupoId: string | null, personaId: string, semana?: string | null): string {
  const base =
    grupoId === null
      ? `/api/v1/leadership/people/${tramo(personaId)}`
      : `/api/v1/leadership/groups/${tramo(grupoId)}/people/${tramo(personaId)}`;
  return conSemana(`${base}/cierres`, semana);
}

/** Para la ficha del mentor o de la guía. */
export async function obtenerCierresDeAlumno(
  grupoId: string,
  alumnoId: string,
  semana?: string | null,
): Promise<CierresDeLaSemana> {
  const respuesta = await apiFetch<unknown>(rutaDeLosCierresDelAlumno(grupoId, alumnoId, semana));
  return leerCierresDeLaSemana(respuesta, 'GET /mentor/groups/{g}/learners/{u}/cierres');
}

/** Para las fichas del líder, de Administración y del alquimista. */
export async function obtenerCierresDePersona(
  grupoId: string | null,
  personaId: string,
  semana?: string | null,
): Promise<CierresDeLaSemana> {
  const respuesta = await apiFetch<unknown>(rutaDeLosCierresDePersona(grupoId, personaId, semana));
  return leerCierresDeLaSemana(respuesta, origenDeLaPersona(grupoId, 'cierres'));
}
