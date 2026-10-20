import { weekdayDeExpo, type DiaIso } from '../../habits/notificaciones/utils/alarmasPorDia';
import type { CombinacionDeAlarma } from '../../habits/notificaciones/utils/combinacionDeAlarma';
import {
  alarmaGeneral,
  hayDiasDistintosEnElDiario,
  resolverLaSemana,
  type PreferenciasDeAcciones,
} from './preferenciasPorDia';

/**
 * Qué alarmas lleva el recordatorio diario «Recordarme mis acciones del día» (spec 010). Pura: no toca la librería de
 * avisos ni el almacenamiento.
 *
 * ## Dos esquemas, el mismo criterio que los hábitos (008, research R4)
 *
 * - **`diario`**: ningún día tiene el recordatorio distinto del general (encendido, hora o cómo suena). Es UNA alarma
 *   `DAILY`, exactamente la de siempre: quien no usa días distintos no ve ningún cambio.
 * - **`porDia`**: algún día es distinto. Una alarma `WEEKLY` por cada día que lo tiene encendido, a la hora de ESE día.
 *   Identificadores estables `acciones-diario-d{iso}` (1 = lunes … 7 = domingo): programar de nuevo el mismo día
 *   REEMPLAZA la alarma, no la duplica.
 *
 * El disparador `WEEKLY` de `expo-notifications` numera al revés que el resto del proyecto (1 = DOMINGO … 7 = sábado):
 * `weekdayDeExpo` hace la traducción en un solo lugar.
 */

export interface PedidoDelDiario {
  identificador: string;
  /** El día de la semana, ISO. */
  diaIso: DiaIso;
  /** El día tal como lo numera `expo-notifications` (1 = domingo). */
  weekday: number;
  hora: number;
  minuto: number;
  /** `HH:mm`, para el texto. */
  horaHHmm: string;
  /** Cómo suena ESE día. */
  alarma: CombinacionDeAlarma;
}

export type PlanDelDiario =
  | { esquema: 'ninguno' }
  | { esquema: 'diario'; hora: string; alarma: CombinacionDeAlarma }
  | { esquema: 'porDia'; pedidos: PedidoDelDiario[] };

/** `acciones-diario-d{iso}`: el id de la alarma semanal del recordatorio diario de ese día. */
export function identificadorDelDiarioDelDia(iso: DiaIso): string {
  return `acciones-diario-d${iso}`;
}

export function planDelRecordatorioDiario(prefs: PreferenciasDeAcciones): PlanDelDiario {
  if (!hayDiasDistintosEnElDiario(prefs)) {
    return prefs.diarioActivo
      ? { esquema: 'diario', hora: prefs.horaDiaria, alarma: alarmaGeneral(prefs) }
      : { esquema: 'ninguno' };
  }
  const pedidos: PedidoDelDiario[] = resolverLaSemana(prefs)
    .filter(d => d.diarioActivo)
    .map(d => {
      const [hora, minuto] = d.horaDiaria.split(':').map(Number);
      return {
        identificador: identificadorDelDiarioDelDia(d.iso),
        diaIso: d.iso,
        weekday: weekdayDeExpo(d.iso),
        hora,
        minuto,
        horaHHmm: d.horaDiaria,
        alarma: d.alarma,
      };
    });
  return { esquema: 'porDia', pedidos };
}

/**
 * Una firma de las alarmas del recordatorio diario. Si no cambió, las que están puestas ya son las que corresponden y
 * no hay que tocarlas (cambiar solo el aviso de un día no mueve el recordatorio diario).
 */
export function huellaDelDiario(prefs: PreferenciasDeAcciones): string {
  return JSON.stringify(planDelRecordatorioDiario(prefs));
}
