import type { FaseDeLaFormacion } from '../types/formaciones.types';

/**
 * Las cuatro fases del programa estiradas a la duración de cada persona (spec 022). Es la MISMA cuenta que hace el servidor
 * (`CortesDeFase`): los cortes de la Escuela (días 1, 8, 35 y 65 de 90) se llevan en proporción a la duración. Con 90 días
 * son las de siempre; con 365 son 1, 29, 138 y 260. Si el servidor manda las fases de la sesión, esas mandan; esto es el
 * respaldo para quien no las trae (un backend anterior) y para las pantallas que solo conocen la duración.
 */
const DURACION_BASE = 90;
const CORTES_BASE = [1, 8, 35, 65] as const;

export const TOTAL_DE_FASES = CORTES_BASE.length;

export function inicioDeFase(numero: number, duracionDias: number): number {
  const corte = CORTES_BASE[numero - 1];
  if (corte === undefined) throw new RangeError(`La fase va de 1 a ${TOTAL_DE_FASES}, llegó ${numero}.`);
  return Math.floor(((corte - 1) * duracionDias) / DURACION_BASE) + 1;
}

export function finDeFase(numero: number, duracionDias: number): number {
  return numero === TOTAL_DE_FASES ? duracionDias : inicioDeFase(numero + 1, duracionDias) - 1;
}

export function fasesDeLaDuracion(duracionDias: number): FaseDeLaFormacion[] {
  const duracion = Number.isFinite(duracionDias) && duracionDias >= 1 ? Math.floor(duracionDias) : DURACION_BASE;
  return CORTES_BASE.map((_, i) => ({
    numero: i + 1,
    primerDia: inicioDeFase(i + 1, duracion),
    ultimoDia: finDeFase(i + 1, duracion),
  }));
}
