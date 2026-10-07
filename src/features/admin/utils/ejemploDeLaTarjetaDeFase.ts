import { FASES_EN_ORDEN, type ClaveDeFase } from '../../home/hooks/useResumenHome';
import { faseEnCurso, type DiasDeLaFase } from '../../home/utils/faseEnCurso';

export interface EjemploDeLaTarjeta {
  clave: ClaveDeFase;
  numero: number;
  nombreDeLaFase: string;
  rango: string;
  diasDeLaFase: DiasDeLaFase;
  diaDelPrograma: number;
}

/**
 * Con qué días se dibuja la vista previa: un día cualquiera de esa fase (a un tercio de ella), solo para
 * que se vea la barra con algo de avance. Los cortes son los de la tabla de fases de la app.
 */
export function ejemploDeLaTarjetaDeFase(numero: number): EjemploDeLaTarjeta | null {
  const delaTabla = FASES_EN_ORDEN.find(f => f.numero === numero);
  if (!delaTabla) return null;
  const diaDelPrograma = delaTabla.primerDia + Math.max(1, Math.round((delaTabla.ultimoDia - delaTabla.primerDia + 1) / 3)) - 1;
  /* La misma cuenta que Yo y Plan: la vista previa no puede mostrar otros días que la tarjeta real. */
  const fase = faseEnCurso(delaTabla.clave, diaDelPrograma);
  if (!fase?.diasDeLaFase) return null;
  return { clave: fase.clave, numero, nombreDeLaFase: fase.nombre, rango: fase.rango, diasDeLaFase: fase.diasDeLaFase, diaDelPrograma };
}
