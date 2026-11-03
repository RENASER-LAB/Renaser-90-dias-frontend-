import { accionQueSigueHoy } from '../../objetivos/utils/accionesDeHoy';
import { EJES } from '../../objetivos/types/objetivos.types';
import type { RocaDiariaApi } from '../../objetivos/types/objetivos.types';
import type { ObjetivosParaHoy } from '../../objetivos/hooks/useObjetivosDeNoventaDias';

/**
 * Qué muestra la tarjeta de acciones de Hoy (2026-10-31, pedido del dueño: «mismo diseño, no las mismas palabras»).
 *
 * Lógica pura, sin React ni red. Un solo esqueleto con cinco contenidos:
 *
 *  - `accion`: la que sigue hoy, con la misma regla de Plan (`accionQueSigueHoy`: la primera sin cumplir en orden de hora, sin
 *    contar las que esperan a la verde). **Manda sobre todo lo demás**: si hay una acción que hacer, se muestra.
 *  - `todo-cumplido`: hay acciones hoy y todas están cumplidas.
 *  - `por-confirmar` (spec 026): no hay acciones y hay objetivos de 90 días que nacieron del diagnóstico y la persona no confirmó.
 *    «Confirma tus objetivos de 90 días» lleva a Plan.
 *  - `sin-objetivos` (spec 026): no hay acciones y no tiene sus tres objetivos de 90 días (la semana se arma a partir de ellos).
 *    «Define tu objetivo de 90 días en Plan» lleva a Plan. Sin diagnóstico ni Mapa, así se llega a ellos.
 *  - `sin-acciones`: tiene sus objetivos y no hay acciones agendadas hoy.
 *
 * `null` = todavía no se sabe (no se leyeron las acciones, o falta la primera lectura de los objetivos): la tarjeta no se
 * dibuja, sin parpadeo. Si la lectura de los objetivos FALLÓ (sin red, un servidor anterior) no se afirma nada de ellos y se cae
 * en `sin-acciones`.
 *
 * > **Corregido 2026-10-31 (spec 026).** Antes había un estado `mapa` («Haz tu Mapa de Renacimiento»); el Mapa se retiró.
 */
export type VistaDeLaAccionDeHoy =
  | { tipo: 'accion'; accion: RocaDiariaApi }
  | { tipo: 'todo-cumplido' }
  | { tipo: 'por-confirmar'; cantidad: number }
  | { tipo: 'sin-objetivos' }
  | { tipo: 'sin-acciones' };

export function vistaDeLaAccionDeHoy(entrada: {
  /** `GET /rocks/today`; `null` = todavía no llegó (o falló la primera lectura). */
  rocas: readonly RocaDiariaApi[] | null;
  objetivos: ObjetivosParaHoy;
  /** Minutos desde la medianoche, en la hora del teléfono. */
  ahoraMin: number;
}): VistaDeLaAccionDeHoy | null {
  const { rocas, objetivos, ahoraMin } = entrada;
  if (rocas === null) return null;

  if (rocas.length > 0) {
    const sigue = accionQueSigueHoy(rocas, ahoraMin);
    return sigue ? { tipo: 'accion', accion: sigue.accion } : { tipo: 'todo-cumplido' };
  }

  if (objetivos.estado === 'cargando') return null;
  if (objetivos.estado === 'error') return { tipo: 'sin-acciones' };
  if (objetivos.porConfirmar > 0) return { tipo: 'por-confirmar', cantidad: objetivos.porConfirmar };
  if (objetivos.total < EJES.length) return { tipo: 'sin-objetivos' };
  return { tipo: 'sin-acciones' };
}
