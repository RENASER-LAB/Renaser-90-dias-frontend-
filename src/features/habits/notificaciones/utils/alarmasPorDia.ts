import type { DiaDelHabitoApi, FechaDelHabitoApi } from '../../types/habits.types';
import {
  codigoDeLaCombinacion,
  combinacionDeLaApi,
  combinacionDelDia,
  esLaCombinacionPorDefecto,
  type CombinacionDeAlarma,
} from './combinacionDeAlarma';

/**
 * Qué alarmas del teléfono lleva un hábito cuando cada día de la semana puede tener su propia hora, su
 * propio aviso o estar apagado (spec 008, E-640). Pura: no toca la librería ni el almacenamiento.
 *
 * ## El bug que cierra (E-640)
 *
 * Una sola alarma `DAILY` a la hora GENERAL ignoraba la hora propia de cada día: si el jueves iba a las 09:00,
 * el teléfono sonaba igual a las 07:00. El servidor, en cambio, sí usaba la hora del día para su push.
 *
 * ## Dos esquemas, con la MISMA regla que el servidor (research R4 y R6)
 *
 * - **Diario** (`habito-{id}-inicio` en la alarma más temprana): el hábito no tiene ningún día distinto. Es
 *   exactamente lo de siempre; quien no usa días distintos no ve ningún cambio, ni en las alarmas ni en sus
 *   identificadores.
 * - **Por día**: algún día tiene hora propia, aviso propio o está apagado. Una alarma `WEEKLY` por día encendido
 *   y por antelación, a la hora de ESE día menos la antelación de ESE día. Identificadores
 *   `habito-{id}-d{iso}-{n}` (iso: 1 = lunes … 7 = domingo; `n` = 0 para la más temprana de cada día), que son
 *   la etiqueta que el servidor pone a su push de respaldo (`habito-{id}-d{iso}-0`): si el teléfono no confirmó
 *   sus alarmas y recibe también el push, el segundo REEMPLAZA al primero en la bandeja en vez de apilarse.
 *
 * La regla de cuál esquema se usa es la del servidor («el hábito tiene al menos una fila en
 * `horario_semanal_habito`»): hora propia, aviso propio, «cómo suena» propio (spec 009) o día apagado.
 *
 * ## Las fechas propias: «solo esta semana» (spec 028, research R5)
 *
 * Una fecha concreta puede tener su propia hora, aviso o «cómo suena», o estar apagada (`dateOverrides` de
 * `GET /habit-preferences`, `fechasPropiasDe`). Una alarma `WEEKLY` no puede saltarse una fecha —cancelarla borra las de
 * todas las semanas y dejarla la deja sonar a la hora vieja, el mismo problema del #33—, así que el día de la semana
 * AFECTADO (el que tiene alguna fecha propia vigente) no lleva alarma semanal: lleva alarmas de FECHA, una por aviso y por
 * ocurrencia de ese día desde hoy hasta la última fecha propia más `SEMANAS_DE_COLA` semanas, con el valor propio donde hay
 * fila y el de siempre donde no. Los demás días siguen semanales. Cuando ya no quedan fechas propias vigentes el plan vuelve
 * solo al de siempre (`planDeAlarmas` sin fechas es el de antes, idéntico). El primer aviso de la primera ocurrencia de un día
 * afectado conserva `habito-{id}-d{iso}-0` (la etiqueta del push de respaldo); el resto, `habito-{id}-f{AAAAMMDD}-{n}`.
 * Tope: `TOPE_DE_ALARMAS_DE_FECHA` por hábito, las más próximas primero.
 *
 * ## El número del día de la semana
 *
 * Acá los días son ISO (1 = lunes … 7 = domingo), como `dia_semana` en la base y como el resto del proyecto. El
 * disparador `WEEKLY` de `expo-notifications` numera al revés: 1 = DOMINGO … 7 = sábado. `weekdayDeExpo` hace la
 * traducción en un solo lugar.
 *
 * ## El cruce de medianoche
 *
 * Un hábito a las 00:10 con aviso de 30 min suena a las 23:40 del DÍA ANTERIOR. La alarma va al día de la
 * semana anterior, pero sigue siendo el aviso del día del hábito: se identifica con el día del hábito.
 *
 * ## El cambio de hora que rige desde mañana (D-91)
 *
 * Mientras un cambio general de hora espera su fecha, los días que siguen la hora general no pueden ser
 * `WEEKLY` (no saben «desde mañana»): llevan una alarma de FECHA, la del próximo día que les toca, a la hora que
 * rija en esa fecha. Al abrir la app la puesta al día las convierte en `WEEKLY` cuando el cambio ya rige. Los
 * días con hora propia no cambian: el cambio general no los toca.
 */

