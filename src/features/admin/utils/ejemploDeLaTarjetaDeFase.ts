import { FASES_EN_ORDEN, type ClaveDeFase } from '../../home/hooks/useResumenHome';
import type { DiasDeLaFase } from '../../yo/utils/diasDeLaFase';

export interface EjemploDeLaTarjeta {
  clave: ClaveDeFase;
  numero: number;
  nombreDeLaFase: string;
  diasDeLaFase: DiasDeLaFase;
  diaDelPrograma: number;
}

/**
 * Con qué días se dibuja la vista previa: un día cualquiera de esa fase (a un tercio de ella), solo para
 * que se vea la barra con algo de avance. Los cortes son los de la tabla de fases de la app.
 */
export function ejemploDeLaTarjetaDeFase(numero: number): EjemploDeLaTarjeta | null {
  const fase = FASES_EN_ORDEN.find(f => f.numero === numero);
  if (!fase) return null;
  const total = fase.ultimoDia - fase.primerDia + 1;
  const dia = Math.max(1, Math.round(total / 3));
  return { clave: fase.clave, numero, nombreDeLaFase: fase.nombre, diasDeLaFase: { dia, total }, diaDelPrograma: fase.primerDia + dia - 1 };
}
