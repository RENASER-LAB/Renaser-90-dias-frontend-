import {
  categoriaDeCodigo,
  dimensionDeCodigo,
  dimensionPorClave,
} from '../../habits/categorias/estado/estadoDeCategorias';
import { DIMENSION_MIS_HABITOS } from '../../habits/categorias/utils/dimensionesDeCategorias';

/**
 * La dimensión de Training de un hábito, a partir de la categoría del catálogo (`BODY`, `MIND`, `DIPLOMADO_ESTUDIO`…).
 *
 * Vivía como constante privada de `useTraining`. Desde 2026-09-28 (D-218) la necesitan también el
 * aviso de un hábito —el push del servidor y la alarma local llevan `?dimension=BODY` en su ruta— y
 * Training al abrirse desde ese aviso: una sola tabla, para que el día que cambie una categoría no
 * quede un lado abriendo la dimensión equivocada.
 *
 * **Spec 023 (2026-10-31):** las dimensiones ya no son cinco fijas. Cada formación tiene sus categorías y salen del servidor
 * (`GET /habit-categories`, `habits/categorias`); la clave de una dimensión es un texto. Las cuatro de la Escuela conservan las claves
 * de siempre (`CUERPO`, `MENTE`, `EMOCIONES`, `ESPÍRITU`) y `VIDA Y NEGOCIO` (las acciones de los objetivos) sigue como hoy: no es
 * una categoría de hábito.
 */
export type DimensionDeTraining = string;

/** Las acciones de los objetivos. No es una categoría de hábito y no se configura en Administración. */
export const DIMENSION_VIDA_Y_NEGOCIO = 'VIDA Y NEGOCIO';

export { DIMENSION_MIS_HABITOS };

/**
 * El respaldo de la Escuela: categoría (`code`) → dimensión. Es lo que valía antes de la spec 023 y lo que sigue valiendo mientras
 * no se sabe otra cosa; las lecturas de verdad (`dimensionDeCategoria`) consultan las categorías vigentes de la sesión.
 */
export const DIMENSION_POR_CATEGORIA: Readonly<Record<string, DimensionDeTraining>> = {
  BODY: 'CUERPO',
  MIND: 'MENTE',
  CONSCIENCE: 'EMOCIONES',
  SPIRIT: 'ESPÍRITU',
};

/** `null` si la categoría no es de las que Training muestra por dimensión en la formación vigente. */
export function dimensionDeCategoria(categoria: unknown): DimensionDeTraining | null {
  return typeof categoria === 'string' ? dimensionDeCodigo(categoria)?.key ?? null : null;
}

/**
 * Lo mismo para un hábito: la dimensión de su categoría o, si es un hábito PROPIO cuya categoría no existe en la formación vigente
 * (el aprendiz cambió de formación y lo conservó), «Mis hábitos». Un hábito del catálogo con una categoría que no es de la formación
 * no se muestra (`null`): no le toca a esta persona.
 */
export function dimensionDelHabito(habito: { category: string; isSystemHabit: boolean }): DimensionDeTraining | null {
  const propia = dimensionDeCategoria(habito.category);
  if (propia) return propia;
  return habito.isSystemHabit ? null : DIMENSION_MIS_HABITOS;
}

/** Lo inverso, para escribir la ruta de la alarma local. `null` para VIDA Y NEGOCIO, «Mis hábitos» o desconocida. */
export function categoriaDeDimension(dimension: string | null | undefined): string | null {
  if (!dimension) return null;
  return dimensionPorClave(dimension)?.codigo ?? null;
}

/** La categoría del servidor de una dimensión (para crear un hábito propio en ella), o `null`. */
export function categoriaDeLaDimension(dimension: string | null | undefined) {
  const codigo = categoriaDeDimension(dimension);
  return codigo ? categoriaDeCodigo(codigo) : null;
}