export type DiaIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIAS_ISO: readonly DiaIso[] = [1, 2, 3, 4, 5, 6, 7];

/** El nombre que el servidor da a cada día (`java.time.DayOfWeek`). */
export const NOMBRE_DEL_DIA_ISO: Readonly<Record<DiaIso, string>> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

const ISO_DEL_NOMBRE: Readonly<Record<string, DiaIso>> = Object.fromEntries(
  DIAS_ISO.map(iso => [NOMBRE_DEL_DIA_ISO[iso], iso]),
);

/**
 * Lo propio de un día de la semana: lo que se guardó solo para él. Lo que no es propio sigue al hábito
 * (`hora: null`, `avisos: null`), así que un cambio general le llega.
 */
export interface DiaPropio {
  iso: DiaIso;
  /** `false` = ese día el hábito no va, todas las semanas. */
  activo: boolean;
  /** `HH:mm` propia de ese día. `null` = la general. */
  hora: string | null;
  /** Antelaciones propias, en minutos. `[]` = ese día sin aviso. `null` = el aviso general. */
  avisos: number[] | null;
  /**
   * `HH:mm` que el servidor RESUELVE para ese día (`weekdays[i].triggerTime`): la propia si la tiene y, si no, la
   * general. Es lo que manda para un día sin hora propia (E-642): la `triggerTime` de arriba del ítem de
   * `GET /habit-preferences` está resuelta para HOY, así que si hoy tiene hora propia (martes a las 11:29) no es la
   * general, y usarla para los demás días ponía el sábado a las 10:59 en vez de las 06:30. Ausente = el servidor no la
   * informa o es un `DiaPropio` de antes de este arreglo: se usa la general.
   */
  horaResuelta?: string | null;
  /**
   * Spec 009: cómo suena la alarma ESE día, si es propia. Ausente o `null` = la general del hábito. Es opcional
   * para que lo anterior a la spec (y sus pruebas) siga siendo un `DiaPropio` válido.
   */
  alarma?: CombinacionDeAlarma | null;
  /**
   * Spec 009: el servidor dice que ese día tiene «cómo suena» propio (`customAlarm`) pero la combinación no se pudo
   * leer. Aun así el día es una fila semanal para el servidor —su push lleva la etiqueta del día—, así que el esquema
   * es por día; la combinación que suena es la general. Solo se pone en ese caso raro.
   */
  alarmaPropiaSinDato?: boolean;
}

const MINUTOS_POR_DIA = 24 * 60;

