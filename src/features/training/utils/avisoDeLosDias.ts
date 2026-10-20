import { NOMBRE_ISO_DEL_DIA, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import type { DiaDeLaSemanaApi } from '../../habits/types/habits.types';
import type { DiaIso, DiaPropio } from '../../habits/notificaciones/utils/alarmasPorDia';

/**
 * El recordatorio de cada día de la semana en el editor de «Planificar» (spec 008, D-282). Puro: decide qué
 * mostrar y qué guardar sin tocar la pantalla ni el servidor.
 *
 * Un aviso es una lista de antelaciones en minutos, de la mayor a la menor: `[]` es «sin aviso», `[0]` «a la
 * hora», `[30, 10]` dos avisos. Es el mismo vocabulario del recordatorio general.
 *
 * Las reglas salen de las respuestas del dueño (2026-10-20, Clarifications de la spec):
 * - Con varios días marcados que tienen avisos distintos, la sección Recordatorio no elige ninguno y lo dice
 *   («Estos días tienen avisos distintos»); lo que se elija se pone a todos los marcados.
 * - Solo se guarda lo que se tocó: si no se movió la rueda, cada día conserva su hora y solo cambia el aviso.
 * - El chip de un día muestra su aviso solo si difiere del general.
 */

export type Aviso = readonly number[];

/** De la antelación mayor a la menor, sin repetir: el orden en que llegan, y el del conjunto que se compara. */
export function avisoOrdenado(aviso: Aviso): number[] {
  return [...new Set(aviso)].sort((a, b) => b - a);
}

export function mismoAviso(a: Aviso, b: Aviso): boolean {
  const x = avisoOrdenado(a);
  const y = avisoOrdenado(b);
  return x.length === y.length && x.every((m, i) => m === y[i]);
}

/**
 * Qué aviso muestra la sección Recordatorio al marcar días: el que tienen en común, `'distintos'` si no todos
 * tienen el mismo, o `null` si no hay días marcados (manda el aviso general).
 */
export function avisoInicialDeLosMarcados(avisosDeLosMarcados: readonly Aviso[]): number[] | 'distintos' | null {
  if (avisosDeLosMarcados.length === 0) return null;
  const [primero, ...resto] = avisosDeLosMarcados;
  return resto.every(a => mismoAviso(a, primero)) ? avisoOrdenado(primero) : 'distintos';
}

export type QueGuardar = 'hora' | 'aviso' | 'ambos';

/**
 * Qué se guarda con los días marcados. Sin mover la rueda cada día conserva su hora y solo cambia el aviso;
 * si se movió la rueda, se guarda la hora (y el aviso, si también se tocó). Sin tocar nada, lo de siempre: la
 * hora de la rueda, que es lo que hace hoy el botón.
 */
export function queGuardar({ movioLaRueda, cambioElAviso }: { movioLaRueda: boolean; cambioElAviso: boolean }): QueGuardar {
  if (cambioElAviso && movioLaRueda) return 'ambos';
  if (cambioElAviso) return 'aviso';
  return 'hora';
}

/** «lun, mié» para leerlo dentro de una frase. */
export function diasEnFrase(dias: readonly DiaDelPlan[]): string {
  return dias.join(', ').toLowerCase();
}

/**
 * El botón de guardar del editor: «Guardar 07:00 · todos los días», «Guardar 07:00 · sáb, dom»,
 * «Guardar aviso · sáb, dom» o «Guardar hora y aviso · sáb, dom». Los días van con su nombre corto y no con la
 * inicial: «M, M» no distingue martes de miércoles.
 */
export function textoDelBoton({
  guardando,
  dias,
  que,
  hora,
}: {
  guardando: boolean;
  dias: readonly DiaDelPlan[];
  que: QueGuardar;
  hora: string;
}): string {
  if (guardando) return 'Guardando…';
  if (dias.length === 0) return `Guardar ${hora} · todos los días`;
  const cuales = diasEnFrase(dias);
  if (que === 'aviso') return `Guardar aviso · ${cuales}`;
  if (que === 'ambos') return `Guardar hora y aviso · ${cuales}`;
  return `Guardar ${hora} · ${cuales}`;
}

/** Lo que dice el chip de un día cuyo aviso es distinto del general. */
export interface AvisoDelChip {
  /** Corto, para el poco espacio del chip: «30′», «a la hora», «sin aviso», «30′ +1». */
  corto: string;
  /** Completo, para el lector de pantalla: «Aviso 30 minutos antes». */
  largo: string;
  /** `true` = ese día va sin aviso: el chip dibuja la campana tachada y no escribe el texto. */
  sinAviso: boolean;
}

function minutosCortos(m: number): string {
  if (m < 60) return `${m}′`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto}′`;
}

function minutosLargos(m: number): string {
  if (m === 0) return 'a la hora';
  if (m < 60) return `${m} minutos antes`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  const h = horas === 1 ? '1 hora' : `${horas} horas`;
  return resto === 0 ? `${h} antes` : `${h} y ${resto} minutos antes`;
}

/**
 * El aviso de un día para su chip, o `null` si no hay nada que decir: no se sabe (backend anterior) o es igual
 * al general (el día lo hereda y no se muestra como propio).
 */
export function resumenDelAvisoDelDia(avisoDelDia: Aviso | null | undefined, avisoGeneral: Aviso): AvisoDelChip | null {
  if (!avisoDelDia || mismoAviso(avisoDelDia, avisoGeneral)) return null;
  const avisos = avisoOrdenado(avisoDelDia);
  if (avisos.length === 0) return { corto: 'sin aviso', largo: 'Sin aviso', sinAviso: true };
  const [primero, ...mas] = avisos;
  if (mas.length === 0) {
    return {
      corto: primero === 0 ? 'a la hora' : minutosCortos(primero),
      largo: primero === 0 ? 'Aviso a la hora' : `Aviso ${minutosLargos(primero)}`,
      sinAviso: false,
    };
  }
  return {
    corto: `${primero === 0 ? 'a la hora' : minutosCortos(primero)} +${mas.length}`,
    largo: `Avisos ${avisos.map(minutosLargos).join(' y ')}`,
    sinAviso: false,
  };
}

/** Un día de la semana tal como lo guarda el editor: lo resuelto por el servidor, para mostrar y para las alarmas. */
export interface DiaDelEditor {
  /** `HH:mm` que rige ese día, o `null` si no tiene hora. */
  hora: string | null;
  /** `true` = tiene hora propia (la hora de un día apagado también cuenta como propia, como lo hacía el editor). */
  propio: boolean;
  /** `false` = ese día el hábito no va. */
  activo: boolean;
  /** El aviso resuelto del día (el propio o el general). `null` = el servidor no informa avisos por día. */
  aviso: number[] | null;
  /** `true` si el aviso es propio de ese día. */
  avisoPropio: boolean;
}

/**
 * Los siete días del editor a partir de `GET .../weekdays`. Sin el campo `customReminder` el backend es
 * anterior a la spec 008: `aviso` queda en `null` y el editor no ofrece avisos por día.
 *
 * @param avisoGeneral el aviso general del hábito, para un día que dice «activo» sin traer la lista.
 */
export function diasDelEditor(dias: readonly DiaDeLaSemanaApi[], avisoGeneral: Aviso): Record<DiaDelPlan, DiaDelEditor> {
  const porNombre = new Map(dias.map(d => [d.weekday, d]));
  const resultado = {} as Record<DiaDelPlan, DiaDelEditor>;
  for (const dia of Object.keys(NOMBRE_ISO_DEL_DIA) as DiaDelPlan[]) {
    const d = porNombre.get(NOMBRE_ISO_DEL_DIA[dia]);
    const informaAviso = typeof d?.customReminder === 'boolean';
    let aviso: number[] | null = null;
    if (informaAviso && d) {
      if (d.reminderEnabled === false) aviso = [];
      else if (d.reminderMinutesList && d.reminderMinutesList.length > 0) aviso = avisoOrdenado(d.reminderMinutesList);
      else aviso = avisoOrdenado(avisoGeneral);
    }
    resultado[dia] = {
      hora: d?.triggerTime?.slice(0, 5) ?? null,
      // `?? false`: un día que el servidor no trajo no tiene nada propio.
      propio: d?.custom ?? false,
      // `?? true` para un backend anterior a V40, donde todos los días estaban encendidos.
      activo: d?.active ?? true,
      aviso,
      avisoPropio: d?.customReminder === true,
    };
  }
  return resultado;
}

/** `true` si el servidor informa el aviso de cada uno de los siete días (spec 008): ahí se ofrece elegirlo. */
export function servidorInformaAvisosPorDia(dias: Readonly<Record<string, DiaDelEditor>>): boolean {
  const lista = Object.values(dias);
  return lista.length > 0 && lista.every(d => d.aviso !== null);
}

const ISO_DEL_NOMBRE_DE_LA_PANTALLA: Readonly<Record<DiaDelPlan, DiaIso>> = {
  LUN: 1, MAR: 2, 'MIÉ': 3, JUE: 4, VIE: 5, 'SÁB': 6, DOM: 7,
};

/**
 * Lo propio de cada día, en el vocabulario de las alarmas del teléfono (`alarmasPorDia`): la hora solo si es
 * propia, el aviso solo si es propio. Es lo que ve el servidor, y por eso las alarmas salen igual que sus avisos.
 */
export function diasPropiosDelEditor(dias: Readonly<Record<string, DiaDelEditor>>): DiaPropio[] {
  return (Object.keys(ISO_DEL_NOMBRE_DE_LA_PANTALLA) as DiaDelPlan[])
    .filter(dia => dias[dia] !== undefined)
    .map(dia => {
      const d = dias[dia];
      return {
        iso: ISO_DEL_NOMBRE_DE_LA_PANTALLA[dia],
        activo: d.activo,
        hora: d.propio && d.activo ? d.hora : null,
        avisos: d.avisoPropio && d.aviso ? [...d.aviso] : null,
      };
    });
}
