import type { IconName } from '../../../components/Icon';
import { ICONO_DEL_EJE } from '../../objetivos/utils/iconoDelEje';
import type { DimensionDeTraining } from './dimensionDelHabito';

/**
 * El ícono de cada dimensión de Training: la fuente única (pedido del dueño, 2026-10-05: mejorar
 * los íconos de Cuerpo · Mente · Emociones · Espíritu · Vida y negocio).
 *
 * Antes había dos tablas que decían lo mismo: `DIMENSIONES_CONFIG` en `TrainingScreen` (la lista
 * de dimensiones y la cabecera del detalle) y `ICONO_DE_LINEA_POR_CATEGORIA` en
 * `habits/utils/iconosDeHabito` (el respaldo de un hábito sin ícono propio). Ahora las dos leen
 * esta, y la de categorías sale de acá con `DIMENSION_POR_CATEGORIA`.
 *
 * - **Cuerpo → `activity`** (el pulso) y **Vida y negocio → `briefcase`**: se toman de
 *   `ICONO_DEL_EJE`, los de los ejes Cuerpo y Negocio en Plan y en el Mapa. Un concepto, un dibujo:
 *   si el eje cambia de ícono, la dimensión cambia con él. Cuerpo era `body` (un monigote).
 * - **Mente → `brain`** y **Emociones → `heart`**, con la forma de Lucide.
 * - **Espíritu → `sparkles`**: era el asterisco `spark`, que también es Sparkie y el Pacto.
 *
 * Solo importa `iconoDelEje`, que a su vez no importa nada en tiempo de ejecución: lo pueden leer
 * `iconosDeHabito` y cualquier prueba sin arrastrar una pantalla.
 */
export const ICONO_DE_LA_DIMENSION: Readonly<Record<DimensionDeTraining, IconName>> = {
  CUERPO: ICONO_DEL_EJE.CUERPO,
  MENTE: 'brain',
  EMOCIONES: 'heart',
  'ESPÍRITU': 'sparkles',
  'VIDA Y NEGOCIO': ICONO_DEL_EJE.TRABAJO,
};

export function iconoDeLaDimension(dimension: DimensionDeTraining): IconName {
  return ICONO_DE_LA_DIMENSION[dimension];
}
