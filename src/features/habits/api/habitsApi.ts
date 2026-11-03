import { apiFetch } from '../../../services/http/apiClient';
import type {
  AltaHabitoPersonal,
  CambioDeFechaApi,
  DiaDeLaSemanaApi,
  HabitoCatalogoApi,
  OfertaDeRepetirApi,
  PlanDesbloqueosApi,
  PreferenciaHabitoApi,
  ResultadoDeRepetirApi,
  SemanaDelHabitoApi,
  TrackDelDiaApi,
} from '../types/habits.types';
import { habitsSchemas, validarRespuesta } from './habitsSchemas';
import { combinacionALaApi, type CombinacionDeAlarma } from '../notificaciones/utils/combinacionDeAlarma';

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
 *
 * Pedidos simultáneos comparten UNA sola llamada (E-230, 2026-09-24): Hoy pide esto para el hábito del
 * momento y el orbe para sesgar el micrófono, al mismo tiempo. Dos GET en el mismo milisegundo hacían
 * que el backend intentara crear dos veces el mismo track y uno respondía 409. El backend ya lo
 * tolera; esto además ahorra el pedido repetido. Solo se comparte mientras está en vuelo: el
 * siguiente pedido, ya terminado este, vuelve a ir al servidor.
 */
let tracksDeHoyEnVuelo: Promise<TrackDelDiaApi[]> | null = null;

export function obtenerTracksDeHoy(): Promise<TrackDelDiaApi[]> {
  if (!tracksDeHoyEnVuelo) {
    tracksDeHoyEnVuelo = pedirTracksDeHoy().finally(() => {
      tracksDeHoyEnVuelo = null;
    });
  }
  return tracksDeHoyEnVuelo;
}

async function pedirTracksDeHoy(): Promise<TrackDelDiaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/habit-tracks/today', { timeoutMs: 15_000 });
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
  recordatorio: {
    activo: boolean;
    minutosAntes: number | null;
    /**
     * Todos los avisos elegidos (V81, D-217). Solo lo manda quien los conoce (la hoja de Training): sin
     * él, el servidor conserva el conjunto si `minutosAntes` es su más temprano.
     */
    lista?: number[] | null;
  },
): Promise<CambioHorarioResultado> {
  const r = await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}`, {
    method: 'PATCH',
    body: {
      triggerTime,
      limitTime,
      reminderEnabled: recordatorio.activo,
      reminderMinutesBefore: recordatorio.minutosAntes,
      ...(recordatorio.lista === undefined ? {} : { reminderMinutesList: recordatorio.lista }),
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

/**
 * `PUT .../weekdays/{weekday}/reminder` — fija el AVISO de UN día de la semana, todas las semanas (spec 008, D-282).
 *
 * Es aparte de la hora a propósito (FR-013): un APK anterior que guarda la hora de un día no puede borrar el
 * aviso, y quien solo cambia el aviso no toca la hora de ningún día. **No consume el cupo semanal** de
 * cambios de horario: no reacomoda nada, igual que apagar un día.
 *
 * - `activo: false`: ese día va sin aviso (la lista se ignora y puede ir vacía).
 * - `activo: true`: `antelaciones` lleva una o más (minutos antes; `0` = a la hora). Si coincide con el aviso
 *   general, el servidor deja el día heredándolo.
 *
 * Contra un backend anterior responde 404/405: quien lo llama debe haber visto antes `customReminder` en
 * `obtenerHorarioSemanal` y no ofrecer este camino si no vino.
 */
export async function fijarAvisoDelDia(
  habitId: string,
  weekday: string,
  activo: boolean,
  antelaciones: readonly number[],
): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/weekdays/${weekday}/reminder`, {
    method: 'PUT',
    body: { reminderEnabled: activo, reminderMinutesList: activo ? [...antelaciones] : [] },
  });
}

/**
 * `PUT /habit-preferences/{habitId}/alarm` — «Cómo suena» la alarma del hábito, en general (spec 009, D-283).
 *
 * Los cuatro campos viajan SIEMPRE (`sound`, `vibration`, `voice`, `repeat`): al servidor le falta uno y responde
 * 400. También responde 400 si `sound` y `vibration` van en `false`, o si `voice` va en `true` con `sound` en `false`
 * (la pantalla ya lo impide). **No consume el cupo semanal**: no reacomoda ningún horario. 204 sin cuerpo.
 *
 * Contra un backend anterior responde 404/405: quien la llama debe haber visto antes `alarm` en la lectura de
 * preferencias y no ofrecer este camino si no vino.
 */
