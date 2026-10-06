import { descripcionDeFase, FASES_EN_ORDEN, type ClaveDeFase } from '../../home/hooks/useResumenHome';
import { ANIMAL_DE_FASE, type AnimalDeFase } from '../data/animalesDeFase';

export type EstadoDeFase = 'lograda' | 'actual' | 'futura';

export interface FaseConAnimal {
  clave: ClaveDeFase;
  numero: number;
  nombre: string;
  animal: AnimalDeFase;
  estado: EstadoDeFase;
}

/**
 * Las cuatro fases con su animal y en qué punto está quien mira.
 *
 * La fase actual **no se calcula acá**: llega del resumen de Hoy/Yo (`resumen.fase`). Lo único que se
 * hace es comparar números de fase, así que la regla de los días sigue viviendo en el backend. Con una
 * fase desconocida o sin respuesta todavía (`null`), ninguna se marca como lograda ni como actual: es
 * preferible no revelar nada que inventar un avance.
 */
export function estadoDeLasFases(faseActual: string | null | undefined): FaseConAnimal[] {
  const numeroActual = descripcionDeFase(faseActual)?.numero ?? null;
  return FASES_EN_ORDEN.map(fase => ({
    clave: fase.clave,
    numero: fase.numero,
    nombre: fase.nombre,
    animal: ANIMAL_DE_FASE[fase.clave],
    estado: estadoFrenteALaActual(fase.numero, numeroActual),
  }));
}

function estadoFrenteALaActual(numero: number, numeroActual: number | null): EstadoDeFase {
  if (numeroActual === null || numero > numeroActual) return 'futura';
  return numero === numeroActual ? 'actual' : 'lograda';
}

/**
 * ¿Toca celebrar? Sólo si ya había una fase vista y la actual es posterior. Sin fase vista (primera vez
 * que se abre Yo con esta versión) se registra la actual en silencio: de lo contrario, a quien ya iba por
 * la fase 3 se le celebraría una fase que cruzó hace semanas.
 */
export function hayQueCelebrar(ultimaFaseVista: number | null, numeroActual: number | null): boolean {
  if (ultimaFaseVista === null || numeroActual === null) return false;
  return numeroActual > ultimaFaseVista;
}