const esHoraHHmm = (x: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(x);

/** `HH:mm` de un `HH:mm` o `HH:mm:ss`. `null` si no es una hora. */
export function horaCorta(crudo: string | null | undefined): string | null {
  const corta = crudo?.slice(0, 5) ?? '';
  return esHoraHHmm(corta) ? corta : null;
}

function enMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Los días propios a partir de lo que manda el servidor (`weekdays`), o `null` si no manda nada (backend
 * anterior). Un día con nombre desconocido se ignora; uno que falta es un día sin nada propio.
 *
 * - Hora propia: `customTime` (la lista) o `custom` (el endpoint del hábito).
 * - Aviso propio: `customReminder`; su valor es el conjunto resuelto del día, vacío si va sin aviso. Un aviso
 *   propio «activo» sin conjunto no se puede leer: se deja heredar el general antes que inventar uno.
 */
export function diasPropiosDe(weekdays: readonly DiaDelHabitoApi[] | null | undefined): DiaPropio[] | null {
  if (!weekdays || weekdays.length === 0) return null;
  const propios: DiaPropio[] = [];
  for (const d of weekdays) {
    const iso = ISO_DEL_NOMBRE[d.weekday];
    if (!iso) continue;
    const horaPropia = (d.customTime ?? d.custom) === true ? horaCorta(d.triggerTime) : null;
    let avisos: number[] | null = null;
    if (d.customReminder === true) {
      if (d.reminderEnabled === false) avisos = [];
      else if (d.reminderMinutesList && d.reminderMinutesList.length > 0) avisos = [...d.reminderMinutesList];
    }
    // Spec 009: la combinación solo cuenta si es propia del día; si no, el día sigue a la general.
    const alarma = d.customAlarm === true ? combinacionDeLaApi(d.alarm) : null;
    const horaResuelta = horaCorta(d.triggerTime);
    propios.push({
      iso,
      activo: d.active !== false,
      hora: horaPropia,
      avisos,
      ...(horaResuelta ? { horaResuelta } : {}),
      ...(alarma ? { alarma } : {}),
      ...(d.customAlarm === true && !alarma ? { alarmaPropiaSinDato: true } : {}),
    });
  }
  return propios.length > 0 ? propios : null;
}

/**
 * Lo propio de una FECHA concreta (spec 028): lo que el servidor resolvió para ella y que NO es solo el plan de siempre.
 * Cada campo `null` sigue a lo que rija ese día de la semana (la hora, el aviso, «cómo suena»): así el cambio de hora
 * general que espera su fecha (D-91) y el aviso general que mezcla el teléfono siguen mandando donde la fecha no dice nada.
 */
export interface FechaPropia {
  /** `YYYY-MM-DD`, en la zona de la persona (que es la del teléfono para las alarmas). */
  fecha: string;
  /** El día de la semana ISO de esa fecha. */
  iso: DiaIso;
  /** `false` = esa fecha el hábito no va (apagada, o el día de la semana está apagado). */
  activo: boolean;
  /** `HH:mm` propia de esa fecha o de su día de la semana. `null` = la que rija ese día. */
  hora: string | null;
  /** Antelaciones propias, en minutos. `[]` = esa fecha sin aviso. `null` = el aviso que rija ese día. */
  avisos: number[] | null;
  /** «Cómo suena» propio. `null` = el que rija ese día. */
  alarma: CombinacionDeAlarma | null;
}

const FORMA_DE_UNA_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** El mediodía local de `YYYY-MM-DD`, o `null` si no es una fecha del calendario. */
function fechaDelCalendario(fecha: string): Date | null {
  const m = FORMA_DE_UNA_FECHA.exec(fecha);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(a, mes - 1, d, 12, 0, 0, 0);
  return f.getFullYear() === a && f.getMonth() === mes - 1 && f.getDate() === d ? f : null;
}

/**
 * Las fechas propias a partir de lo que manda el servidor (`dateOverrides`), o `[]` si no manda nada (backend anterior) o no
 * se entiende. Un dato roto se pierde SOLO él: una fecha que no es del calendario se ignora; si se repite una, manda la última.
 * Ordenadas por fecha.
 *
 * Los valores del servidor son los RESUELTOS de esa fecha, y solo cuentan si son propios (`customTime`, `customReminder`,
 * `customAlarm`): un valor heredado sale `null` y se resuelve contra el día de la semana, que sabe del cambio de hora que
 * todavía no rige. Un aviso propio «activo» sin conjunto no se puede leer: se deja heredar antes que inventar uno.
 */
export function fechasPropiasDe(fechas: readonly FechaDelHabitoApi[] | null | undefined): FechaPropia[] {
  if (!Array.isArray(fechas)) return [];
  const porFecha = new Map<string, FechaPropia>();
  for (const d of fechas) {
    if (!d || typeof d.date !== 'string') continue;
    const dia = fechaDelCalendario(d.date);
    if (!dia) continue;
    const horaPropia = (d.customTime ?? d.custom) === true ? horaCorta(d.triggerTime) : null;
    let avisos: number[] | null = null;
    if (d.customReminder === true) {
      if (d.reminderEnabled === false) avisos = [];
      else {
        const lista: number[] = (d.reminderMinutesList ?? []).filter(
          (a: unknown): a is number => typeof a === 'number' && Number.isFinite(a) && a >= 0,
        );
        avisos = lista.length > 0 ? lista : null;
      }
    }
    const alarma = d.customAlarm === true ? combinacionDeLaApi(d.alarm) : null;
    porFecha.set(d.date, {
      fecha: d.date,
      iso: isoDe(dia),
      activo: d.active !== false,
      hora: horaPropia,
      avisos,
      alarma,
    });
  }
  return [...porFecha.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/** Las fechas propias que todavía importan: de hoy en adelante (la fecha es la local del teléfono, como las alarmas). */
export function fechasVigentes(fechas: readonly FechaPropia[] | null | undefined, ahora: Date): FechaPropia[] {
  const hoy = fechaLocal(ahora);
  return (fechas ?? []).filter(f => f.fecha >= hoy);
}

/** ¿Alguna fecha propia sigue vigente? Con una, el hábito va por día y los días afectados llevan alarmas de fecha. */
export function hayFechasVigentes(fechas: readonly FechaPropia[] | null | undefined, ahora: Date): boolean {
  return fechasVigentes(fechas, ahora).length > 0;
}

/** La regla común con el servidor: algún día con hora propia, aviso propio, «cómo suena» propio o apagado. */
export function usaEsquemaPorDia(dias: readonly DiaPropio[] | null | undefined): boolean {
  return (dias ?? []).some(
    d => !d.activo || d.hora !== null || d.avisos !== null || (d.alarma ?? null) !== null || d.alarmaPropiaSinDato === true,
  );
}

/** `habito-{id}-d{iso}-{n}`: el mismo identificador que la etiqueta del push del servidor (`-0`). */
export function identificadorDelAvisoDelDia(habitoId: string, iso: DiaIso, n: number): string {
  return `habito-${habitoId}-d${iso}-${n}`;
}

/** `1 = domingo … 7 = sábado`, como numera `WEEKLY` en `expo-notifications`. Entra el día ISO (1 = lunes … 7). */
export function weekdayDeExpo(iso: DiaIso): number {
  return (iso % 7) + 1;
}

export type DisparoDeAlarma =
  | { tipo: 'semanal'; weekday: number; hora: number; minuto: number }
  | { tipo: 'fecha'; instanteMs: number };

export interface PedidoDeAlarmaDelDia {
  identificador: string;
  /** El día del HÁBITO (no el de la alarma: con el cruce de medianoche pueden ser distintos). */
  diaIso: DiaIso;
  minutosAntes: number;
  /** `HH:mm` a la que va el hábito ese día: lo que dice el cuerpo del aviso («Te toca a las …»). */
  horaDelDia: string;
  disparo: DisparoDeAlarma;
  /** Spec 009: cómo suena ESE día (la propia o la general): por qué canal sale y si vuelve a sonar. */
  alarma: CombinacionDeAlarma;
}

/** Un cambio de hora general que espera su fecha: hoy rige `horaDeHoy`; desde `desde` (`YYYY-MM-DD`), `horaNueva`. */
export interface CambioDeHoraGeneral {
  horaDeHoy: string;
  horaNueva: string;
  desde: string;
}

export type PlanDeAlarmas = { esquema: 'diario' } | { esquema: 'porDia'; pedidos: PedidoDeAlarmaDelDia[] };

export interface EntradaDelPlan {
  habitoId: string;
  /** La hora general (`HH:mm`). `null` = el hábito no tiene hora y los días sin hora propia no suenan. */
  horaGeneral: string | null;
  /** El aviso general, en minutos antes. Vacío = sin aviso. */
  avisosGenerales: readonly number[];
  /** Lo propio de cada día. `null`/`undefined` = el servidor no lo informa: esquema diario. */
  dias: readonly DiaPropio[] | null | undefined;
  /** Un cambio de hora general que todavía no rige (solo cuenta en el esquema por día). */
  cambio?: CambioDeHoraGeneral | null;
  /** Spec 009: cómo suena la alarma del hábito (la general). `null`/`undefined` = la de siempre. */
  alarmaGeneral?: CombinacionDeAlarma | null;
  /**
   * Spec 028: las fechas con cambio «solo esta semana». Con alguna vigente el hábito va por día y los días afectados llevan
   * alarmas de fecha (ver arriba). `null`/`undefined`/vacío = ninguna: el plan es el de siempre.
   */
  fechas?: readonly FechaPropia[] | null;
  /** «Ahora», para el cambio con fecha y para saber qué fechas propias siguen vigentes. Por defecto, el reloj. */
  ahora?: Date;
}

/** De la más temprana a la más tardía (la mayor antelación primero), sin repetir ni valores inválidos. */
export function ordenadas(antelaciones: readonly number[]): number[] {
  return [...new Set(antelaciones.filter(a => Number.isFinite(a) && a >= 0))].sort((a, b) => b - a);
}

/** El día ISO de una fecha local (1 = lunes … 7 = domingo). */
export function isoDe(fecha: Date): DiaIso {
  return (((fecha.getDay() + 6) % 7) + 1) as DiaIso;
}

const dos = (n: number) => String(n).padStart(2, '0');

export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/**
 * La alarma semanal de un aviso: a `hora − antelación` del día del hábito, pasando al día anterior cuantas
 * veces haga falta si la resta cruza la medianoche.
 */
function disparoSemanal(iso: DiaIso, hora: string, antes: number): DisparoDeAlarma {
  const total = enMinutos(hora) - antes;
  const dias = Math.floor(total / MINUTOS_POR_DIA); // 0, o negativo si cruza la medianoche
  const delDia = total - dias * MINUTOS_POR_DIA;
  const isoDeLaAlarma = ((((iso - 1 + dias) % 7) + 7) % 7) + 1;
  return { tipo: 'semanal', weekday: weekdayDeExpo(isoDeLaAlarma as DiaIso), hora: Math.floor(delDia / 60), minuto: delDia % 60 };
}

/**
 * La próxima alarma de un día mientras un cambio de hora espera su fecha: la primera ocurrencia de ese día de
 * la semana cuyo aviso todavía no pasó, a la hora que rija en ESA fecha (la de hoy antes de `desde`, la nueva
 * desde `desde`).
 */
function proximaConCambio(iso: DiaIso, antes: number, cambio: CambioDeHoraGeneral, ahora: Date): { instanteMs: number; hora: string } | null {
  for (let i = 0; i <= 14; i++) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, 12, 0, 0, 0);
    if (isoDe(fecha) !== iso) continue;
    const hora = fechaLocal(fecha) < cambio.desde ? cambio.horaDeHoy : cambio.horaNueva;
    const [h, m] = hora.split(':').map(Number);
    const instante = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), h, m - antes, 0, 0);
    if (instante.getTime() > ahora.getTime()) return { instanteMs: instante.getTime(), hora };
  }
  return null;
}

