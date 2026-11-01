import { DIMENSION_VIDA_Y_NEGOCIO } from './dimensionDelHabito';

/**
 * Las dimensiones que «Tus prácticas» dibuja (spec 023, FR-009): las de la formación de la persona que tienen al menos un hábito que le
 * toca (el inventario, también los pausados), en el orden de Administración. «Vida y negocio» (las acciones de los objetivos) se dibuja
 * siempre, como hasta hoy: no es una categoría de hábito. Una categoría vacía no queda como una dimensión sin nada.
 */
export function dimensionesQueSeDibujan<D extends { key: string }>(
  dimensiones: readonly D[],
  planHabits: ReadonlyArray<{ dimension: string }>,
): D[] {
  const conHabitos = new Set(planHabits.map(h => h.dimension));
  return dimensiones.filter(d => d.key === DIMENSION_VIDA_Y_NEGOCIO || conHabitos.has(d.key));
}
