import { MESES } from '../../../components/fechaEnRuedas/logicaDeFecha';
import type { LecturaDelDiagnostico, PreguntaLeida } from '../types/diagnostico.types';
import { SIN_RESPUESTA } from './textosDelDiagnostico';

/**
 * Cómo se lee una respuesta en la lectura del diagnóstico (spec 026, §4), sin React: lo que respondió la persona, en renglones.
 * Lo usan la propia persona (Yo → Mi diagnóstico) y quien la acompaña (las fichas del mentor, el líder y Administración).
 */

/** Los renglones de la respuesta de una pregunta: un texto, una lista de valores o una fila por cada fila de la cuadrícula. */
export function renglonesDeLaRespuesta(pregunta: PreguntaLeida): string[] {
  const r = pregunta.respuesta;
  if (!r) return [];
  const renglones: string[] = [];
  const texto = r.texto?.trim();
  if (texto) renglones.push(texto);
  for (const valor of r.valores) if (valor.trim()) renglones.push(valor.trim());
  const tope = pregunta.escalaMax ?? null;
  for (const fila of r.filas) {
    renglones.push(`${fila.etiqueta} · ${tope !== null ? `${fila.valor} de ${tope}` : fila.valor}`);
  }
  return renglones;
}

/** ¿La persona respondió algo en esta pregunta? */
export function tieneRespuesta(pregunta: PreguntaLeida): boolean {
  return renglonesDeLaRespuesta(pregunta).length > 0;
}

/** Lo que oye el lector de pantalla de una pregunta con su respuesta. */
export function dichoDeLaPregunta(pregunta: PreguntaLeida): string {
  const renglones = renglonesDeLaRespuesta(pregunta);
  const respuesta = renglones.length > 0 ? renglones.join('. ') : SIN_RESPUESTA;
  return `${pregunta.texto}. ${pregunta.retirada ? 'Pregunta retirada. ' : ''}${respuesta}`;
}

/** Cuántas preguntas respondió, de las que se le hicieron. */
export function cuentaDeLaLectura(lectura: LecturaDelDiagnostico): { respondidas: number; total: number } {
  const preguntas = lectura.secciones.flatMap(s => s.preguntas);
  return { respondidas: preguntas.filter(tieneRespuesta).length, total: preguntas.length };
}

/** `2026-11-02T15:04:00Z` → «2 de noviembre de 2026», en la hora de Lima (la del programa). `null` si no es una fecha. */
export function fechaDeLaLectura(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const lima = new Date(ms - 5 * 60 * 60 * 1000);
  return `${lima.getUTCDate()} de ${MESES[lima.getUTCMonth()]} de ${lima.getUTCFullYear()}`;
}
