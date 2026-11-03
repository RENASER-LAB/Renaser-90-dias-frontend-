import type { ResumenDeFormacion } from '../types/formaciones.types';
import { etiquetaDeDuracion } from './etiquetaDeDuracion';

/**
 * Cambiar la duración del programa de quien ya empezó (spec 025, 025-2 A). El servidor decide (409 si ya terminó o si su día no cabe en la nueva
 * duración); aquí solo se evita el viaje inútil y se dice qué falta.
 */
export const MOTIVO_DE_DURACION_MINIMO = 3;
export const MOTIVO_DE_DURACION_MAXIMO = 280;

/** Las duraciones a las que se puede pasar: las que ofrece su formación, menos la que ya tiene. */
export function duracionesPosibles(formacion: ResumenDeFormacion | undefined, actual: number): number[] {
  return (formacion?.duracionesDias ?? []).filter(dias => dias !== actual);
}

/** Lo que falta para poder cambiarla, en una línea; `null` si ya se puede. */
export function errorDelCambioDeDuracion(duracionDias: number | null, motivo: string): string | null {
  if (duracionDias === null) return 'Elige la nueva duración.';
  const limpio = motivo.trim();
  if (limpio.length < MOTIVO_DE_DURACION_MINIMO) return 'Escribe el motivo (al menos 3 letras).';
  if (limpio.length > MOTIVO_DE_DURACION_MAXIMO) return `El motivo puede tener hasta ${MOTIVO_DE_DURACION_MAXIMO} letras.`;
  return null;
}

/** La confirmación: qué pasa de verdad (conserva su día, cambia cuándo termina). */
export function textoDelCambioDeDuracion(nombre: string, desde: number, hasta: number): string {
  return `El programa de ${nombre} pasa de ${etiquetaDeDuracion(desde)} a ${etiquetaDeDuracion(hasta)}. Sigue en el mismo día; solo cambia cuándo termina. Queda anotado con tu nombre y el motivo.`;
}
