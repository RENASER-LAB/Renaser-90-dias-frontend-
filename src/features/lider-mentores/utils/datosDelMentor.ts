import type { FichaApi, IndicadoresApi } from '../api/liderMentoresSchemas';
import { nombreDelMes } from './lecturaDeMentores';

/**
 * Lo que la ficha de un mentor dice en su sección «Como mentor» (spec 056 FR-024), en una cifra corta. Un bloque que el servidor no pudo leer
 * se dice («No se pudo leer»), nunca como cero; lo que no llegó y no importa, no se dibuja (`null`).
 *
 * **No hay «evaluaciones que debe».** `evaluation.expected` y `evaluation.delivered` del servidor son las obligaciones de evidencia de los aprendices del
 * mentor en el mes (`CalculoCumplimiento`: la base de su porcentaje), no lo que el mentor debe entregar: «esperadas − entregadas» daba cientos de
 * «pendientes» para un mentor con 9 aprendices (E2E del 18/11). Sin un dato confiable de lo que de verdad debe, la fila no se muestra.
 */
const NO_SE_PUDO = 'No se pudo leer';
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «Mentor N1 · desde junio de 2026». */
export function subtituloDelMentor(ficha: Pick<FichaApi, 'profile'>): string {
  const nivel = ficha.profile?.level ? `Mentor ${ficha.profile.level}` : 'Mentor';
  const desde = ficha.profile?.since ? new Date(ficha.profile.since) : null;
  if (!desde || Number.isNaN(desde.getTime())) return nivel;
  return `${nivel} · desde ${nombreDelMes(`${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}`, true)}`;
}

/** Su evaluación del mes: «62 %», o por qué no hay número. */
export function evaluacionCorta(m: IndicadoresApi): string {
  const e = m.evaluation;
  if (e.source !== 'OK') return NO_SE_PUDO;
  if (e.state === 'CALCULADA' && e.percentage !== null) return `${Math.round(e.percentage)} %`;
  if (e.state === 'SIN_MUESTRA') return 'Sin datos';
  return 'Sin grupo';
}

/** Sus consultas sin responder con los días de la más vieja: «1 · 5 días», «2 · hoy», «Ninguna». */
export function consultasSinResponder(m: IndicadoresApi): string | null {
  const a = m.attention;
  if (a.source !== 'OK') return NO_SE_PUDO;
  if (a.open === null) return null;
  if (a.open === 0) return 'Ninguna';
  if (a.oldestOpenDays === null) return String(a.open);
  return `${a.open} · ${a.oldestOpenDays <= 0 ? 'hoy' : plural(a.oldestOpenDays, 'día', 'días')}`;
}

/** Cuántos aprendices tiene un grupo: «9 aprendices», «1 aprendiz». */
export const aprendicesEnPalabras = (n: number) => plural(n, 'aprendiz', 'aprendices');
