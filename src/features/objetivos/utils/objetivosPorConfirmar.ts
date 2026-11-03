import type { EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';

/**
 * Los objetivos de 90 días que nacen del diagnóstico llegan «por confirmar» (spec 026): la persona los revisa, puede
 * reescribirlos UNA vez y, al confirmarlos, quedan fijos como cualquier otro (D-234). Aquí viven las reglas, sin React ni red.
 *
 * Lo decide el servidor: una fila `origin: DIAGNOSTICO` con `confirmed: false`. Si el servidor es anterior (no manda ninguno de
 * los dos campos) todo se lee como confirmado y nada aparece «por confirmar» por error.
 */

/** Lo que cabe en un objetivo: el mismo tope que pone el servidor (y que dice el contador del diagnóstico). */
export const MAXIMO_DEL_OBJETIVO = 500;

/** `true` para un objetivo del diagnóstico que la persona todavía no confirmó. */
export function estaPorConfirmar(roca: Pick<RocaMaestraApi, 'origin' | 'confirmed'> | null | undefined): boolean {
  return roca != null && roca.origin === 'DIAGNOSTICO' && roca.confirmed === false;
}

/** Los objetivos por confirmar, en el orden de los ejes que se le pasa (el de la pantalla: el principal primero). */
export function rocasPorConfirmar(rocas: readonly RocaMaestraApi[], ordenDeEjes: readonly EjeObjetivo[]): RocaMaestraApi[] {
  const pendientes = rocas.filter(estaPorConfirmar);
  const posicion = (eje: EjeObjetivo) => {
    const i = ordenDeEjes.indexOf(eje);
    return i < 0 ? ordenDeEjes.length : i;
  };
  return [...pendientes].sort((a, b) => posicion(a.eje) - posicion(b.eje));
}

export type ProblemaDelObjetivo = 'vacio' | 'largo';

/**
 * ¿Se puede confirmar este texto? Nunca se recorta en silencio: si pasa del tope se dice y no se deja confirmar hasta que la
 * persona lo acorte (un objetivo que ya llegó más largo del diagnóstico tampoco se corta solo).
 */
export function problemaDelObjetivo(texto: string): ProblemaDelObjetivo | null {
  const limpio = texto.trim();
  if (limpio.length === 0) return 'vacio';
  if (limpio.length > MAXIMO_DEL_OBJETIVO) return 'largo';
  return null;
}

export interface ObjetivoParaConfirmar {
  eje: EjeObjetivo;
  objetivo: string;
}

/** Lo que se manda a `PUT /rocks/master/{eje}`: solo el texto, sin meta (el servidor lo marca confirmado). */
export function objetivosParaConfirmar(
  pendientes: readonly RocaMaestraApi[],
  borradores: Partial<Record<EjeObjetivo, string>>,
): ObjetivoParaConfirmar[] {
  return pendientes.map(roca => ({ eje: roca.eje, objetivo: (borradores[roca.eje] ?? roca.objetivo).trim() }));
}

/** El primer problema entre los objetivos por confirmar (o `null`): decide si el botón «Confirmar mis objetivos» se puede tocar. */
export function primerProblema(items: readonly ObjetivoParaConfirmar[]): { eje: EjeObjetivo; problema: ProblemaDelObjetivo } | null {
  for (const item of items) {
    const problema = problemaDelObjetivo(item.objetivo);
    if (problema) return { eje: item.eje, problema };
  }
  return null;
}
