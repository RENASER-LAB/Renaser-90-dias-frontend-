import {
  hayFechasVigentes,
  identificadorDelAvisoDelDia,
  isoDe,
  usaEsquemaPorDia,
  valoresDelDia,
  type DiaIso,
} from './alarmasPorDia';
import { type CombinacionDeAlarma } from './combinacionDeAlarma';
import { fechaCompacta, type EntradaDeRepeticiones } from './repeticionesDeAlarma';

/**
 * El puente de un hábito cumplido (issue #33, 2026-10-27): qué alarmas de FECHA reemplazan a las que se repiten
 * mientras el resto del día de hoy no debe sonar. Pura: no toca la librería ni el almacenamiento (eso es
 * `recordatoriosDeHabito.ts`).
 *
 * ## El bug que cierra
 *
 * Una alarma `DAILY` (o `WEEKLY`, en el esquema por día) no se puede «saltar solo hoy»: cancelarla borra la de todos
 * los días que siguen, y dejarla puesta la deja sonar. Con el hábito ya cumplido —Despertar a las 06:00—, sus avisos que
 * faltaban (la de las 06:30, o los de 10 y 0 min cuando se cumple tras el de 30) sonaban igual.
 *
 * ## Qué es el puente
 *
 * Una alarma de FECHA por cada aviso de los próximos 7 días (mañana en adelante), con el mismo texto, canal y datos que
 * tendría la repetida. Hoy no tiene ninguna: ahí está el silencio. Cancelar una de fecha es exacto, como las
 * repeticiones de la spec 009.
 *
 * ## «Hoy» y el día del hábito
 *
 * Los avisos se atribuyen al día del HÁBITO, no al del instante en que suenan: un hábito a las 00:10 con aviso de 30
 * min suena a las 23:40 del día anterior y es un aviso del día siguiente. Cumplir el hábito hoy silencia los avisos del
 * hábito de hoy, nunca el de las 23:40 de esta noche, que es el de mañana. Es la misma cuenta que `planDeRepeticiones`
 * (`horaDelDia`, `combinacionDelDia`), y «hoy» es el de la hora del teléfono, como las alarmas.
 *
 * ## El identificador
 *
 * Es la etiqueta del push de respaldo del servidor, para que si llegan los dos quede uno solo en la bandeja (spec 007,
 * FR-014): en el esquema por día, `habito-{id}-d{iso}-{n}` (cada día de la semana tiene el suyo, y en una ventana de 7
 * días ninguno se repite); en el diario, el primer aviso del primer día lleva `habito-{id}-inicio` y los demás
 * `habito-{id}-pte-{AAAAMMDD}-{n}` (una alarma de fecha por día no puede compartir identificador). Con eso, volver al
 * esquema normal (`programar`) con el mismo identificador REEMPLAZA la alarma en vez de duplicarla.
 *
 * ## Las fechas propias (spec 028)
 *
 * Si el hábito tiene fechas con cambio «solo esta semana» (`entrada.fechas`), el puente lee de cada día lo mismo que el plan
 * de alarmas (`valoresDelDia`): la hora, el aviso, el apagado y «cómo suena» de la fecha propia mandan sobre los del día de
 * la semana. Así cumplir un hábito el día de un cambio no devuelve la hora de siempre. Con fechas vigentes el hábito va por
 * día, y los identificadores son los del esquema por día.
 *
 * ## Cuándo hace falta
 *
 * Solo si a hoy todavía le queda algún aviso por sonar (`quedanHoy`): si ya sonaron todos, no hay nada que silenciar
 * y no se gasta el puente.
 */

/** Cuántos días por delante cubre el puente, sin contar hoy. */
export const DIAS_DEL_PUENTE = 7;

export interface PedidoDelPuente {
  identificador: string;
  /** El día del HÁBITO, `AAAAMMDD`. */
  fecha: string;
  diaIso: DiaIso;
  /** Su posición entre los avisos de ese día (0 = el más temprano). */
  n: number;
  minutosAntes: number;
  /** `HH:mm` a la que va el hábito ese día: lo que dice el cuerpo del aviso («Te toca a las …»). */
  horaDelDia: string;
  /** Cuándo suena. */
  instanteMs: number;
  /** Cómo suena ESE día: por qué canal sale. */
  alarma: CombinacionDeAlarma;
}

export interface PlanDelPuente {
  /** Cuántos avisos del hábito de HOY todavía no sonaron. Con 0 no hace falta puente. */
  quedanHoy: number;
  /** Las alarmas de fecha de los próximos `DIAS_DEL_PUENTE` días. */
  pedidos: PedidoDelPuente[];
}

/** `habito-{id}-pte-{AAAAMMDD}-{n}`: una alarma del puente en el esquema diario. */
export function identificadorDelPuente(habitoId: string, fecha: string, n: number): string {
  return `habito-${habitoId}-pte-${fecha}-${n}`;
}

/**
 * El puente del hábito desde `ahora`. La entrada es la misma que la del plan de alarmas y la de las repeticiones: la
 * hora general, el aviso general, lo propio de cada día, cómo suena y un cambio de hora pendiente.
 */
export function planDelPuente(entrada: EntradaDeRepeticiones, ahora: Date): PlanDelPuente {
  const porDia = usaEsquemaPorDia(entrada.dias) || hayFechasVigentes(entrada.fechas, ahora);
  const pedidos: PedidoDelPuente[] = [];
  let quedanHoy = 0;
  let yaTieneElInicio = false;
  for (let i = 0; i <= DIAS_DEL_PUENTE; i++) {
    const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, 12, 0, 0, 0);
    const iso = isoDe(dia);
    const { activo, avisos, hora, alarma } = valoresDelDia(entrada, dia);
    if (!activo) continue;
    if (avisos.length === 0) continue;
    if (!hora) continue;
    const [h, m] = hora.split(':').map(Number);
    const fecha = fechaCompacta(dia);
    avisos.forEach((antes, n) => {
      const instanteMs = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m - antes, 0, 0).getTime();
      if (instanteMs <= ahora.getTime()) return;
      if (i === 0) {
        quedanHoy++;
        return;
      }
      let identificador: string;
      if (porDia) {
        identificador = identificadorDelAvisoDelDia(entrada.habitoId, iso, n);
      } else if (n === 0 && !yaTieneElInicio) {
        // El primer aviso que va a sonar mañana en adelante comparte etiqueta con el push de respaldo del servidor.
        yaTieneElInicio = true;
        identificador = `habito-${entrada.habitoId}-inicio`;
      } else {
        identificador = identificadorDelPuente(entrada.habitoId, fecha, n);
      }
      pedidos.push({ identificador, fecha, diaIso: iso, n, minutosAntes: antes, horaDelDia: hora, instanteMs, alarma });
    });
  }
  return { quedanHoy, pedidos };
}

/**
 * ¿Cómo tiene que estar el puente de este hábito? `hoy` si ya se cumplió hoy y todavía le quedan avisos por sonar; `null`
 * si no hace falta (no se cumplió hoy, o ya sonaron todos). Es la parte pura de la regla «el puente está armado si y solo si
 * el hábito se cumplió hoy y le quedan avisos»: quien la compara con lo que el teléfono tiene (la nota) sabe si hay que
 * armarlo, desarmarlo o dejarlo.
 */
export function puenteQueCorresponde(
  diaDelCumplido: string | null | undefined,
  entrada: EntradaDeRepeticiones,
  ahora: Date,
): string | null {
  const hoy = fechaCompacta(ahora);
  if (diaDelCumplido !== hoy) return null;
  return planDelPuente(entrada, ahora).quedanHoy > 0 ? hoy : null;
}
