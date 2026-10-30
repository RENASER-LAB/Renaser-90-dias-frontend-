import type { DimensionDeTraining } from './dimensionDelHabito';

/**
 * Dónde está la persona dentro de «Tus prácticas» (el engranaje de Training, spec 014). Un solo estado, un solo lugar
 * para el retroceso del sistema (AGENTS.md §6): el gesto lateral y el atrás de Android suben UN nivel por vez y
 * nunca cierran la app desde una vista hija.
 *
 *   Training → Tus prácticas → una dimensión → Planificar (la hoja) → el editor de un hábito
 *
 * El editor de un hábito es un paso DE la hoja de Planificar (su propia ‹); acá solo se sabe qué hábito abrir.
 */
export interface EstadoDePracticas {
  abierta: boolean;
  dimension: DimensionDeTraining | null;
  /** La hoja de Planificar está abierta. */
  planificando: boolean;
  /** Al abrirse la hoja, ir directo al editor de este hábito (`habitoId` del catálogo). */
  habitoId: string | null;
}

export const PRACTICAS_CERRADAS: EstadoDePracticas = { abierta: false, dimension: null, planificando: false, habitoId: null };
export const PRACTICAS_ABIERTAS: EstadoDePracticas = { ...PRACTICAS_CERRADAS, abierta: true };

/**
 * Lo que pasa al retroceder: el estado siguiente, o `null` si «Tus prácticas» no está abierta (el atrás no es de
 * esta vista y se deja pasar).
 */
export function alRetroceder(estado: EstadoDePracticas): EstadoDePracticas | null {
  if (!estado.abierta) return null;
  if (estado.planificando) return { ...estado, planificando: false, habitoId: null };
  if (estado.dimension) return { ...estado, dimension: null };
  return PRACTICAS_CERRADAS;
}
