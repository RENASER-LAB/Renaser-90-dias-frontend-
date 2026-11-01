import type { EjeObjetivo, RocaDiariaApi } from '../../objetivos/types/objetivos.types';

/**
 * El eje de cada acción pendiente del cierre (spec 033, FR-003). `GET /rocks/day-closure` trae las acciones sin su eje y el
 * servidor no cambia en esta spec: el eje sale de las acciones de hoy que Plan ya lee (`GET /rocks/today`), por id. Una acción
 * que no figura ahí devuelve `null` y se dibuja con el ícono neutro: nunca se inventa un eje.
 */
export function ejeDeLasAcciones(acciones: readonly Pick<RocaDiariaApi, 'id' | 'eje'>[] | null | undefined): (id: string) => EjeObjetivo | null {
  const porId = new Map<string, EjeObjetivo>();
  for (const accion of acciones ?? []) porId.set(accion.id, accion.eje);
  return id => porId.get(id) ?? null;
}
