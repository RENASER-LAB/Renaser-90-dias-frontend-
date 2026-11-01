import type { CambioDeFechaApi, PreferenciaHabitoApi, SemanaDelHabitoApi } from '../../habits/types/habits.types';
import { combinacionALaApi, type CombinacionDeAlarma } from '../../habits/notificaciones/utils/combinacionDeAlarma';
import { DIAS_DEL_PLAN, NOMBRE_ISO_DEL_DIA, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import {
  diasDelEditor,
  diasEnFrase,
  textoDelBoton,
  type DiaDelEditor,
  type QueGuardarConAlarma,
} from './avisoDeLosDias';

/**
 * El alcance de un cambio en el editor de «Planificar» (spec 028, decisión del dueño 028-1 A): «Todas las semanas» (el de siempre y el
 * valor por defecto) o «Solo esta semana» (los días que faltan de la semana que el editor dibuja, sin tocar el plan de siempre). Puro:
 * decide qué mostrar y qué mandar sin tocar la pantalla ni el servidor.
 *
 * Reutiliza lo que ya hay: los datos de la semana se mapean al mismo `DiaDelEditor` con el que funcionan las pastillas, el aviso y «Cómo
 * suena», y «solo lo que se tocó» es la misma regla de `queGuardarConAlarma`.
 */

export type AlcanceDelCambio = 'siempre' | 'semana';

export const OPCIONES_DE_ALCANCE: readonly { valor: AlcanceDelCambio; etiqueta: string; accessibilityLabel: string }[] = [
  { valor: 'siempre', etiqueta: 'Todas las semanas', accessibilityLabel: 'El cambio vale para todas las semanas' },
  { valor: 'semana', etiqueta: 'Solo esta semana', accessibilityLabel: 'El cambio vale solo para esta semana' },
];

/**
 * ¿El servidor sabe de «Solo esta semana»? El servidor nuevo manda siempre `dateOverrides` en la lista (vacía si no hay ninguna fecha
 * propia); uno anterior no lo manda. Sin él la hoja es la de siempre (FR-021).
 */
export function elServidorSabeDeLaSemana(preferencia: PreferenciaHabitoApi | undefined): boolean {
  return preferencia?.dateOverrides !== undefined;
}

/** Los siete días de la semana leída, con la forma del editor. Los de una fecha con cambio propio llevan `propioDeLaFecha`. */
export function diasDelEditorDeLaSemana(
  semana: SemanaDelHabitoApi,
  avisoGeneral: readonly number[],
): Record<DiaDelPlan, DiaDelEditor> {
  const comoDiasDeLaSemana = semana.days.map(d => ({
    ...d,
    // `diasDelEditor` lee la hora propia de `custom`; en la lista de fechas se llama `customTime`.
    custom: d.customTime ?? d.custom ?? false,
    triggerTime: d.triggerTime ?? null,
    limitTime: d.limitTime ?? null,
  }));
  const base = diasDelEditor(comoDiasDeLaSemana, avisoGeneral);
  const propiaDeLaFecha = new Map(semana.days.map(d => [d.weekday, d.customDate === true]));
  const resultado = {} as Record<DiaDelPlan, DiaDelEditor>;
  for (const dia of DIAS_DEL_PLAN) {
    resultado[dia] = { ...base[dia], propioDeLaFecha: propiaDeLaFecha.get(NOMBRE_ISO_DEL_DIA[dia]) === true };
  }
  return resultado;
}

/**
 * Un día cuyo plan de siempre lo deja apagado (`activo = false` sin cambio propio de la fecha) no se puede cambiar solo esta semana: el
 * servidor rechaza encenderlo y escribirle una hora no cambiaría nada. Se trata como un día en que el hábito no corre.
 */
export function apagadoPorElPlanDeSiempre(dia: DiaDelEditor | undefined): boolean {
  return dia !== undefined && dia.activo === false && dia.propioDeLaFecha !== true;
}

/**
 * Los días que se pueden marcar en «Solo esta semana»: el hábito corre ese día, la fecha todavía no pasó (ni es hoy) y el plan de siempre no
 * lo apaga. En el orden de la semana.
 */
export function diasQueSePuedenMarcar(
  corre: Readonly<Record<DiaDelPlan, boolean>>,
  planificable: (dia: DiaDelPlan) => boolean,
  horarios: Readonly<Record<string, DiaDelEditor>>,
): DiaDelPlan[] {
  return DIAS_DEL_PLAN.filter(d => corre[d] && planificable(d) && !apagadoPorElPlanDeSiempre(horarios[d]));
}

/** Los días con cambio «solo esta semana» (fecha propia) entre los que se pueden marcar. */
export function diasConCambioSoloEstaSemana(
  marcables: readonly DiaDelPlan[],
  horarios: Readonly<Record<string, DiaDelEditor>>,
): DiaDelPlan[] {
  return marcables.filter(d => horarios[d]?.propioDeLaFecha === true);
}

/**
 * Marcar o desmarcar un día en «Solo esta semana»: nunca queda vacío (en este alcance «sin días marcados» no significa «general») y
 * siempre en el orden de la semana. Un día que no se puede marcar no hace nada.
 */
export function alternarDiaDeLaSemana(
  marcados: readonly DiaDelPlan[],
  dia: DiaDelPlan,
  marcables: readonly DiaDelPlan[],
): DiaDelPlan[] {
  if (!marcables.includes(dia)) return [...marcados];
  if (marcados.includes(dia)) {
    return marcados.length === 1 ? [...marcados] : marcados.filter(d => d !== dia);
  }
  return DIAS_DEL_PLAN.filter(d => d === dia || marcados.includes(d));
}

/** El rótulo de los días en «Solo esta semana»: «Toda esta semana» con todos los que faltan, o «Solo sáb, dom». */
export function rotuloDeLosDiasDeLaSemana(marcados: readonly DiaDelPlan[], marcables: readonly DiaDelPlan[]): string {
  return marcados.length === marcables.length ? 'Toda esta semana' : `Solo ${diasEnFrase(marcados)}`;
}

/** «Cambiado solo esta semana: sáb, dom», o `null` si ningún día tiene cambio propio. */
export function lineaDeLosCambiosDeLaSemana(conCambio: readonly DiaDelPlan[]): string | null {
  return conCambio.length === 0 ? null : `Cambiado solo esta semana: ${diasEnFrase(conCambio)}`;
}

/** La ayuda bajo la fila de días en «Solo esta semana». */
export function ayudaDeLaSemana(marcados: readonly DiaDelPlan[], marcables: readonly DiaDelPlan[]): string {
  const cuales = marcados.length === marcables.length ? 'los días que faltan' : diasEnFrase(marcados);
  return `Solo esta semana: ${cuales}. Tu plan de siempre no cambia. Hoy y lo pasado van con candado.`;
}

/**
 * El botón de guardar en «Solo esta semana»: «Guardar 07:00 · solo esta semana» con todos los días que faltan y «Guardar aviso · sáb, dom ·
 * solo esta semana» con algunos. Es el texto de siempre (`textoDelBoton`) con el alcance dicho al final.
 */
export function textoDelBotonDeLaSemana({
  guardando,
  marcados,
  marcables,
  que,
  hora,
  alarma,
}: {
  guardando: boolean;
  marcados: readonly DiaDelPlan[];
  marcables: readonly DiaDelPlan[];
  que: QueGuardarConAlarma;
  hora: string;
  alarma: boolean;
}): string {
  if (guardando) return 'Guardando…';
  const todos = marcados.length === marcables.length;
  // `textoDelBoton` termina en « · sáb, dom» con días marcados; con todos los que faltan ese cierre sobra.
  const base = textoDelBoton({ guardando, dias: [...marcados], que, hora, alarma });
  const cierreDeLosDias = ` · ${diasEnFrase(marcados)}`;
  const sinDias = todos && base.endsWith(cierreDeLosDias) ? base.slice(0, base.length - cierreDeLosDias.length) : base;
  return `${sinDias} · solo esta semana`;
}

/** Lo que se tocó en el editor, para armar el pedido de «Solo esta semana». */
export interface TocadoParaLaSemana {
  /** Los días marcados, en el orden de la semana. */
  dias: readonly DiaDelPlan[];
  /** La fecha (`YYYY-MM-DD`) de cada día de la semana que se está editando. */
  fechas: Readonly<Record<DiaDelPlan, string>>;
  /** Qué se guarda de hora y aviso (`queGuardarConAlarma`). `'ninguno'` = solo «Cómo suena». */
  que: QueGuardarConAlarma;
  /** `HH:mm` de la rueda. */
  hora: string;
  /** La hora límite que ya tenía el hábito (`HH:mm:ss`) o `null`. */
  limite: string | null;
  /** El aviso elegido para estos días (solo si `que` guarda aviso). */
  aviso: readonly number[];
  /** Cómo suena cada día marcado, ya resuelto con lo tocado; `null` si «Cómo suena» no se tocó. */
  alarmaPorDia: Readonly<Partial<Record<DiaDelPlan, CombinacionDeAlarma>>> | null;
}

/**
 * El cuerpo de `PUT …/week` con SOLO lo tocado de los días marcados: la hora si se movió la rueda, el aviso si se tocó, «Cómo suena» si se
 * tocó. Un campo que no se tocó no viaja y el servidor conserva el que ya hubiera.
 */
export function cambiosDeLaSemana(tocado: TocadoParaLaSemana): CambioDeFechaApi[] {
  const guardaHora = tocado.que === 'hora' || tocado.que === 'ambos';
  const guardaAviso = tocado.que === 'aviso' || tocado.que === 'ambos';
  return tocado.dias.map(dia => {
    const cambio: CambioDeFechaApi = { date: tocado.fechas[dia] };
    if (guardaHora) {
      cambio.triggerTime = `${tocado.hora}:00`;
      cambio.limitTime = tocado.limite;
    }
    if (guardaAviso) {
      cambio.reminderEnabled = tocado.aviso.length > 0;
      cambio.reminderMinutesList = [...tocado.aviso];
    }
    const alarma = tocado.alarmaPorDia?.[dia];
    if (alarma) cambio.alarm = combinacionALaApi(alarma);
    return cambio;
  });
}

/** El cuerpo para apagar esos días solo esta semana. */
export function cambiosParaApagar(dias: readonly DiaDelPlan[], fechas: Readonly<Record<DiaDelPlan, string>>): CambioDeFechaApi[] {
  return dias.map(dia => ({ date: fechas[dia], active: false }));
}

/** El cuerpo para devolver esos días al plan de siempre (o volver a encender uno apagado solo esta semana). */
export function cambiosParaVolverAlPlanDeSiempre(
  dias: readonly DiaDelPlan[],
  fechas: Readonly<Record<DiaDelPlan, string>>,
): CambioDeFechaApi[] {
  return dias.map(dia => ({ date: fechas[dia], reset: true }));
}

/** ¿Hay algo que guardar? Sin tocar la rueda, el aviso ni «Cómo suena» no hay cambio que mandar (en este alcance no hay «lo de siempre»). */
export function hayAlgoQueGuardarEnLaSemana({
  movioLaRueda,
  cambioElAviso,
  cambioLaAlarma,
}: {
  movioLaRueda: boolean;
  cambioElAviso: boolean;
  cambioLaAlarma: boolean;
}): boolean {
  return movioLaRueda || cambioElAviso || cambioLaAlarma;
}

/** Lo que se dice al guardar, en una línea. */
export function confirmacionDeLaSemana({
  que,
  hora,
  aviso,
  dias,
  alarma,
}: {
  que: QueGuardarConAlarma;
  hora: string;
  aviso: readonly number[] | null;
  dias: readonly DiaDelPlan[];
  alarma: boolean;
}): string {
  const cuales = diasEnFrase(dias);
  const partes: string[] = [];
  if (que === 'hora' || que === 'ambos') partes.push(`a las ${hora}`);
  if ((que === 'aviso' || que === 'ambos') && aviso) partes.push(aviso.length > 0 ? 'con aviso nuevo' : 'sin aviso');
  if (alarma) partes.push('con su alarma nueva');
  const queda = partes.length > 0 ? partes.join(', ') : 'como lo pediste';
  return `Queda ${queda} los ${cuales}, solo esta semana. Tu plan de siempre no cambia.`;
}