/**
 * Lo mínimo que hace falta para saber qué rige un día concreto. Lo comparten el plan de alarmas, el puente de un hábito
 * cumplido (`puenteDeAlarmas.ts`) y las repeticiones (`repeticionesDeAlarma.ts`): una sola cuenta por día, para que las
 * tres lean igual la hora, el aviso y «cómo suena» de una fecha propia.
 */
export interface EntradaConDias {
  /** La hora general (`HH:mm` o `HH:mm:ss`). `null` = no tiene hora y los días sin hora propia no suenan. */
  horaGeneral: string | null | undefined;
  avisosGenerales: readonly number[];
  dias: readonly DiaPropio[] | null | undefined;
  alarmaGeneral?: CombinacionDeAlarma | null;
  /** Un cambio de hora general que todavía no rige (D-91): hasta su fecha rige `horaDeHoy`. */
  cambio?: CambioDeHoraGeneral | null;
  /** Spec 028: las fechas con cambio «solo esta semana». */
  fechas?: readonly FechaPropia[] | null;
}

/** Lo que rige un día concreto, ya mezclado: día de la semana + fecha propia. */
export interface ValoresDelDia {
  /** `false` = ese día el hábito no va (el día de la semana está apagado o la fecha lo está). */
  activo: boolean;
  /** `HH:mm`, o `null` si no hay hora (y entonces no suena). */
  hora: string | null;
  /** De la mayor antelación a la menor, sin repetidos. Vacío = sin aviso. */
  avisos: number[];
  alarma: CombinacionDeAlarma;
}

