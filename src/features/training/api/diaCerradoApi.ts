import { apiFetch } from '../../../services/http/apiClient';
import { habitsSchemas } from '../../habits/api/habitsSchemas';
import type { TrackDelDiaApi } from '../../habits/types/habits.types';

/**
 * `GET /api/v1/habit-tracks/day?date=YYYY-MM-DD` (spec 014): lo que registró la persona en un día YA CERRADO de la
 * semana en curso, con la misma forma que `GET /habit-tracks/today`.
 *
 * Es de solo lectura y el servidor lo acota a propósito: de ayer hacia atrás, hasta el lunes y no antes del Día 1;
 * cualquier otra fecha da 400. Por eso la app lo pide SOLO cuando la persona toca un día anterior y una sola vez
 * por fecha (`lecturaDeDiasCerrados`): un día cerrado no cambia.
 *
 * Esquema tolerante: devuelve `null` —«no hay datos»— si la respuesta no es una lista de registros, si no calza con
 * el esquema de `/today` o si algún registro es de otra fecha. Con `null`, la pantalla muestra lo planificado sin
 * inventar ✓ ni candados. Acepta también `{ tracks: [...] }`, como el snapshot de hoy.
 */
export async function obtenerDiaCerrado(fecha: string): Promise<TrackDelDiaApi[] | null> {
  const r = await apiFetch<unknown>(`/api/v1/habit-tracks/day?date=${encodeURIComponent(fecha)}`, { timeoutMs: 15_000 });
  return leerDiaCerrado(r, fecha);
}

/** La lectura tolerante de la respuesta, aparte para probarla sin red. */
export function leerDiaCerrado(respuesta: unknown, fecha: string): TrackDelDiaApi[] | null {
  const lista = Array.isArray(respuesta)
    ? respuesta
    : respuesta != null && typeof respuesta === 'object' && Array.isArray((respuesta as { tracks?: unknown }).tracks)
      ? (respuesta as { tracks: unknown[] }).tracks
      : null;
  if (!lista) return null;
  const valido = habitsSchemas.tracksDeHoy.safeParse(lista);
  if (!valido.success) return null;
  if (valido.data.some(t => t.fechaEjecucion !== fecha)) return null;
  return valido.data as TrackDelDiaApi[];
}
