import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { escribirOEncolar } from '../../sinRed/escrituraSinRed';
import { horaReal } from '../../sinRed/horaReal';
import { fechaLocal } from '../../habits/notificaciones/utils/alarmasPorDia';
import type { CierreDelDia, CierresDeLaSemana, CuerpoDelCierre } from '../types/cierre.types';
import { leerCierreDelDia, leerCierresDeLaSemana } from './cierreSchemas';
import { cierreConLoElegido, etiquetaDelCierre, resumenDelCierre, revisarElDiaDelCierre } from './cierreSinRed';

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

/**
 * Cierra (o vuelve a cerrar) el día de hoy. Idempotente: reemplaza todas las respuestas del día.
 *
 * Spec 048 fase 3 (FR-019): sin señal se guarda en la cola con la hora real y devuelve el día ya cerrado con lo elegido. Para eso
 * necesita `vista`, el día que la hoja tiene a la vista; sin él, sin señal falla como siempre.
 */
export async function guardarCierreDelDia(cuerpo: CuerpoDelCierre, vista?: CierreDelDia): Promise<CierreDelDia> {
  return escribirOEncolar<CierreDelDia>(
    {
      area: 'cierre',
      etiqueta: etiquetaDelCierre(cuerpo.fecha, fechaLocal(horaReal().instante)),
      metodo: 'PUT',
      ruta: RUTA_DEL_CIERRE,
      cuerpo,
      resumen: vista ? resumenDelCierre(cuerpo, vista) : null,
      timeoutMs: TIEMPO_MAXIMO_MS,
    },
    {
      validar: respuesta => leerCierreDelDia(respuesta, 'PUT /rocks/day-closure'),
      optimista: envio => {
        if (!vista) throw new ApiError(0, 'No se pudo conectar con el servidor.');
        return cierreConLoElegido(vista, cuerpo, envio.hechoEn);
      },
      antesDeEncolar: hora => {
        if (!vista) throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
        revisarElDiaDelCierre(cuerpo.fecha, hora);
      },
    },
  );
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
