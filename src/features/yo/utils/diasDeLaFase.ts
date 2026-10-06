import { descripcionDeFase } from '../../home/hooks/useResumenHome';

export interface DiasDeLaFase {
  /** El día dentro de la fase, desde 1. */
  dia: number;
  /** Cuántos días tiene la fase. */
  total: number;
}

/**
 * «Día 8 de 27 de esta fase». Los cortes salen de `FASES_EN_ORDEN` (`useResumenHome`), la única tabla de
 * fases de la app, que a su vez copia los de `FasePrograma` del backend (la II arranca el 8, la III el
 * 35, la IV el 65); acá no se escribe ningún día. El backend todavía no manda el inicio y el fin de la
 * fase en `/home`; cuando lo haga, cambia esta función y nada más.
 *
 * Con una fase desconocida o sin el día todavía devuelve `null`: la tarjeta no dibuja la barra en vez
 * de inventar un avance. El día se acota a la fase (un ajuste de días no desborda la barra).
 */
export function diasDeLaFase(fase: string | null | undefined, diaDelPrograma: number | null | undefined): DiasDeLaFase | null {
  const descripcion = descripcionDeFase(fase);
  if (!descripcion || diaDelPrograma == null || !Number.isFinite(diaDelPrograma)) return null;
  const total = descripcion.ultimoDia - descripcion.primerDia + 1;
  const dia = Math.min(total, Math.max(1, diaDelPrograma - descripcion.primerDia + 1));
  return { dia, total };
}
