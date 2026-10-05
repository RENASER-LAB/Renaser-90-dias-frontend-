import type { IconName } from '../../../components/Icon';
import type { EjeObjetivo } from '../types/objetivos.types';

/**
 * El ícono de cada eje del programa, el mismo en Plan y en el Mapa de Renacimiento (rediseño de
 * Plan, 2026-10-05, decisión del dueño).
 *
 * - **Cuerpo → `activity`** (el pulso): el Mapa usaba `heart`, que en la app también es el
 *   «Protocolo de retorno» y las emociones.
 * - **Negocio y dinero → `briefcase`**, el que ya tenía.
 * - **Relaciones → `heartHandshake`**: el Mapa usaba `users`, que es Tribu en Comunidad.
 *
 * Un solo lugar para que Plan y el Mapa no vuelvan a separarse: el Mapa traduce su `Area` con
 * `EJE_POR_AREA` y pregunta acá.
 */
export const ICONO_DEL_EJE: Record<EjeObjetivo, IconName> = {
  CUERPO: 'activity',
  TRABAJO: 'briefcase',
  RELACIONES: 'heartHandshake',
};

export function iconoDelEje(eje: EjeObjetivo): IconName {
  return ICONO_DEL_EJE[eje];
}
