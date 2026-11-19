import type { EntradaDelReporteApi, ReporteApi } from '../api/liderMentoresSchemas';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';

/** El umbral del reporte del mes (y de «Por resolver»): por debajo de 60 % un mentor necesita atención. */
export const UMBRAL_DE_LA_EVALUACION = 60;

/** Su evaluación del mes como número, o `null` si no hay (no se calculó o no hay muestra): nunca un cero inventado. */
export function evaluacionDeLaEntrada(e: EntradaDelReporteApi): number | null {
  const ev = e.mentor.evaluation;
  return ev.source === 'OK' && ev.state === 'CALCULADA' && ev.percentage !== null ? ev.percentage : null;
}

/** El promedio de los mentores con evaluación y cuántos están por debajo del umbral. Sin ninguno con evaluación, `promedio` es `null`. */
export function resumenDelReporte(r: Pick<ReporteApi, 'ranked'>): { promedio: number | null; conEvaluacion: number; debajo: number } {
  const cifras = r.ranked.map(evaluacionDeLaEntrada).filter((x): x is number => x !== null);
  if (cifras.length === 0) return { promedio: null, conEvaluacion: 0, debajo: 0 };
  return { promedio: cifras.reduce((a, b) => a + b, 0) / cifras.length, conEvaluacion: cifras.length, debajo: cifras.filter(x => x < UMBRAL_DE_LA_EVALUACION).length };
}

/** El color del borde de un mentor en el ranking: el de su semáforo; sin semáforo, neutro. */
export function colorDeLaEntrada(e: EntradaDelReporteApi): ColorSemaforo {
  const s = e.mentor.semaforo.source === 'OK' ? e.mentor.semaforo.summary : null;
  const color = s?.color;
  return color === 'ROJO' || color === 'AMARILLO' || color === 'VERDE' ? color : 'SIN_DATOS';
}

/** «62 % · 1 consulta respondida» o «0 % · 1 consulta sin responder»: lo que cuenta de cada mentor en el mes, en una línea. */
export function lineaDeLaEntrada(e: EntradaDelReporteApi): string {
  const nota = evaluacionDeLaEntrada(e);
  const a = e.mentor.attention;
  const partes: string[] = [];
  if (nota !== null) partes.push(`${Math.round(nota)} %`);
  if (a.source === 'OK' && a.answered !== null) partes.push(a.answered === 0 ? 'ninguna consulta respondida' : `${a.answered} ${a.answered === 1 ? 'consulta respondida' : 'consultas respondidas'}`);
  if (a.source === 'OK' && a.open) partes.push(`${a.open} sin responder`);
  const texto = partes.join(' · ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
