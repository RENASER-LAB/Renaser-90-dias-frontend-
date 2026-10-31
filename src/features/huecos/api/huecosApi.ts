import { apiFetch } from '../../../services/http/apiClient';
import type { HuecosDeLaSemana } from '../types/huecos.types';
import { leerHuecosDeLaSemana } from './huecosSchemas';

/**
 * Las dos lecturas de los huecos de horario de una persona (spec 015, `contracts/api.md`). Dan la misma respuesta; cambia
 * la puerta, que es la del Radar de la spec 012:
 *
 * - el mentor o la guía vigente del grupo: `/api/v1/mentor/groups/{g}/learners/{u}/huecos`;
 * - el líder de mentores, el administrador y el alquimista: `/api/v1/leadership/groups/{g}/people/{p}/huecos`.
 *
 * `semana` es el lunes (`yyyy-MM-dd`); sin ella, la semana en curso de la persona. Una semana futura o anterior a su
 * primera semana la rechaza el servidor (400): la sección no navega hasta ahí. Un 403 (otro rol, cuenta suspendida o ya
 * no acompaña a esta persona) o un 404 (backend sin la ruta) los lee quien la muestra como «no hay sección».
 */

/** Un tramo de la ruta, escapado: un id con `/` o `%` no puede cambiar a qué ruta se llama. */
const tramo = encodeURIComponent;

/** De qué ruta vino la respuesta, para el mensaje de un error: la de la persona sin grupo o la del grupo. */
function origenDeLaPersona(grupoId: string | null, que: string): string {
  return grupoId === null ? `GET /leadership/people/{p}/${que}` : `GET /leadership/groups/{g}/people/{p}/${que}`;
}

function conSemana(ruta: string, semana?: string | null): string {
  return semana ? `${ruta}?semana=${tramo(semana)}` : ruta;
}

export function rutaDeLosHuecosDelAlumno(grupoId: string, alumnoId: string, semana?: string | null): string {
  return conSemana(`/api/v1/mentor/groups/${tramo(grupoId)}/learners/${tramo(alumnoId)}/huecos`, semana);
}

/** Con `grupoId` en `null`, la puerta sin grupo del líder: `/leadership/people/{p}/huecos` (2026-10-31). */
export function rutaDeLosHuecosDePersona(grupoId: string | null, personaId: string, semana?: string | null): string {
  const base =
    grupoId === null
      ? `/api/v1/leadership/people/${tramo(personaId)}`
      : `/api/v1/leadership/groups/${tramo(grupoId)}/people/${tramo(personaId)}`;
  return conSemana(`${base}/huecos`, semana);
}

/** Para la ficha del mentor. */
export async function obtenerHuecosDeAlumno(
  grupoId: string,
  alumnoId: string,
  semana?: string | null,
): Promise<HuecosDeLaSemana> {
  const respuesta = await apiFetch<unknown>(rutaDeLosHuecosDelAlumno(grupoId, alumnoId, semana));
  return leerHuecosDeLaSemana(respuesta, 'GET /mentor/groups/{g}/learners/{u}/huecos');
}

/** Para las fichas del líder, de Administración y del alquimista. */
export async function obtenerHuecosDePersona(
  grupoId: string | null,
  personaId: string,
  semana?: string | null,
): Promise<HuecosDeLaSemana> {
  const respuesta = await apiFetch<unknown>(rutaDeLosHuecosDePersona(grupoId, personaId, semana));
  return leerHuecosDeLaSemana(respuesta, origenDeLaPersona(grupoId, 'huecos'));
}
