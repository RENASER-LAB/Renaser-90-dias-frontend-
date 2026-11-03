import { NOMBRE_ISO_DEL_DIA, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import type { DiaDeLaSemanaApi } from '../../habits/types/habits.types';
import type { DiaIso, DiaPropio } from '../../habits/notificaciones/utils/alarmasPorDia';
import { combinacionDeLaApi, type CombinacionDeAlarma } from '../../habits/notificaciones/utils/combinacionDeAlarma';

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
 * Lo que se guarda con los días marcados, sumando «Cómo suena» (spec 009). `'ninguno'` = ni la hora ni el aviso:
 * solo se tocó «Cómo suena», así que cada día conserva su hora y su aviso («solo lo que toqué»).
 */
export type QueGuardarConAlarma = QueGuardar | 'ninguno';

/**
 * Qué se guarda cuando además puede haberse tocado «Cómo suena». Lo de siempre (`queGuardar`) con una excepción: si
 * solo se tocó «Cómo suena» —la rueda quieta y el aviso sin cambios—, no se guarda la hora de la rueda.
 */
export function queGuardarConAlarma({
  movioLaRueda,
  cambioElAviso,
  cambioLaAlarma,
}: {
  movioLaRueda: boolean;
  cambioElAviso: boolean;
  cambioLaAlarma: boolean;
}): QueGuardarConAlarma {
  if (cambioLaAlarma && !movioLaRueda && !cambioElAviso) return 'ninguno';
  return queGuardar({ movioLaRueda, cambioElAviso });
}

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
 *
 * Spec 009: si solo se cambió «Cómo suena» dice «Guardar alarma · sáb» (o «… · todos los días»); si se cambió junto con
 * lo demás lo suma («Guardar aviso y alarma», «Guardar hora y alarma», «Guardar hora, aviso y alarma»). Sin días
 * marcados el botón guarda la hora general y, si se tocó, también «Cómo suena», sin decirlo en el texto.
 */
export function textoDelBoton({
  guardando,
  dias,
  que,
  hora,
  alarma = false,
}: {
  guardando: boolean;
  dias: readonly DiaDelPlan[];
  que: QueGuardarConAlarma;
  hora: string;
  /** Se tocó «Cómo suena»: se guarda junto con lo demás. */
  alarma?: boolean;
}): string {
  if (guardando) return 'Guardando…';
  const soloLaAlarma = que === 'ninguno' && alarma;
  if (dias.length === 0) return soloLaAlarma ? 'Guardar alarma · todos los días' : `Guardar ${hora} · todos los días`;
  const cuales = diasEnFrase(dias);
  if (soloLaAlarma) return `Guardar alarma · ${cuales}`;
  if (que === 'aviso') return alarma ? `Guardar aviso y alarma · ${cuales}` : `Guardar aviso · ${cuales}`;
  if (que === 'ambos') return alarma ? `Guardar hora, aviso y alarma · ${cuales}` : `Guardar hora y aviso · ${cuales}`;
  return alarma ? `Guardar hora y alarma · ${cuales}` : `Guardar ${hora} · ${cuales}`;
}

/** Lo que dice (al lector de pantalla) el chip de un día cuyo aviso es distinto del general. */
export interface AvisoDelChip {
  /**
   * Completo, para el lector de pantalla: «Aviso 30 minutos antes», «Avisos 30, 10 y 5 minutos antes y a la hora». El
   * chip no escribe los minutos (spec 011): dibuja la campana y este texto lo oye quien usa lector.
   */
  largo: string;
  /** `true` = ese día va sin aviso: el chip dibuja la campana tachada. */
  sinAviso: boolean;
}

function minutosLargos(m: number): string {
  if (m === 0) return 'a la hora';
  if (m === 1) return '1 minuto antes';
  if (m < 60) return `${m} minutos antes`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  const h = horas === 1 ? '1 hora' : `${horas} horas`;
  return resto === 0 ? `${h} antes` : `${h} y ${resto} minutos antes`;
}

/** «a, b y c»: una lista dicha en una frase. */
function enFrase(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * La lista completa de avisos para el lector de pantalla: «30, 10 y 5 minutos antes y a la hora». Si ninguno pasa de
 * las tres horas se agrupan bajo un solo «minutos antes» («90 y 30 minutos antes»); si alguno pasa, cada uno dice su
 * unidad.
 */
function avisosEnFrase(avisos: readonly number[]): string {
  const antes = avisos.filter(m => m > 0);
  const alaHora = avisos.includes(0);
  let frase: string;
  if (antes.length > 1 && antes.every(m => m < 180)) {
    frase = `${enFrase(antes.map(String))} minutos antes`;
  } else {
    frase = enFrase(antes.map(minutosLargos));
  }
  if (!alaHora) return frase;
  return frase ? `${frase} y a la hora` : 'a la hora';
}

/**
 * El aviso de un día para su chip, o `null` si no hay nada que decir: no se sabe (backend anterior) o es igual
 * al general (el día lo hereda y no se muestra como propio).
 */
export function resumenDelAvisoDelDia(avisoDelDia: Aviso | null | undefined, avisoGeneral: Aviso): AvisoDelChip | null {
  if (!avisoDelDia || mismoAviso(avisoDelDia, avisoGeneral)) return null;
  const avisos = avisoOrdenado(avisoDelDia);
  if (avisos.length === 0) return { largo: 'Sin aviso', sinAviso: true };
  const [primero, ...mas] = avisos;
  if (mas.length === 0) {
    return {
      largo: primero === 0 ? 'Aviso a la hora' : `Aviso ${minutosLargos(primero)}`,
      sinAviso: false,
    };
  }
  // Varios: la lista completa, para el lector de pantalla.
  return {
    largo: `Avisos ${avisosEnFrase(avisos)}`,
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
  /**
   * Spec 009: cómo suena la alarma ese día, ya resuelta (la propia o la general). `null`/ausente = el servidor no
   * informa «Cómo suena» (backend anterior): el editor no lo ofrece.
   */
  alarma?: CombinacionDeAlarma | null;
  /** Spec 009: `true` si «cómo suena» es propio de ese día. */
  alarmaPropia?: boolean;
  /**
   * Spec 028: `true` si esa FECHA tiene cambio «solo esta semana» (fila propia de la fecha). Solo lo trae la lectura de la
   * semana (`diasDelEditorDeLaSemana`); en «Todas las semanas» no existe.
   */
  propioDeLaFecha?: boolean;
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
    // Spec 009: «cómo suena». Solo hay datos si el servidor manda `customAlarm`; sin él (backend anterior) el día no
    // lleva los campos y el editor no ofrece «Cómo suena».
    const informaAlarma = typeof d?.customAlarm === 'boolean';
    resultado[dia] = {
      hora: d?.triggerTime?.slice(0, 5) ?? null,
      // `?? false`: un día que el servidor no trajo no tiene nada propio.
      propio: d?.custom ?? false,
      // `?? true` para un backend anterior a V40, donde todos los días estaban encendidos.
      activo: d?.active ?? true,
      aviso,
      avisoPropio: d?.customReminder === true,
      ...(informaAlarma ? { alarma: combinacionDeLaApi(d?.alarm), alarmaPropia: d?.customAlarm === true } : {}),
    };
  }
  return resultado;
}

/** `true` si el servidor informa el aviso de cada uno de los siete días (spec 008): ahí se ofrece elegirlo. */
export function servidorInformaAvisosPorDia(dias: Readonly<Record<string, DiaDelEditor>>): boolean {
  const lista = Object.values(dias);
  return lista.length > 0 && lista.every(d => d.aviso !== null);
}

/** `true` si el servidor informa «cómo suena» de cada uno de los siete días (spec 009): ahí se ofrece elegirlo. */
export function servidorInformaAlarmaPorDia(dias: Readonly<Record<string, DiaDelEditor>>): boolean {
  const lista = Object.values(dias);
  return lista.length > 0 && lista.every(d => (d.alarma ?? null) !== null);
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
        // E-642: la hora que rige ese día según el servidor, para que un día sin hora propia no tome la de hoy.
        ...(d.hora ? { horaResuelta: d.hora } : {}),
        avisos: d.avisoPropio && d.aviso ? [...d.aviso] : null,
        // Spec 009: «cómo suena» solo si es propio del día; si no, el día sigue a la general.
        ...(d.alarmaPropia && d.alarma ? { alarma: { ...d.alarma } } : {}),
        ...(d.alarmaPropia && !d.alarma ? { alarmaPropiaSinDato: true } : {}),
      };
    });
}
