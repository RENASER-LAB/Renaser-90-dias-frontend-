import type { DimensionDeTraining } from './dimensionDelHabito';

/**
 * Dónde está la persona dentro de «Tus prácticas» (el engranaje de Training, spec 014). Un solo estado, un solo lugar
 * para el retroceso del sistema (AGENTS.md §6): el gesto lateral y el atrás de Android suben UN nivel por vez y
 * nunca cierran la app desde una vista hija.
 *
 *   Training → Tus prácticas → la hoja «Planificar <dimensión>» → el editor de un hábito
 *
 * Tocar una dimensión abre DIRECTO la hoja de Planificar (2026-10-31: se quitó el detalle intermedio, que repetía la
 * lista de hábitos). La hoja es un `Modal` con su propio atrás —la ‹ del editor vuelve a su lista y, desde la lista,
 * cerrarla vuelve a «Tus prácticas»—; acá solo se sabe cuál dimensión tiene la hoja abierta.
 */
export interface EstadoDePracticas {
  abierta: boolean;
  /** La dimensión cuya hoja «Planificar» está abierta; `null` = se ve la lista de dimensiones. */
  dimension: DimensionDeTraining | null;
}

export const PRACTICAS_CERRADAS: EstadoDePracticas = { abierta: false, dimension: null };
export const PRACTICAS_ABIERTAS: EstadoDePracticas = { ...PRACTICAS_CERRADAS, abierta: true };

/**
 * Lo que pasa al retroceder: el estado siguiente, o `null` si «Tus prácticas» no está abierta (el atrás no es de
 * esta vista y se deja pasar).
 */
export function alRetroceder(estado: EstadoDePracticas): EstadoDePracticas | null {
  if (!estado.abierta) return null;
  if (estado.dimension) return { ...estado, dimension: null };
  return PRACTICAS_CERRADAS;
}
