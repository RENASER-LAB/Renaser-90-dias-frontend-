import { z } from 'zod';

import type {
  EstadoDeLlegada,
  ListaDeAsistencia,
  PersonaDeLaLista,
  Respuesta,
  RespuestasDelEvento,
} from '../types/asistencia.types';

/**
 * Validación y traducción de los endpoints de asistencia (D-256). Mismo criterio que
 * `eventosSchemas.ts`: imprescindible es solo el id de cada persona; lo demás es `.nullish()` y los
 * objetos `passthrough()`, porque la app no se actualiza por aire. Una persona sin id se descarta sola.
 */

const respuestaWire = z.string().nullish();

const personaRespuestaSchema = z
  .object({
    userId: z.string().min(1),
    fullName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    status: respuestaWire,
    respondedAt: z.string().nullish(),
    history: z.array(z.object({ status: respuestaWire, at: z.string() }).passthrough()).nullish(),
  })
  .passthrough();

const respuestasSchema = z
  .object({ occurrenceStart: z.string(), people: z.array(z.unknown()).nullish() })
  .passthrough();

const personaListaSchema = z
  .object({
    userId: z.string().min(1),
    fullName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    status: respuestaWire,
    respondedAt: z.string().nullish(),
    estado: z.string().nullish(),
    markedAt: z.string().nullish(),
  })
  .passthrough();

const listaSchema = z
  .object({
    occurrenceStart: z.string(),
    opensAt: z.string(),
    closesAt: z.string(),
    open: z.boolean().nullish(),
    closed: z
      .object({ at: z.string(), byUserId: z.string().nullish(), byName: z.string().nullish() })
      .passthrough()
      .nullish(),
    people: z.array(z.unknown()).nullish(),
  })
  .passthrough();

function aRespuesta(valor: string | null | undefined): Respuesta {
  return valor === 'GOING' || valor === 'NOT_GOING' || valor === 'MAYBE' ? valor : null;
}

function aLlegada(valor: string | null | undefined): EstadoDeLlegada {
  return valor === 'A_TIEMPO' || valor === 'TARDE' ? valor : null;
}

/** Las filas que sí cumplen; las demás se descartan sin tumbar la lista. */
function filasValidas<T>(crudas: unknown[] | null | undefined, schema: z.ZodType<T>): T[] {
  return (crudas ?? []).flatMap(cruda => {
    const r = schema.safeParse(cruda);
    return r.success ? [r.data] : [];
  });
}

export function leerRespuestas(crudo: unknown): RespuestasDelEvento {
  const r = respuestasSchema.parse(crudo);
  return {
    inicioOcurrencia: r.occurrenceStart,
    personas: filasValidas(r.people, personaRespuestaSchema).map(p => ({
      id: p.userId,
      nombre: p.fullName?.trim() || 'Sin nombre',
      avatarUrl: p.avatarUrl ?? null,
      respuesta: aRespuesta(p.status),
      respondidaEn: p.respondedAt ?? null,
      historial: (p.history ?? []).map(h => ({ respuesta: aRespuesta(h.status), en: h.at })),
    })),
  };
}

export function leerPersonaDeLaLista(crudo: unknown): PersonaDeLaLista {
  const p = personaListaSchema.parse(crudo);
  return {
    id: p.userId,
    nombre: p.fullName?.trim() || 'Sin nombre',
    avatarUrl: p.avatarUrl ?? null,
    respuesta: aRespuesta(p.status),
    respondidaEn: p.respondedAt ?? null,
    llegada: aLlegada(p.estado),
    marcadaEn: p.markedAt ?? null,
  };
}

export function leerLista(crudo: unknown): ListaDeAsistencia {
  const l = listaSchema.parse(crudo);
  return {
    inicioOcurrencia: l.occurrenceStart,
    abreEn: l.opensAt,
    cierraEn: l.closesAt,
    abierta: l.open === true,
    cerrada: l.closed ? { en: l.closed.at, porId: l.closed.byUserId ?? null, porNombre: l.closed.byName ?? null } : null,
    personas: filasValidas(l.people, personaListaSchema).map(leerPersonaDeLaLista),
  };
}
