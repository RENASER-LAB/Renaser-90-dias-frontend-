import { z } from 'zod';

import { apiFetch } from '../../../services/http/apiClient';
import type { CuerpoDeLaCarrera, RespuestaDeLaCarrera } from '../types/carrera.types';

/**
 * `POST /api/v1/carreras` (spec 042, contracts/api.md §1): la ÚNICA escritura de una carrera. La clave de idempotencia es la
 * `carreraId` del cuerpo: repetir el mismo pedido devuelve 200 con `repetida: true` y lo mismo de la primera vez, sin km ni
 * puntos de más. Durante la carrera no se llama a nada (FR-004): esto solo corre al terminar y desde la cola.
 *
 * El esquema es tolerante: un campo de más o un `habito` que no se entiende no tumba el éxito (la carrera ya quedó guardada).
 */

const respuestaSchema = z
  .object({
    carreraId: z.string(),
    repetida: z.boolean().catch(false),
    fecha: z.string().nullish(),
    kilometros: z.number().catch(0),
    cuentaParaElHabito: z.boolean().catch(true),
    porRevisar: z.boolean().catch(false),
    motivoNoCuenta: z.string().nullish().catch(null),
    habito: z
      .object({
        resultado: z.string(),
        registroId: z.string().nullish(),
        kilometrosDelDia: z.number().nullish(),
        origenDelDia: z.string().nullish(),
        puntosOtorgados: z.number().catch(0),
      })
      .passthrough()
      .nullish()
      .catch(null),
  })
  .passthrough();

export function leerRespuestaDeLaCarrera(crudo: unknown, carreraId: string): RespuestaDeLaCarrera {
  const r = respuestaSchema.safeParse(crudo);
  if (!r.success) {
    return { carreraId, repetida: false, fecha: null, kilometros: 0, cuentaParaElHabito: true, porRevisar: false, motivoNoCuenta: null, habito: null };
  }
  const d = r.data;
  return {
    carreraId: d.carreraId,
    repetida: d.repetida,
    fecha: d.fecha ?? null,
    kilometros: d.kilometros,
    cuentaParaElHabito: d.cuentaParaElHabito,
    porRevisar: d.porRevisar,
    motivoNoCuenta: d.motivoNoCuenta?.trim() || null,
    habito: d.habito
      ? {
          resultado: d.habito.resultado,
          registroId: d.habito.registroId ?? null,
          kilometrosDelDia: d.habito.kilometrosDelDia ?? null,
          origenDelDia: d.habito.origenDelDia ?? null,
          puntosOtorgados: d.habito.puntosOtorgados,
        }
      : null,
  };
}

export async function enviarCarrera(cuerpo: CuerpoDeLaCarrera): Promise<RespuestaDeLaCarrera> {
  const crudo = await apiFetch<unknown>('/api/v1/carreras', { method: 'POST', body: cuerpo });
  return leerRespuestaDeLaCarrera(crudo, cuerpo.carreraId);
}

const rutaSchema = z.object({ polyline: z.string(), puntos: z.number() }).passthrough();

/** Quién pide la ruta de una carrera (contracts/api.md §3): cada rol por la misma puerta por la que ve la ficha. */
export type PuertaDeLaRuta =
  | { tipo: 'propia' }
  | { tipo: 'mentor'; grupoId: string; aprendizId: string }
  | { tipo: 'liderazgo'; grupoId: string | null; personaId: string };

export function rutaDeLaRuta(puerta: PuertaDeLaRuta, carreraId: string): string {
  const c = encodeURIComponent(carreraId);
  switch (puerta.tipo) {
    case 'propia':
      return `/api/v1/carreras/${c}/ruta`;
    case 'mentor':
      return `/api/v1/mentor/groups/${encodeURIComponent(puerta.grupoId)}/learners/${encodeURIComponent(puerta.aprendizId)}/carreras/${c}/ruta`;
    case 'liderazgo':
      return puerta.grupoId
        ? `/api/v1/leadership/groups/${encodeURIComponent(puerta.grupoId)}/people/${encodeURIComponent(puerta.personaId)}/carreras/${c}/ruta`
        : `/api/v1/leadership/people/${encodeURIComponent(puerta.personaId)}/carreras/${c}/ruta`;
  }
}

/**
 * Lee la ruta de una carrera (solo al abrir el mapa, FR-044). `null` si no se guardó, se borró a los 180 días o no existe (404).
 * Un 403 se lanza: quien llama decide qué decir. Todavía no la usa ninguna pantalla (el mapa de la ruta en las fichas queda pendiente).
 */
export async function leerRutaDeLaCarrera(puerta: PuertaDeLaRuta, carreraId: string): Promise<{ polyline: string; puntos: number } | null> {
  try {
    const crudo = await apiFetch<unknown>(rutaDeLaRuta(puerta, carreraId));
    const r = rutaSchema.safeParse(crudo);
    return r.success ? { polyline: r.data.polyline, puntos: r.data.puntos } : null;
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}
