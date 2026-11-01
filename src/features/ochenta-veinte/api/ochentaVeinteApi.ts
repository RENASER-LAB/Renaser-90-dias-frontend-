import { apiFetch } from '../../../services/http/apiClient';
import type { TipoDePeriodo, VistaDelPeriodo } from '../types/ochentaVeinte.types';
import { leerVistaDelPeriodo } from './ochentaVeinteSchemas';

/**
 * El 80/20 y su análisis (spec 031, `contracts/api.md`), por tres puertas:
 * - **La persona** (la hoja «Tu 80/20» de Plan): `GET /api/v1/analisis-80-20?periodo=&inicio=`. Solo sobre sí misma.
 * - **Su mentor o su guía** (la ficha): `GET /api/v1/mentor/groups/{g}/learners/{u}/analisis-80-20`.
 * - **El líder, Administración y Alquimista** (la ficha): `GET /api/v1/leadership/groups/{g}/people/{p}/analisis-80-20`, o sin grupo,
 *   `GET /api/v1/leadership/people/{p}/analisis-80-20` (spec 021).
 *
 * `inicio` es el primer día del periodo que devolvió `anterior` o `siguiente`; sin él, el periodo en curso, que el servidor resuelve
 * en la zona de la persona. Solo lectura: abrirlo nunca genera nada ni llama a la IA.
 */

/** Los pedidos cortos vencen: la hoja no se queda esperando. */
const TIEMPO_MAXIMO_MS = 15_000;

/** Un tramo de la ruta, escapado: un id con `/` o `%` no puede cambiar a qué ruta se llama. */
const tramo = encodeURIComponent;

export const RUTA_DEL_OCHENTA_VEINTE = '/api/v1/analisis-80-20';

function conPeriodo(ruta: string, tipo: TipoDePeriodo, inicio: string | null): string {
  const consulta = `periodo=${tipo}${inicio ? `&inicio=${tramo(inicio)}` : ''}`;
  return `${ruta}?${consulta}`;
}

export function rutaPropia(tipo: TipoDePeriodo, inicio: string | null): string {
  return conPeriodo(RUTA_DEL_OCHENTA_VEINTE, tipo, inicio);
}

export function rutaDelAlumno(grupoId: string, alumnoId: string, tipo: TipoDePeriodo, inicio: string | null): string {
  return conPeriodo(`/api/v1/mentor/groups/${tramo(grupoId)}/learners/${tramo(alumnoId)}/analisis-80-20`, tipo, inicio);
}

/** Con `grupoId` en `null`, la puerta sin grupo del líder: `/leadership/people/{p}/analisis-80-20`. */
export function rutaDeLaPersona(grupoId: string | null, personaId: string, tipo: TipoDePeriodo, inicio: string | null): string {
  const base =
    grupoId === null
      ? `/api/v1/leadership/people/${tramo(personaId)}`
      : `/api/v1/leadership/groups/${tramo(grupoId)}/people/${tramo(personaId)}`;
  return conPeriodo(`${base}/analisis-80-20`, tipo, inicio);
}

export async function obtenerOchentaVeinteDeLaPersona(tipo: TipoDePeriodo, inicio: string | null): Promise<VistaDelPeriodo> {
  const respuesta = await apiFetch<unknown>(rutaPropia(tipo, inicio), { timeoutMs: TIEMPO_MAXIMO_MS });
  return leerVistaDelPeriodo(respuesta, 'GET /analisis-80-20');
}

export async function obtenerOchentaVeinteDeUnAlumno(
  grupoId: string,
  alumnoId: string,
  tipo: TipoDePeriodo,
  inicio: string | null,
): Promise<VistaDelPeriodo> {
  const respuesta = await apiFetch<unknown>(rutaDelAlumno(grupoId, alumnoId, tipo, inicio), { timeoutMs: TIEMPO_MAXIMO_MS });
  return leerVistaDelPeriodo(respuesta, 'GET /mentor/groups/{g}/learners/{u}/analisis-80-20');
}

export async function obtenerOchentaVeinteDeUnaPersona(
  grupoId: string | null,
  personaId: string,
  tipo: TipoDePeriodo,
  inicio: string | null,
): Promise<VistaDelPeriodo> {
  const respuesta = await apiFetch<unknown>(rutaDeLaPersona(grupoId, personaId, tipo, inicio), { timeoutMs: TIEMPO_MAXIMO_MS });
  return leerVistaDelPeriodo(
    respuesta,
    grupoId === null ? 'GET /leadership/people/{p}/analisis-80-20' : 'GET /leadership/groups/{g}/people/{p}/analisis-80-20',
  );
}
