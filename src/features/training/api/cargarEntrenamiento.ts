import type { PlanHabit } from '../../../screens/PlanScreen';
import * as habitsApi from '../../habits/api/habitsApi';
import { cargarPlanHabitos } from '../../habits/hooks/usePlanHabitos';
import type { HabitoCatalogoApi, TrackDelDiaApi } from '../../habits/types/habits.types';
import type { EvidenciaApi, RocaDiariaApi } from '../types/training.types';
import * as trainingApi from './trainingApi';

/** Todo lo que Training necesita para pintarse, leído en una sola ronda. */
export type DatosEntrenamiento = {
  tracks: TrackDelDiaApi[];
  /** Solo para lo que `PlanHabit` no trae: la categoría cruda (BODY/MIND/...) y `systemKey`. */
  catalogo: HabitoCatalogoApi[];
  /** El inventario de Plan (horario propio y pausas), con las reglas exactas de `usePlanHabitos`. */
  planHabits: PlanHabit[];
  rocas: RocaDiariaApi[];
  rocasConEvidencia: Set<string>;
};

/**
 * Lee Training en UNA sola ronda de pedidos en paralelo (V-1, retroalimentación del 26/09/2026).
 *
 * > **Antes** eran dos rondas en serie y diez pedidos: `useTraining` pedía tracks, catálogo, roca y
 * > evidencias; `usePlanHabitos` (montado adentro) pedía catálogo, horarios y pausas por su cuenta;
 * > y al terminar la primera ronda `useTraining` hacía `await plan.recargar()`, que repetía esos
 * > tres. `GET /api/v1/habits` salía TRES veces, y la pantalla esperaba dos idas y vueltas a
 * > Miami (130–490 ms cada una) antes de dibujarse.
 *
 * Ahora son seis pedidos, todos a la vez, y el catálogo se pide una sola vez: la misma promesa
 * alimenta a Training y al armado del plan (`cargarPlanHabitos`).
 *
 * Las mismas degradaciones de siempre: si falla la roca o su evidencia, se ve el resto (con un
 * `console.warn`, para distinguir "no hay nada" de "un endpoint se cayó"); horarios y pausas
 * degradan adentro de `cargarPlanHabitos`. Tracks y catálogo sí son imprescindibles: si fallan,
 * la promesa se rechaza y la pantalla muestra su error.
 */
export async function cargarEntrenamiento(): Promise<DatosEntrenamiento> {
  const catalogoPedido = habitsApi.obtenerCatalogo();
  const [tracks, catalogo, planHabits, rocas, evidencias] = await Promise.all([
    habitsApi.obtenerTracksDeHoy(),
    catalogoPedido,
    cargarPlanHabitos(catalogoPedido),
    trainingApi.obtenerRocasDeHoy().catch(e => {
      console.warn('[Training] no se pudo cargar la roca del día; la dimensión sale vacía:', e);
      return [] as RocaDiariaApi[];
    }),
    trainingApi.obtenerEvidenciasDeRocas().catch(e => {
      console.warn('[Training] no se pudo cargar la evidencia de rocas; se muestran sin sellar:', e);
      return [] as EvidenciaApi[];
    }),
  ]);
  return {
    tracks,
    catalogo,
    planHabits,
    rocas,
    // Para las ROCAS hay que cruzar contra el listado de evidencia. Para los HÁBITOS no: desde
    // el 2026-09-05 (D-113) cada track de `habit-tracks/today` trae `tieneEvidencia` resuelto
    // por el backend.
    rocasConEvidencia: new Set(
      evidencias.map(e => e.rocaDiariaId).filter((id): id is string => Boolean(id)),
    ),
  };
}