/**
 * La hora que rige para el día `fecha` (local): la propia de la fecha o del día de la semana, o la general; con un cambio
 * pendiente (D-91), la de esa fecha. E-642: un día sin hora propia va a la hora que el servidor resolvió para ESE día, no a
 * la de hoy.
 */
export function horaDeLaFecha(
  entrada: Pick<EntradaConDias, 'horaGeneral' | 'cambio'>,
  propio: DiaPropio | undefined,
  fecha: Date,
): string | null {
  if (propio?.hora) return horaCorta(propio.hora);
  const resuelta = horaCorta(propio?.horaResuelta);
  if (entrada.cambio) {
    return fechaLocal(fecha) < entrada.cambio.desde
      ? (resuelta ?? horaCorta(entrada.cambio.horaDeHoy))
      : horaCorta(entrada.cambio.horaNueva);
  }
  return resuelta ?? horaCorta(entrada.horaGeneral);
}

/**
 * Qué rige el día `dia` (local): lo de la fecha propia si la hay —campo por campo—, si no lo del día de la semana, si no lo
 * general. Sin `fechas` es exactamente la cuenta de siempre.
 */
export function valoresDelDia(entrada: EntradaConDias, dia: Date): ValoresDelDia {
  const propio = (entrada.dias ?? []).find(d => d.iso === isoDe(dia));
  const hoy = fechaLocal(dia);
  const deLaFecha = (entrada.fechas ?? []).find(f => f.fecha === hoy);
  return {
    activo: (propio?.activo ?? true) && (deLaFecha?.activo ?? true),
    hora: deLaFecha?.hora ? horaCorta(deLaFecha.hora) : horaDeLaFecha(entrada, propio, dia),
    avisos: ordenadas(deLaFecha?.avisos ?? propio?.avisos ?? entrada.avisosGenerales),
    alarma: combinacionDelDia(entrada.alarmaGeneral, deLaFecha?.alarma ?? propio?.alarma),
  };
}

