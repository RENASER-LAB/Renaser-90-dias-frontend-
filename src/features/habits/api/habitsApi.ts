import { apiFetch } from '../../../services/http/apiClient';
import type {
  AltaHabitoPersonal,
  DiaDeLaSemanaApi,
  HabitoCatalogoApi,
  PlanDesbloqueosApi,
  PreferenciaHabitoApi,
  TrackDelDiaApi,
} from '../types/habits.types';
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

/**
 * `POST /api/v1/habits` — da de alta un hábito PROPIO del aprendiz (ámbito PERSONAL).
 *
 * > **Agregado 2026-09-06 (E-137).** El endpoint existe en el backend desde el 2026-09-02, pero
 * > la app nunca lo llamaba: "➕ Crear Hábito" armaba un objeto en memoria con un id inventado
 * > (`habit_<timestamp>`), lo metía en el estado de React y anunciaba "¡Hábito Creado! 🦅". El
 * > hábito no existía en ninguna parte: desaparecía al recargar, y cualquier toque sobre él
 * > mandaba ese id al servidor, que respondía `400 "El valor de 'habitId' no tiene el formato
 * > esperado"` (visto en los logs de producción el 2026-09-06 a las 12:55 UTC).
 *
 * `participantId` y `scope` NO viajan a propósito: el backend fuerza PERSONAL y el actor
 * autenticado (blindaje de mass-assignment). `triggerTime` es obligatorio — sin él el hábito no
 * genera nada que hacer; `limitTime` es opcional (un hábito propio no vence dentro del día).
 */
export async function crearHabitoPersonal(alta: AltaHabitoPersonal): Promise<HabitoCatalogoApi> {
  const r = await apiFetch<unknown>('/api/v1/habits', { method: 'POST', body: alta });
  return validarRespuesta(habitsSchemas.habitoCreado, r, 'POST /api/v1/habits');
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

/**
 * PATCH /api/v1/habit-preferences/{habitId} — cambia la hora de disparo/límite de un hábito.
 *
 * Bug encontrado 2026-09-03: el backend espera SIEMPRE los 4 campos del PATCH (`triggerTime`,
 * `limitTime`, `reminderEnabled`, `reminderMinutesBefore`) — `reminderEnabled` es un `boolean`
 * primitivo del lado del backend, así que si no viaja en el JSON, Jackson no puede construir el
 * DTO y el PATCH entero falla con 400 (`"El cuerpo de la solicitud es invalido o esta mal
 * formado"`), para CUALQUIER hábito. Por eso los cuatro viajan siempre.
 *
 * > **Corregido 2026-09-07.** Acá decía que mandar "sin recordatorio" clavado no apagaba nada real
 * > porque ninguna pantalla los prendía. Eso valió hasta que la pantalla existió: desde entonces,
 * > cambiar la hora de un hábito le borraba la alarma en silencio. El recordatorio actual ahora
 * > entra por parámetro y el GET lo devuelve, así que se preserva.
 */
export type CambioHorarioResultado = {
  deferred: boolean;
  deferredEffectiveDate?: string | null;
};

/**
 * Devuelve el resultado en vez de descartarlo: el backend responde `deferred: true` cuando la
 * ventana del hábito ya arrancó hoy y el cambio rige recién mañana. Sin ese dato la pantalla
 * mostraba la hora nueva como si aplicara hoy — o sea, mentía.
 */
export async function cambiarHorario(
  habitId: string,
  triggerTime: string | null,
  limitTime: string | null,
  /**
   * El recordatorio que el hábito YA tenía. Es obligatorio y no opcional a propósito: el PATCH
   * reemplaza los cuatro campos a la vez, así que omitirlo no es "no tocarlo", es APAGARLO.
   *
   * > Hasta 2026-09-07 acá viajaba `{ reminderEnabled: false, reminderMinutesBefore: null }`
   * > clavado, con el argumento de que ninguna pantalla prendía recordatorios y por lo tanto no
   * > apagaba nada real. Dejó de ser cierto el día que la pantalla de recordatorios existió: sin
   * > este parámetro, cambiar la hora de un hábito le borraba la alarma en silencio. El GET ahora
   * > devuelve los dos campos, así que preservarlos ya es posible.
   */
  recordatorio: { activo: boolean; minutosAntes: number | null },
): Promise<CambioHorarioResultado> {
  const r = await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}`, {
    method: 'PATCH',
    body: {
      triggerTime,
      limitTime,
      reminderEnabled: recordatorio.activo,
      reminderMinutesBefore: recordatorio.minutosAntes,
    },
  });
  return validarRespuesta(habitsSchemas.cambioHorario, r, 'PATCH /api/v1/habit-preferences/{id}');
}

/**
 * `GET /api/v1/habit-preferences/{habitId}/weekdays` — los SIETE días con su hora (V39).
 *
 * Es la respuesta a "los lunes a las 5 y los martes a las 4". Antes de esto la hora era una sola
 * para toda la semana: editar el jueves cambiaba los siete días.
 */
export async function obtenerHorarioSemanal(habitId: string): Promise<DiaDeLaSemanaApi[]> {
  const r = await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/weekdays`);
  return validarRespuesta(habitsSchemas.horarioSemanal, r, 'GET /api/v1/habit-preferences/{id}/weekdays')
    .weekdays;
}

