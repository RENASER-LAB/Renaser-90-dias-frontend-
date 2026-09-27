import type { CambioHorarioResultado } from '../../habits/api/habitsApi';
import type { PreferenciaHabitoApi } from '../../habits/types/habits.types';
import { formatearFechaLarga } from '../../programa/hooks/useArranqueDelPrograma';

/**
 * Las horas que muestra el editor de UN hábito en «PLANIFICAR» (Training).
 *
 * > **PLN-02 (e2e web del 2026-09-27).** Tras guardar 09:30 para Jugo verde (rige desde mañana,
 * > D-91), al volver a abrirlo decía «Ahora: 09:00» y la rueda arrancaba en 09:00, sin decir que
 * > desde mañana va 09:30. Y como lo que se guarda rige de mañana en adelante, guardar desde ahí
 * > (por ejemplo, para cambiar solo el aviso) devolvía el hábito a 09:00 sin que nadie lo notara.
 */
export interface HoraDelEditor {
  /** La hora que rige HOY: lo que dice «Ahora: …». Vacía = todavía sin hora. */
  ahora: string;
  /** El cambio ya guardado que todavía no rige (`pendingChange` del servidor), o `null`. */
  programado: { hora: string; desde: string } | null;
  /**
   * Dónde arranca la rueda: la hora que va a regir de mañana en adelante. Es la que se guarda si se
   * toca «GUARDAR» sin mover la rueda, así que no puede ser la de hoy cuando hay un cambio pendiente.
   */
  arranqueDeLaRueda: string;
}

/** `horaDeLaTarjeta` es la de la lista de Training (`HabitItem.time`), para un hábito sin preferencia. */
export function horaDelEditor(preferencia: PreferenciaHabitoApi | undefined, horaDeLaTarjeta: string): HoraDelEditor {
  const ahora = preferencia?.triggerTime?.slice(0, 5) ?? horaDeLaTarjeta;
  const pendiente = preferencia?.pendingChange;
  const programado = pendiente?.triggerTime
    ? { hora: pendiente.triggerTime.slice(0, 5), desde: pendiente.effectiveDate }
    : null;
  return { ahora, programado, arranqueDeLaRueda: programado?.hora ?? ahora };
}

/**
 * «Desde el lunes 28 de septiembre: 09:30» — la misma frase que la tarjeta del hábito en Plan
 * (`textoCambioProgramado` de `PlanScreen`). Sin fecha del servidor, «Desde mañana».
 */
export function textoDelCambioProgramado(programado: { hora: string; desde: string }): string {
  return programado.desde
    ? `Desde el ${formatearFechaLarga(programado.desde)}: ${programado.hora}`
    : `Desde mañana: ${programado.hora}`;
}

/**
 * Cómo queda la preferencia en la hoja después de guardar la hora GENERAL, sin volver a pedirla.
 *
 * Si el servidor difirió el cambio (`deferred`, que desde D-91 es siempre), la hora de hoy NO
 * cambia y el cambio queda como pendiente, igual que lo devolverá `GET /habit-preferences`. Si rigió
 * en el acto, cambia la hora y no queda nada pendiente (el backend borra el que hubiera).
 *
 * Antes la hoja escribía la hora nueva como si ya rigiera hoy: al reabrir decía «Ahora: 09:30» el
 * mismo día en que el hábito todavía iba a las 09:00.
 */
export function preferenciaTrasGuardar(
  previa: PreferenciaHabitoApi | undefined,
  cambio: {
    habitoId: string;
    titulo: string;
    horaDeLaTarjeta: string;
    /** `HH:mm`. */
    horaNueva: string;
    recordatorio: { activo: boolean; minutosAntes: number | null };
    resultado: CambioHorarioResultado;
  },
): PreferenciaHabitoApi {
  const base: PreferenciaHabitoApi = previa ?? {
    habitId: cambio.habitoId,
    title: cambio.titulo,
    triggerTime: cambio.horaDeLaTarjeta ? `${cambio.horaDeLaTarjeta}:00` : null,
    limitTime: null,
    customized: false,
    pendingChange: null,
  };
  const conAviso: PreferenciaHabitoApi = {
    ...base,
    customized: true,
    reminderEnabled: cambio.recordatorio.activo,
    reminderMinutesBefore: cambio.recordatorio.minutosAntes,
  };
  if (cambio.resultado.deferred) {
    return {
      ...conAviso,
      pendingChange: {
        triggerTime: `${cambio.horaNueva}:00`,
        limitTime: base.limitTime,
        effectiveDate: cambio.resultado.deferredEffectiveDate ?? '',
      },
    };
  }
  return { ...conAviso, triggerTime: `${cambio.horaNueva}:00`, pendingChange: null };
}