/** Cuántas semanas de cola lleva un día afectado después de su última fecha propia (ver arriba). */
export const SEMANAS_DE_COLA = 2;

/** El máximo de alarmas de fecha que un hábito pone por esta vía: Android admite unas 500 por app. */
export const TOPE_DE_ALARMAS_DE_FECHA = 48;

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** `AAAAMMDD` de una fecha local. */
function compacta(d: Date): string {
  return `${d.getFullYear()}${dosDigitos(d.getMonth() + 1)}${dosDigitos(d.getDate())}`;
}

/** `habito-{id}-f{AAAAMMDD}-{n}`: una alarma de fecha de un día afectado (no es la primera de su día de la semana). */
export function identificadorDeLaFecha(habitoId: string, fecha: string, n: number): string {
  return `habito-${habitoId}-f${fecha}-${n}`;
}

/** Un aviso de una fecha propia antes de ponerle identificador (se arma después del tope, en orden cronológico). */
interface AvisoDeUnaFecha {
  fecha: string;
  iso: DiaIso;
  n: number;
  minutosAntes: number;
  horaDelDia: string;
  instanteMs: number;
  alarma: CombinacionDeAlarma;
}

/**
 * Las alarmas de FECHA de los días de la semana afectados por alguna fecha propia vigente: una por aviso y por ocurrencia de
 * ese día desde hoy hasta su última fecha propia más `SEMANAS_DE_COLA` semanas, con el tope por hábito (las más próximas
 * primero). Lo que ya sonó no entra.
 */
