import type { InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import { esViernes, VIGENTE, viernesHasta } from '../../semaforo/utils/semanasDelSemaforo';

/**
 * De qué semana arranca la lista de un grupo para el líder y con qué viernes se abre la ficha de una persona
 * (spec 005; contrato `leadership-cumplimiento.md`, «La semana: qué devuelve cada una sin `semanaHasta`»).
 *
 * Son DOS «por defecto» distintos y la app no los puede confundir:
 *
 * - El **resumen por grupos** (`/semaforo/groups`) sin fecha da los últimos 7 días que terminan ayer.
 * - La **lista del grupo** del líder sin fecha da la ÚLTIMA SEMANA CERRADA (sábado→viernes).
 * - La **ficha** sin fecha da la semana EN CURSO. Por eso, al abrirla desde la lista, se le pasa siempre el
 *   `hasta` de la lista: así las dos hablan de los mismos días.
 */

/**
 * La posición con que se abre la lista de un grupo desde el resumen: la misma semana que se miraba, pero con el
 * ancla de la LISTA. El ancla del resumen es «ayer» (un domingo, un lunes…); el de la lista es el viernes de la
 * última semana cerrada, que es lo que el servidor devuelve sin fecha. Con el ancla del resumen, «siguiente»
 * desde la semana anterior llevaría a la última cerrada dos veces (una con fecha y otra «vigente»).
 *
 * El viernes de la última cerrada sale de la misma regla del servidor (`previousOrSame(FRIDAY)` de ayer), y la
 * lista lo reemplaza con el `hasta` de su primera respuesta: esto solo evita un paso repetido mientras tanto.
 */
export function inicioDeLaListaDelLider(inicio: InicioSemanal): InicioSemanal {
  const ultimaCerrada = inicio.hastaVigente ? viernesHasta(inicio.hastaVigente) : null;
  if (!ultimaCerrada) return inicio;
  const yaEsLaPorDefecto = inicio.posicion.modo === 'semana' && inicio.posicion.semanaHasta >= ultimaCerrada;
  return { posicion: yaEsLaPorDefecto ? VIGENTE : inicio.posicion, hastaVigente: ultimaCerrada };
}

/**
 * El viernes con que se abre la ficha: el `hasta` de la lista, siempre. Si no fuera viernes (un backend que
 * todavía lee otra ventana) no se manda: el servidor respondería 400 en lugar de una semana.
 */
export function viernesParaLaFicha(hastaDeLaLista: string | null | undefined): string | null {
  return hastaDeLaLista && esViernes(hastaDeLaLista) ? hastaDeLaLista : null;
}