/**
 * `PUT .../weekdays/{weekday}` — fija la hora de UN día, todas las semanas.
 *
 * `weekday` es el nombre de `DayOfWeek` (`MONDAY`..`SUNDAY`); `NOMBRE_ISO_DEL_DIA` lo traduce
 * desde el día que dibuja la pantalla.
 */
export async function fijarHorarioDelDia(
  habitId: string,
  weekday: string,
  triggerTime: string,
  limitTime: string | null,
): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/weekdays/${weekday}`, {
    method: 'PUT',
    body: { triggerTime, limitTime },
  });
}

/** `DELETE .../weekdays/{weekday}` — ese día vuelve al horario general. Idempotente. */
export async function quitarHorarioDelDia(habitId: string, weekday: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/weekdays/${weekday}`, { method: 'DELETE' });
}

/**
 * `GET /api/v1/habit-unlocks` — el plan de ESTE aprendiz, con el estado de pausa de cada hábito.
 *
 * > **Agregado 2026-09-06 (E-145).** El backend expone `paused`/`pausedUntil` desde V31, pero la
 * > app nunca los leía: hacía el PATCH que pausa y después reconstruía el interruptor únicamente
 * > con `activeWeekdays` del catálogo compartido, que no sabe nada de la pausa personal. El efecto
 * > era que pausar "funcionaba" hasta recargar la pantalla, y ahí el hábito volvía a verse
 * > encendido. Se escribía y no se leía de vuelta.
 */
export async function obtenerPlanDesbloqueos(): Promise<PlanDesbloqueosApi> {
  const r = await apiFetch<unknown>('/api/v1/habit-unlocks');
  return validarRespuesta(habitsSchemas.planDesbloqueos, r, 'GET /api/v1/habit-unlocks');
}

/**
 * `PATCH /api/v1/habit-unlocks/{habitId}` — el interruptor ACTIVO/PAUSADO del aprendiz (D-87).
 *
 * Es el endpoint que ese botón nunca tuvo: hasta ahora el cambio vivía solo en el estado de
 * React y se perdía al cerrar la app. NO es el mismo que `PATCH /api/v1/admin/habits/{id}` del
 * panel admin — ese escribe `habitos.activo`, que es del catálogo COMPARTIDO y afecta a todos
 * los aprendices a la vez. Este solo afecta a quien lo llama.
 */
export async function cambiarEstadoHabito(
  habitId: string,
  active: boolean,
  /**
   * Último día (INCLUSIVE) en que sigue pausado, `yyyy-MM-dd` — "pausalo hasta el domingo" (V31).
   * Omitirlo pausa de forma indefinida, que es como se comportaba antes. Se ignora del lado del
   * servidor cuando `active` es `true`: reactivar limpia la pausa entera.
   */
  pausedUntil?: string
): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-unlocks/${habitId}`, {
    method: 'PATCH',
    body: pausedUntil ? { active, pausedUntil } : { active },
  });
}

/** `PUT /api/v1/habit-unlocks/{habitId}` — agrega el hábito al plan del aprendiz. Idempotente. */
export async function agregarHabitoAlPlan(habitId: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-unlocks/${habitId}`, { method: 'PUT' });
}

/** `DELETE /api/v1/habit-unlocks/{habitId}` — lo saca del plan. Idempotente (D-87). */
export async function quitarHabitoDelPlan(habitId: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-unlocks/${habitId}`, { method: 'DELETE' });
}
