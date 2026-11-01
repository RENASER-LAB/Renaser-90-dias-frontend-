import type { PreguntaDelDiagnostico, SeccionDelDiagnostico } from '../types/diagnostico.types';
import { respuestaDe, type RespuestaEnEdicion, type ValoresDelDiagnostico } from './respuestasEnEdicion';

/**
 * Qué preguntas se muestran (spec 026, «se muestra solo si»), sin React.
 *
 * - Una pregunta con `seMuestraSi` aparece solo si la respuesta de la pregunta indicada ES ese `valor` (en casillas, si lo
 *   INCLUYE). Es recursivo: si la pregunta de la que depende está oculta, ella también.
 * - Las ocultas no se piden ni cuentan como pendientes, pero sus respuestas guardadas NO se borran: si la condición vuelve a
 *   cumplirse, reaparecen con lo que ya se había escrito.
 * - Una condición que nombra una pregunta que no está en esta versión (otra formación, o quitada) no se puede cumplir: la
 *   pregunta queda oculta. El servidor la trata igual: no la exige.
 */

/** ¿La respuesta de la pregunta `padre` es el `valor` que pide la condición? */
export function coincideConLaCondicion(padre: PreguntaDelDiagnostico, e: RespuestaEnEdicion, valor: string): boolean {
  switch (padre.tipo) {
    case 'SELECCION_MULTIPLE':
      return e.valores.includes(valor);
    case 'CASILLA':
      return e.marcada && (valor === 'true' || padre.opciones.some(o => o.valor === valor));
    case 'ESCALA':
      return e.escala !== null && String(e.escala) === valor;
    case 'CUADRICULA':
      return false;
    default:
      return e.texto.trim() === valor;
  }
}

export function preguntasPorId(secciones: readonly SeccionDelDiagnostico[]): Map<number, PreguntaDelDiagnostico> {
  const mapa = new Map<number, PreguntaDelDiagnostico>();
  for (const seccion of secciones) for (const pregunta of seccion.preguntas) mapa.set(pregunta.id, pregunta);
  return mapa;
}

/** Los ids de las preguntas que se muestran con estas respuestas. */
export function idsVisibles(secciones: readonly SeccionDelDiagnostico[], valores: ValoresDelDiagnostico): Set<number> {
  const porId = preguntasPorId(secciones);
  const memo = new Map<number, boolean>();
  const enCurso = new Set<number>();

  const visible = (id: number): boolean => {
    const conocida = memo.get(id);
    if (conocida !== undefined) return conocida;
    const pregunta = porId.get(id);
    if (!pregunta) return false;
    const condicion = pregunta.seMuestraSi;
    if (!condicion) {
      memo.set(id, true);
      return true;
    }
    /* Un ciclo («A depende de B y B de A») no se puede cumplir nunca: oculta, sin colgar la pantalla. */
    if (enCurso.has(id)) return false;
    enCurso.add(id);
    const padre = porId.get(condicion.preguntaId);
    const resultado =
      padre !== undefined &&
      visible(padre.id) &&
      coincideConLaCondicion(padre, respuestaDe(valores, padre.id), condicion.valor);
    enCurso.delete(id);
    memo.set(id, resultado);
    return resultado;
  };

  const ids = new Set<number>();
  for (const id of porId.keys()) if (visible(id)) ids.add(id);
  return ids;
}

/** Las secciones solo con sus preguntas visibles; una sección que se queda sin ninguna se salta, sin huecos. */
export function seccionesVisibles(
  secciones: readonly SeccionDelDiagnostico[],
  valores: ValoresDelDiagnostico,
): SeccionDelDiagnostico[] {
  const visibles = idsVisibles(secciones, valores);
  return secciones.flatMap(seccion => {
    const preguntas = seccion.preguntas.filter(p => visibles.has(p.id));
    return preguntas.length > 0 ? [{ ...seccion, preguntas }] : [];
  });
}
