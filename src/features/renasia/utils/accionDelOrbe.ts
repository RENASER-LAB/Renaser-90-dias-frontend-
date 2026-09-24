import type { PropuestaUI } from '../types/renasia.types';
import { estadoVisible } from './propuestas';

/** Cuánto queda a la vista una acción ya resuelta (hecha, cancelada, fallida) antes de irse sola. */
export const PERMANENCIA_RESUELTA_MS = 4000;

export type AccionVisible = {
  propuesta: PropuestaUI;
  /** Otras propuestas pendientes que no se muestran acá: quedan en el chat. */
  otrasPendientes: number;
  /** Cuánto le queda a una acción ya resuelta antes de retirarse; `null` si está pendiente. */
  seVaEnMs: number | null;
};

/**
 * Qué muestra la hoja de acción del orbe (D-163): **una sola** cosa a la vez. La propuesta pendiente
 * más reciente si hay alguna; si no, la última que se resolvió hace menos de
 * {@link PERMANENCIA_RESUELTA_MS}, para que se vea qué pasó. Después, nada: la voz no llena la
 * pantalla, y lo demás sigue en el chat.
 */
export function elegirAccionVisible(propuestas: PropuestaUI[], ahoraMs: number): AccionVisible | null {
  const pendientes = propuestas.filter(p => {
    const estado = estadoVisible(p, ahoraMs);
    return estado === 'pendiente' || estado === 'confirmando' || estado === 'cancelando';
  });
  if (pendientes.length > 0) {
    return { propuesta: pendientes[pendientes.length - 1], otrasPendientes: pendientes.length - 1, seVaEnMs: null };
  }
  const recientes = propuestas.filter(
    p => p.resueltaEnMs !== undefined && ahoraMs - p.resueltaEnMs < PERMANENCIA_RESUELTA_MS
  );
  if (recientes.length === 0) return null;
  const ultima = recientes.reduce((a, b) => ((a.resueltaEnMs ?? 0) >= (b.resueltaEnMs ?? 0) ? a : b));
  return { propuesta: ultima, otrasPendientes: 0, seVaEnMs: PERMANENCIA_RESUELTA_MS - (ahoraMs - (ultima.resueltaEnMs ?? 0)) };
}