export async function fijarAlarmaGeneral(habitId: string, alarma: CombinacionDeAlarma): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/alarm`, {
    method: 'PUT',
    body: combinacionALaApi(alarma),
  });
}

/**
 * `PUT .../weekdays/{weekday}/alarm` — «Cómo suena» ESE día de la semana, todas las semanas (spec 009). Es aparte de
 * la hora y del aviso a propósito: son tres escrituras separadas y quien solo cambia una no toca las otras. Sin cupo.
 *
 * Si la combinación es igual a la general ya resuelta, el servidor deja el día heredándola (`customAlarm: false`).
 * Quitar el día con `quitarHorarioDelDia` borra también su combinación.
 */
export async function fijarAlarmaDelDia(habitId: string, weekday: string, alarma: CombinacionDeAlarma): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/weekdays/${weekday}/alarm`, {
    method: 'PUT',
    body: combinacionALaApi(alarma),
  });
}

/**
 * `DELETE .../weekdays/{weekday}/active` — apaga el hábito ESE día de la semana, siempre.
 *
 * Distinto de apagar por fecha (`/days/{date}`), que vale para un día y no se repite. Devuelve 409
 * si el hábito es obligatorio del programa.
 */
export async function apagarDiaDeLaSemana(habitId: string, weekday: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/weekdays/${weekday}/active`, {
    method: 'DELETE',
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

/* ----------------------------------------------------------------------------------------------------------
 * Spec 028 — «Solo esta semana» y repetir la semana. Contrato: `specs/028-planificacion-semana-y-mes/contracts/`
 * (repositorio del backend).
 * -------------------------------------------------------------------------------------------------------- */

/**
 * `GET /api/v1/habit-preferences/{habitId}/week?weekStart=` — los siete días de una semana (lunes a domingo) de UN hábito, con el plan de
 * siempre y lo «solo esta semana» encima, ya resueltos por el servidor. `weekStart` es el lunes (`YYYY-MM-DD`).
 */
export async function obtenerSemanaDelHabito(habitId: string, weekStart: string): Promise<SemanaDelHabitoApi> {
  const r = await apiFetch<unknown>(
    `/api/v1/habit-preferences/${habitId}/week?weekStart=${encodeURIComponent(weekStart)}`,
  );
  return validarRespuesta(habitsSchemas.semanaDelHabito, r, 'GET /api/v1/habit-preferences/{id}/week');
}

/**
 * `PUT /api/v1/habit-preferences/{habitId}/week` — guarda SOLO LO TOCADO de varias fechas de esa semana, todo o nada. Un día con `reset`
 * vuelve al plan de siempre. Solo fechas posteriores a hoy; 409 si se apaga un hábito obligatorio.
 */
export async function guardarSemanaDelHabito(habitId: string, weekStart: string, days: CambioDeFechaApi[]): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/week`, { method: 'PUT', body: { weekStart, days } });
}

/** `DELETE /api/v1/habit-preferences/{habitId}/week?weekStart=` — vuelve al plan de siempre en esa semana (solo fechas posteriores a hoy). */
export async function volverAlPlanDeSiempreDelHabito(habitId: string, weekStart: string): Promise<void> {
  await apiFetch<unknown>(`/api/v1/habit-preferences/${habitId}/week?weekStart=${encodeURIComponent(weekStart)}`, {
    method: 'DELETE',
  });
}

/** `GET /api/v1/habit-preferences/week-repeat` — la oferta de repetir la semana en curso en la siguiente, o `null` (204: no hay oferta). */
export async function obtenerOfertaDeRepetir(): Promise<OfertaDeRepetirApi | null> {
  const r = await apiFetch<unknown>('/api/v1/habit-preferences/week-repeat');
  if (r === null || r === undefined || r === '') return null;
  return validarRespuesta(habitsSchemas.ofertaDeRepetir, r, 'GET /api/v1/habit-preferences/week-repeat');
}

/**
 * `POST /api/v1/habit-preferences/week-repeat` — aplica la repetición. Todo o nada, idempotente. 409 si reemplazaría cambios propios y `replace`
 * es `false`: la pantalla pide confirmación y vuelve a mandar con `true`.
 */
export async function repetirLaSemana(
  sourceWeekStart: string,
  targetWeekStart: string,
  replace: boolean,
): Promise<ResultadoDeRepetirApi> {
  const r = await apiFetch<unknown>('/api/v1/habit-preferences/week-repeat', {
    method: 'POST',
    body: { sourceWeekStart, targetWeekStart, replace },
  });
  return validarRespuesta(habitsSchemas.resultadoDeRepetir, r, 'POST /api/v1/habit-preferences/week-repeat');
}

/** `DELETE /api/v1/habit-preferences/weeks/{weekStart}` — «Deshacer»: TODA esa semana vuelve al plan de siempre. Idempotente. */
export async function deshacerLaSemana(weekStart: string): Promise<number> {
  const r = await apiFetch<unknown>(`/api/v1/habit-preferences/weeks/${encodeURIComponent(weekStart)}`, { method: 'DELETE' });
  return validarRespuesta(habitsSchemas.semanaDeshecha, r, 'DELETE /api/v1/habit-preferences/weeks/{weekStart}').removedDays;
}