function pedidosDeLasFechasPropias(
  entrada: EntradaConDias & { habitoId: string },
  vigentes: readonly FechaPropia[],
  ahora: Date,
): PedidoDeAlarmaDelDia[] {
  const ultimaDe = new Map<DiaIso, string>();
  for (const f of vigentes) {
    const antes = ultimaDe.get(f.iso);
    if (!antes || f.fecha > antes) ultimaDe.set(f.iso, f.fecha);
  }
  const avisos: AvisoDeUnaFecha[] = [];
  for (const [iso, ultima] of ultimaDe) {
    const limite = fechaDelCalendario(ultima);
    if (!limite) continue;
    limite.setDate(limite.getDate() + SEMANAS_DE_COLA * 7);
    for (let i = 0; ; i++) {
      const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, 12, 0, 0, 0);
      if (dia.getTime() > limite.getTime()) break;
      if (isoDe(dia) !== iso) continue;
      const v = valoresDelDia(entrada, dia);
      if (!v.activo || !v.hora || v.avisos.length === 0) continue;
      const hora = v.hora;
      const [h, m] = hora.split(':').map(Number);
      v.avisos.forEach((antes, n) => {
        const instanteMs = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m - antes, 0, 0).getTime();
        if (instanteMs <= ahora.getTime()) return;
        avisos.push({ fecha: compacta(dia), iso, n, minutosAntes: antes, horaDelDia: hora, instanteMs, alarma: v.alarma });
      });
    }
  }
  avisos.sort((a, b) => a.instanteMs - b.instanteMs);
  // Etiqueta del push de respaldo (`-d{iso}-0`) para el primer aviso n=0 de cada día afectado; el resto lleva su fecha.
  const yaTienenElCero = new Set<DiaIso>();
  return avisos.slice(0, TOPE_DE_ALARMAS_DE_FECHA).map(a => {
    const conLaEtiqueta = a.n === 0 && !yaTienenElCero.has(a.iso);
    if (conLaEtiqueta) yaTienenElCero.add(a.iso);
    return {
      identificador: conLaEtiqueta
        ? identificadorDelAvisoDelDia(entrada.habitoId, a.iso, 0)
        : identificadorDeLaFecha(entrada.habitoId, a.fecha, a.n),
      diaIso: a.iso,
      minutosAntes: a.minutosAntes,
      horaDelDia: a.horaDelDia,
      disparo: { tipo: 'fecha', instanteMs: a.instanteMs },
      alarma: a.alarma,
    };
  });
}

/**
 * El plan de alarmas del hábito. `{ esquema: 'diario' }` si ningún día es distinto (el llamador sigue como
 * siempre); si no, una alarma por día encendido y por antelación.
 *
 * Spec 028: con alguna fecha propia vigente el hábito también va por día, y los días afectados llevan alarmas de fecha.
 */
