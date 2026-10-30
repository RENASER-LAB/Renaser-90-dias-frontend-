import { diaDelPlanDeLaFecha } from '../../training/utils/itemsDelDia';
import { minutosDeLaHora } from '../../training/utils/listaDelDia';

/**
 * A qué hora aparece la fila «Cierra tu día» (spec 017, decisión del dueño del 2026-10-29): **30 minutos antes de la
 * hora de Dormir de ese día**, y a las **21:30** si Dormir no tiene hora. Es la última fila de hoy. La calcula la app con
 * lo que Training ya lee de hoy; el servidor no impone ninguna hora (solo que el día sea el de hoy).
 *
 * Reglas, todas probadas en `__tests__/horaDelCierre.test.ts`:
 * - Dormir es el hábito con `systemKey === 'SLEEP'` (Despertar es `WAKE_UP`) que tiene registro hoy.
 * - **Sin Dormir hoy** —no le toca, o está pausado (la pausa se ve en `diasCatalogo`), o no tiene hora— vale 21:30.
 * - **Dormir pasada la medianoche** (00:10): 30 minutos antes sería ayer, así que la fila se ancla a las 00:00 de hoy.
 */

export const MINUTOS_ANTES_DE_DORMIR = 30;
export const HORA_DEL_CIERRE_SIN_DORMIR = '21:30';

/** Lo mínimo de un hábito de hoy que hace falta para saber cuándo se acuesta la persona. */
export interface HabitoParaElCierre {
  systemKey?: string | null;
  time: string;
  tieneTrackHoy: boolean;
  done: boolean;
  /** Los días en que el catálogo lo corre (una pausa de hoy lo deja en `false`). */
  diasCatalogo?: Readonly<Record<string, boolean>> | null;
}

function dosCifras(n: number): string {
  return String(n).padStart(2, '0');
}

function aHoraCorta(minutos: number): string {
  return `${dosCifras(Math.floor(minutos / 60))}:${dosCifras(minutos % 60)}`;
}

/** La hora de Dormir de hoy en minutos desde la medianoche, o `null` si hoy no hay Dormir con hora. */
export function minutosDeDormirHoy(habitos: readonly HabitoParaElCierre[], hoyIso: string): number | null {
  const diaDeHoy = diaDelPlanDeLaFecha(hoyIso);
  for (const h of habitos) {
    if (h.systemKey !== 'SLEEP' || !h.tieneTrackHoy) continue;
    // Pausado después de generarse el registro y sin hacer: hoy no lo va a hacer a su hora.
    if (!h.done && h.diasCatalogo != null && h.diasCatalogo[diaDeHoy] === false) continue;
    const minutos = minutosDeLaHora(h.time);
    if (minutos != null) return minutos;
  }
  return null;
}

/** `HH:mm` a la que aparece la fila de hoy. */
export function horaDelCierre(habitos: readonly HabitoParaElCierre[], hoyIso: string): string {
  const dormir = minutosDeDormirHoy(habitos, hoyIso);
  if (dormir === null) return HORA_DEL_CIERRE_SIN_DORMIR;
  return aHoraCorta(Math.max(0, dormir - MINUTOS_ANTES_DE_DORMIR));
}

/** ¿Ya es la hora de mostrar la fila? `ahoraMin` son los minutos desde la medianoche del teléfono. */
export function yaEsHoraDelCierre(hora: string, ahoraMin: number): boolean {
  const desde = minutosDeLaHora(hora);
  return desde != null && ahoraMin >= desde;
}
