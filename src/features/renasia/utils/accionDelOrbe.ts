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

/** Hasta dónde se corta la línea corta de la hoja de acción. */
export const LARGO_RESUMEN_CORTO = 64;

/**
 * La acción en una línea, para la hoja del orbe: lo que va antes del primer paréntesis o de la
 * primera coma ("Cambiar 'Genera 10 km' de 07:00 a 10:00"). El detalle completo (desde cuándo,
 * cuántos cambios quedan) se ve al tocar. Pedido del dueño: directo, poco texto.
 */
export function resumenCorto(resumen: string): string {
  const corte = resumen.search(/\s\(|,/);
  const base = (corte > 0 ? resumen.slice(0, corte) : resumen).trim();
  return base.length > LARGO_RESUMEN_CORTO ? `${base.slice(0, LARGO_RESUMEN_CORTO - 1).trimEnd()}…` : base;
}

/** La primera frase de lo que respondió el servidor: "Horario cambiado: 10:00 desde el viernes…". */
export function primeraFrase(mensaje: string | null | undefined): string | null {
  if (!mensaje) return null;
  const punto = mensaje.search(/\.(\s|$)/);
  return (punto > 0 ? mensaje.slice(0, punto) : mensaje).trim();
}