export function planDeAlarmas(entrada: EntradaDelPlan): PlanDeAlarmas {
  const ahora = entrada.ahora ?? new Date();
  const vigentes = fechasVigentes(entrada.fechas, ahora);
  if (!usaEsquemaPorDia(entrada.dias) && vigentes.length === 0) return { esquema: 'diario' };

  const propios = new Map<DiaIso, DiaPropio>((entrada.dias ?? []).map(d => [d.iso, d]));
  const afectados = new Set<DiaIso>(vigentes.map(f => f.iso));
  const cambio = entrada.cambio && esHoraHHmm(entrada.cambio.horaDeHoy) && esHoraHHmm(entrada.cambio.horaNueva)
    ? entrada.cambio
    : null;
  const cambioPendiente = cambio !== null && fechaLocal(ahora) < cambio.desde;
  const horaGeneral = cambio && !cambioPendiente ? cambio.horaNueva : horaCorta(entrada.horaGeneral);
  /**
   * La hora de un día SIN hora propia: la que el servidor resolvió para ese día (E-642), salvo que un cambio general
   * ya rija (ahí manda la hora nueva) o no la haya informado (la general).
   */
  const horaDeUnDiaSinHoraPropia = (propio: DiaPropio | undefined): string | null =>
    cambio && !cambioPendiente ? horaGeneral : (horaCorta(propio?.horaResuelta) ?? horaGeneral);

  const pedidos: PedidoDeAlarmaDelDia[] = [];
  for (const iso of DIAS_ISO) {
    // Spec 028: un día afectado por una fecha propia no lleva alarma semanal (una semanal no puede saltarse una fecha): lleva
    // alarmas de fecha, que se arman aparte (`pedidosDeLasFechasPropias`).
    if (afectados.has(iso)) continue;
    const propio = propios.get(iso);
    if (propio && !propio.activo) continue;
    const horaPropia = propio?.hora ? horaCorta(propio.hora) : null;
    const antelaciones = ordenadas(propio?.avisos ?? entrada.avisosGenerales);
    if (antelaciones.length === 0) continue;
    const sigueAlGeneral = horaPropia === null;
    const alarma = combinacionDelDia(entrada.alarmaGeneral, propio?.alarma);
    if (sigueAlGeneral && cambioPendiente && cambio) {
      // Hasta la fecha del cambio, ese día sigue a SU hora resuelta (no a la de hoy, que puede ser propia de otro día).
      const delDia = { ...cambio, horaDeHoy: horaCorta(propio?.horaResuelta) ?? cambio.horaDeHoy };
      antelaciones.forEach((antes, n) => {
        const proxima = proximaConCambio(iso, antes, delDia, ahora);
        if (!proxima) return;
        pedidos.push({
          identificador: identificadorDelAvisoDelDia(entrada.habitoId, iso, n),
          diaIso: iso,
          minutosAntes: antes,
          horaDelDia: proxima.hora,
          disparo: { tipo: 'fecha', instanteMs: proxima.instanteMs },
          alarma,
        });
      });
      continue;
    }
    const hora = horaPropia ?? horaDeUnDiaSinHoraPropia(propio);
    if (!hora) continue;
    antelaciones.forEach((antes, n) => {
      pedidos.push({
        identificador: identificadorDelAvisoDelDia(entrada.habitoId, iso, n),
        diaIso: iso,
        minutosAntes: antes,
        horaDelDia: hora,
        disparo: disparoSemanal(iso, hora, antes),
        alarma,
      });
    });
  }
  if (afectados.size > 0) pedidos.push(...pedidosDeLasFechasPropias({ ...entrada, cambio }, vigentes, ahora));
  return { esquema: 'porDia', pedidos };
}

/**
 * Una firma estable del plan, para saber si lo que el teléfono tiene programado ya es lo que corresponde sin
 * tocar la librería. Dos planes con las mismas alarmas dan la misma firma, aunque se armen en otro orden.
 */
export function firmaDelPlan(plan: PlanDeAlarmas): string {
  if (plan.esquema === 'diario') return 'diario';
  return plan.pedidos
    .map(p => {
      const d = p.disparo;
      const cuando = d.tipo === 'semanal' ? `s${d.weekday}-${dos(d.hora)}:${dos(d.minuto)}` : `f${d.instanteMs}`;
      // Spec 009: cómo suena solo entra en la firma si no es lo de siempre, para que un plan de antes de la spec
      // (que ya tiene su firma guardada) siga siendo el mismo y no se rehaga sin motivo.
      const suena = esLaCombinacionPorDefecto(p.alarma) ? '' : `~${codigoDeLaCombinacion(p.alarma)}`;
      return `${p.identificador}@${cuando}/${p.horaDelDia}${suena}`;
    })
    .sort()
    .join('|');
}
