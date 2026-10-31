import { accionQueSigueHoy } from '../../objetivos/utils/accionesDeHoy';
import type { RocaDiariaApi } from '../../objetivos/types/objetivos.types';
import type { EstadoMapa } from '../../mapa-renacimiento/tipos';

/**
 * Qué muestra la tarjeta de acciones de Hoy (2026-10-31, pedido del dueño: «mismo diseño, no las mismas palabras»).
 *
 * Lógica pura, sin React ni red. Un solo esqueleto con cuatro contenidos:
 *
 *  - `accion`: la que sigue hoy, con la misma regla de Plan (`accionQueSigueHoy`: la primera sin cumplir en orden de hora, sin
 *    contar las que esperan a la verde). **Manda sobre todo lo demás**: si hay una acción que hacer, se muestra.
 *  - `todo-cumplido`: hay acciones hoy y todas están cumplidas.
 *  - `mapa`: no hay acciones y el Mapa de Renacimiento todavía no está hecho (el objetivo de 90 días nace de él). Solo con el
 *    estado CONFIRMADO: un teléfono nuevo dice «no iniciado» de alguien que ya lo terminó, y afirmar lo contrario sería un
 *    dato inventado.
 *  - `sin-acciones`: no hay acciones agendadas hoy (con el Mapa activo, o en un build que no lo ofrece).
 *
 * `null` = todavía no se sabe (no se leyeron las acciones, o falta saber el Mapa): la tarjeta no se dibuja, sin parpadeo.
 */
export type VistaDeLaAccionDeHoy =
  | { tipo: 'accion'; accion: RocaDiariaApi }
  | { tipo: 'todo-cumplido' }
  | { tipo: 'mapa' }
  | { tipo: 'sin-acciones' };

export interface LecturaDelMapaParaHoy {
  /** El build ofrece el Mapa (`mapaHabilitado`). Sin él, el Mapa no se le pide a nadie. */
  habilitado: boolean;
  estado: EstadoMapa | null;
  confirmado: boolean;
}

export function vistaDeLaAccionDeHoy(entrada: {
  /** `GET /rocks/today`; `null` = todavía no llegó (o falló la primera lectura). */
  rocas: readonly RocaDiariaApi[] | null;
  mapa: LecturaDelMapaParaHoy;
  /** Minutos desde la medianoche, en la hora del teléfono. */
  ahoraMin: number;
}): VistaDeLaAccionDeHoy | null {
  const { rocas, mapa, ahoraMin } = entrada;
  if (rocas === null) return null;

  if (rocas.length > 0) {
    const sigue = accionQueSigueHoy(rocas, ahoraMin);
    return sigue ? { tipo: 'accion', accion: sigue.accion } : { tipo: 'todo-cumplido' };
  }

  if (!mapa.habilitado) return { tipo: 'sin-acciones' };
  if (mapa.estado === null) return null;
  if (mapa.estado === 'activo') return { tipo: 'sin-acciones' };
  return mapa.confirmado ? { tipo: 'mapa' } : null;
}
