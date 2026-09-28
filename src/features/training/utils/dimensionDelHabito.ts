/**
 * La dimensión de Training de un hábito, a partir de la categoría del catálogo (`BODY`, `MIND`…).
 *
 * Vivía como constante privada de `useTraining`. Desde 2026-09-28 (D-218) la necesitan también el
 * aviso de un hábito —el push del servidor y la alarma local llevan `?dimension=BODY` en su ruta— y
 * Training al abrirse desde ese aviso: una sola tabla, para que el día que cambie una categoría no
 * quede un lado abriendo la dimensión equivocada.
 */
export type DimensionDeTraining = 'CUERPO' | 'MENTE' | 'EMOCIONES' | 'ESPÍRITU' | 'VIDA Y NEGOCIO';

/** Categoría del catálogo (no la trae `PlanHabit`) → la dimensión que le corresponde en Training. */
export const DIMENSION_POR_CATEGORIA: Readonly<Record<string, DimensionDeTraining>> = {
  BODY: 'CUERPO',
  MIND: 'MENTE',
  CONSCIENCE: 'EMOCIONES',
  SPIRIT: 'ESPÍRITU',
};

/** `null` si la categoría no es de las que Training muestra por dimensión. */
export function dimensionDeCategoria(categoria: unknown): DimensionDeTraining | null {
  return typeof categoria === 'string' ? DIMENSION_POR_CATEGORIA[categoria] ?? null : null;
}

/** Lo inverso, para escribir la ruta de la alarma local. `null` para VIDA Y NEGOCIO o desconocida. */
export function categoriaDeDimension(dimension: string | null | undefined): string | null {
  if (!dimension) return null;
  const par = Object.entries(DIMENSION_POR_CATEGORIA).find(([, d]) => d === dimension);
  return par ? par[0] : null;
}
