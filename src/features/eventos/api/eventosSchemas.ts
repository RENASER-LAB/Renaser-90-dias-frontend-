import { z } from 'zod';

import type { Asistencia, Evento, Ocurrencia, ReglaDeAviso, TipoUbicacion } from '../types/eventos.types';

/**
 * Validación y traducción de `/api/v1/calendar/events` (backend `calendar`, `EventoResponse` y
 * `OcurrenciaResponse`).
 *
 * **Imprescindible** es solo `id`, `title` y `startsAt`: sin eso no hay qué mostrar ni qué abrir.
 * Todo lo demás es `.nullish()` y los objetos son `passthrough()`, porque la app no se actualiza por
 * aire: un campo nuevo, uno que deja de venir o un valor de enum que esta versión no conoce tienen que
 * seguir mostrando el evento, no romper la sección entera.
 *
 * Y un evento que no cumple ni lo imprescindible **se descarta solo**: la lista muestra los demás.
 */

const reglaSchema = z
  .object({ kind: z.string(), value: z.union([z.number(), z.string()]).nullish() })
  .passthrough();

const eventoSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    description: z.string().nullish(),
    coverUrl: z.string().nullish(),
    startsAt: z.string().min(1),
    durationMinutes: z.number().nullish(),
    timezone: z.string().nullish(),
    locationType: z.string().nullish(),
    locationValue: z.string().nullish(),
    eventType: z.string().nullish(),
    reminderRules: z.array(reglaSchema).nullish(),
    notifyOnCreate: z.boolean().nullish(),
    recurrenceFrequency: z.string().nullish(),
    createdById: z.string().nullish(),
    audienceType: z.string().nullish(),
    targetRoles: z.array(z.string()).nullish(),
  })
  .passthrough();

const ocurrenciaSchema = z
  .object({
    event: eventoSchema,
    occurrenceStart: z.string().nullish(),
    startsAt: z.string().nullish(),
    durationMinutes: z.number().nullish(),
    title: z.string().nullish(),
    viewerRsvpStatus: z.string().nullish(),
  })
  .passthrough();

type EventoCrudo = z.infer<typeof eventoSchema>;

const UBICACIONES: readonly TipoUbicacion[] = ['INTERNAL_CALL', 'WEBINAR', 'ZOOM', 'MEET', 'ADDRESS', 'LINK'];

function aUbicacion(valor: string | null | undefined): TipoUbicacion {
  return UBICACIONES.includes(valor as TipoUbicacion) ? (valor as TipoUbicacion) : 'OTRO';
}

function aAsistencia(valor: string | null | undefined): Asistencia {
  return valor === 'GOING' || valor === 'NOT_GOING' || valor === 'MAYBE' ? valor : null;
}

/** `HH:mm` o `HH:mm:ss` → `HH:mm`. `null` si no se entiende. */
function aHora(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const partes = /^(\d{1,2}):(\d{2})/.exec(valor);
  if (!partes) return null;
  const h = Number(partes[1]);
  const m = Number(partes[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${partes[2]}`;
}

function aEntero(valor: unknown): number | null {
  const n = typeof valor === 'number' ? valor : typeof valor === 'string' ? Number(valor) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Una regla que esta versión no entiende se descarta: mejor un aviso menos que uno a deshora. */
function aRegla(crudo: z.infer<typeof reglaSchema>): ReglaDeAviso | null {
  if (crudo.kind === 'minutesBefore') {
    const minutos = aEntero(crudo.value);
    return minutos === null ? null : { tipo: 'minutosAntes', minutos };
  }
  if (crudo.kind === 'daysBefore') {
    const dias = aEntero(crudo.value);
    return dias === null ? null : { tipo: 'diasAntes', dias };
  }
  if (crudo.kind === 'timeOfDay') {
    const hora = aHora(crudo.value);
    return hora === null ? null : { tipo: 'horaDelDia', hora };
  }
  return null;
}

export function aEvento(crudo: EventoCrudo): Evento {
  return {
    id: crudo.id,
    titulo: crudo.title.trim() || 'Evento',
    descripcion: crudo.description?.trim() || null,
    // Solo una URL de verdad: el almacenamiento sin configurar firma `about:blank#…` (ver
    // `almacenamientoSinConfigurar` en el Muro), y eso no es una imagen.
    portadaUrl: crudo.coverUrl && /^https?:\/\//.test(crudo.coverUrl) ? crudo.coverUrl : null,
    iniciaEn: crudo.startsAt,
    duracionMinutos: crudo.durationMinutes ?? null,
    zona: crudo.timezone || null,
    tipoUbicacion: aUbicacion(crudo.locationType),
    valorUbicacion: crudo.locationValue?.trim() || null,
    tipoEvento: crudo.eventType ?? null,
    reglasDeAviso: crudo.reminderRules
      ? crudo.reminderRules.map(aRegla).filter((r): r is ReglaDeAviso => r !== null)
      : null,
    notificarAlCrear: crudo.notifyOnCreate === true,
    recurrente: !!crudo.recurrenceFrequency,
    creadoPor: crudo.createdById ?? null,
    audiencia: crudo.audienceType ?? null,
    rolesDestino: crudo.targetRoles ?? [],
  };
}

/** Un evento suelto (`GET /events/{id}`). Lanza si no trae ni lo imprescindible. */
export function leerEvento(datos: unknown): Evento {
  const r = eventoSchema.safeParse(datos);
  if (!r.success) throw new Error('Respuesta inesperada de GET /api/v1/calendar/events/{id}');
  return aEvento(r.data);
}

/**
 * La lista de ocurrencias (`GET /events?from&to`). No lanza por un elemento roto: lo descarta.
 * Si la respuesta ni siquiera es una lista, sí lanza — eso ya no es un evento raro, es otro contrato.
 */
export function leerOcurrencias(datos: unknown): Ocurrencia[] {
  if (!Array.isArray(datos)) throw new Error('Respuesta inesperada de GET /api/v1/calendar/events');
  const ocurrencias: Ocurrencia[] = [];
  for (const item of datos) {
    const r = ocurrenciaSchema.safeParse(item);
    if (!r.success) continue;
    const evento = aEvento(r.data.event);
    const iniciaEn = r.data.startsAt || evento.iniciaEn;
    ocurrencias.push({
      evento,
      inicioOcurrencia: r.data.occurrenceStart || iniciaEn,
      iniciaEn,
      duracionMinutos: r.data.durationMinutes ?? evento.duracionMinutos,
      titulo: r.data.title?.trim() || evento.titulo,
      asistencia: aAsistencia(r.data.viewerRsvpStatus),
    });
  }
  return ocurrencias.sort((a, b) => Date.parse(a.iniciaEn) - Date.parse(b.iniciaEn));
}

const urlDePortadaSchema = z.object({ url: z.string().min(1), ruta: z.string().min(1) }).passthrough();

export interface UrlDePortada {
  /** URL prefirmada para el `PUT` de los bytes. */
  url: string;
  /** La clave del objeto: es lo que se confirma. */
  ruta: string;
}

/** `POST /events/{id}/portada/upload-url` → `{ url, bucket, ruta }`. */
export function leerUrlDePortada(datos: unknown): UrlDePortada {
  const r = urlDePortadaSchema.safeParse(datos);
  if (!r.success) throw new Error('Respuesta inesperada de POST /api/v1/calendar/events/{id}/portada/upload-url');
  return { url: r.data.url, ruta: r.data.ruta };
}
