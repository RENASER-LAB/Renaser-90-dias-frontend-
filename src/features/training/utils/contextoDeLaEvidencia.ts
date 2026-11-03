import { ETIQUETA_EJE, type EjeObjetivo } from '../../objetivos/types/objetivos.types';
import { DIMENSION_VIDA_Y_NEGOCIO } from './dimensionDelHabito';
import { nombreDeLaDimension } from '../data/dimensiones';

/**
 * La línea chica bajo el título de la hoja de evidencia: «Cuerpo · Innegociable».
 *
 * Un hábito dice su dimensión. Una ACCIÓN de los objetivos (las que Training agrupa en `VIDA Y NEGOCIO`, que solo es un cajón técnico) dice su
 * EJE real —«Cuerpo», «Negocio y dinero», «Relaciones»—: una acción de Cuerpo no es de «Vida y negocio» (E2E del 03/11, issue #115). Si el eje no
 * se conoce, se queda lo de siempre.
 */
export function contextoDeLaEvidencia(habito: { dimension: string; tag: string; eje?: string | null }): string {
  const esAccion = habito.dimension === DIMENSION_VIDA_Y_NEGOCIO;
  const eje = esAccion && habito.eje ? ETIQUETA_EJE[habito.eje as EjeObjetivo] : undefined;
  return `${eje ?? nombreDeLaDimension(habito.dimension)} · ${habito.tag}`;
}
