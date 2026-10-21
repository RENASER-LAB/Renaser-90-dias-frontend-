import type { DiaDelHabitoApi } from '../../types/habits.types';
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
  /** «Ahora», para el cambio con fecha. Por defecto, el reloj. */
  ahora?: Date;
}

/** De la más temprana a la más tardía (la mayor antelación primero), sin repetir ni valores inválidos. */
function ordenadas(antelaciones: readonly number[]): number[] {
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
 * El plan de alarmas del hábito. `{ esquema: 'diario' }` si ningún día es distinto (el llamador sigue como
 * siempre); si no, una alarma por día encendido y por antelación.
 */
export function planDeAlarmas(entrada: EntradaDelPlan): PlanDeAlarmas {
  if (!usaEsquemaPorDia(entrada.dias)) return { esquema: 'diario' };

  const propios = new Map<DiaIso, DiaPropio>((entrada.dias ?? []).map(d => [d.iso, d]));
  const ahora = entrada.ahora ?? new Date();
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
