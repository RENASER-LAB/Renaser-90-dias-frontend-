import type { DimensionDeTraining } from './dimensionDelHabito';

/**
 * Qué dimensión abre Training cuando llega desde el aviso de un hábito (D-218, 2026-09-28).
 *
 * La ruta del aviso trae la dimensión (`?dimension=BODY`) cuando el servidor o la alarma la conocían, y
 * entonces se abre de una, sin esperar a que carguen los hábitos. Si no la trae —una alarma programada
 * antes de este cambio, o un hábito sin categoría conocida— se busca el hábito por su id entre los que
 * Training ya tiene; mientras cargan, se espera.
 *
 * @returns la dimensión, `'esperar'` si todavía no se puede saber, o `null` si no hay qué abrir (el
 *          hábito no está entre los de la persona): Training queda en su lista de dimensiones.
 */
export function dimensionAAbrir(
  pedido: { habitoId: string; dimension: DimensionDeTraining | null },
  habitos: ReadonlyArray<{ habitoId?: string | null; dimension: DimensionDeTraining }>,
  cargando: boolean,
): DimensionDeTraining | 'esperar' | null {
  if (pedido.dimension) return pedido.dimension;
  const habito = habitos.find(h => h.habitoId === pedido.habitoId);
  if (habito) return habito.dimension;
  return cargando ? 'esperar' : null;
}

/**
 * Spec 014 (Training por hora): el aviso de un hábito ya no abre una dimensión —las dimensiones salieron de la pantalla
 * principal—, abre el hábito mismo, como al tocar su fila. Devuelve el hábito de HOY al que apunta el aviso, `'esperar'`
 * si todavía están cargando (y puede aparecer), o `null` si no hay tal hábito hoy (pausado, no le toca): Training queda
 * en su lista. El aviso lleva el `habitoId` del catálogo; el registro de hoy es `id`.
 */
export function habitoAAbrir<H extends { id: string; habitoId?: string | null; tieneTrackHoy: boolean }>(
  pedido: { habitoId: string },
  habitos: ReadonlyArray<H>,
  cargando: boolean,
): H | 'esperar' | null {
  const habito = habitos.find(h => h.habitoId === pedido.habitoId && h.tieneTrackHoy);
  if (habito) return habito;
  return cargando ? 'esperar' : null;
}
