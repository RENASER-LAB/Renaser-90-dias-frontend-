import { apiFetch } from '../../../services/http/apiClient';
import type { HabitoCatalogoApi, PreferenciaHabitoApi, TrackDelDiaApi } from '../types/habits.types';
import { habitsSchemas, validarRespuesta } from './habitsSchemas';

/**
 * Endpoints de hábitos del backend Java. Acá vive solo el "cómo se llama": qué hacer con la
 * respuesta es de `hooks/` y `api/habitsMappers.ts`, mismo criterio que `features/academy`.
 */

/** GET /api/v1/habits — catálogo del aprendiz (sin horarios). */
export async function obtenerCatalogo(): Promise<HabitoCatalogoApi[]> {
  const r = await apiFetch<unknown>('/api/v1/habits');
  return validarRespuesta(habitsSchemas.catalogo, r, 'GET /api/v1/habits');
}

/** GET /api/v1/habit-preferences — horario de cada hábito, propio si el aprendiz lo cambió. */
export async function obtenerPreferencias(): Promise<PreferenciaHabitoApi[]> {
  const r = await apiFetch<unknown>('/api/v1/habit-preferences');
  return validarRespuesta(habitsSchemas.preferencias, r, 'GET /api/v1/habit-preferences').habits;
}

/**
 * GET /api/v1/habit-tracks/today — lo que toca hoy, con su estado.
 *
 * El backend genera los tracks del día si todavía no existen, descartando los hábitos cuya ventana
 * ya se cerró a esta hora (alguien que activa su programa a las 11 no recibe la ducha fría que
 * cerraba a las 08:00). Por eso esta llamada puede escribir en el servidor aunque sea un GET.
 */
export async function obtenerTracksDeHoy(): Promise<TrackDelDiaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/habit-tracks/today');
  return validarRespuesta(habitsSchemas.tracksDeHoy, r, 'GET /api/v1/habit-tracks/today');
}

/** PATCH /api/v1/habit-preferences/{habitId} — cambia la hora de disparo/límite de un hábito. */
export async function cambiarHorario(
  habitId: string,
  triggerTime: string | null,
  limitTime: string | null,
): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}`, {
    method: 'PATCH',
    body: { triggerTime, limitTime },
  });
}
