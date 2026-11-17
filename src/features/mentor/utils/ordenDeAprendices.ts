import type { AprendizDelSemaforo, ColorSemaforo } from '../../semaforo/types/semaforo.types';

/**
 * El orden de «Mi grupo» (spec 055 FR-004): primero rojo, luego ámbar, luego verde y al final quien no tiene datos; dentro de
 * cada color, del que menos cumplió al que más (quien no tiene porcentaje va al final de su color) y, a igualdad, por nombre.
 *
 * Es el orden que decidió el dueño: el que necesita ayuda va arriba. No toca al servidor ni recalcula colores: solo ordena las
 * filas que ya trae el semáforo del grupo. Devuelve una lista nueva; no cambia la que recibe.
 */
const RANGO_DEL_COLOR: Record<ColorSemaforo, number> = { ROJO: 0, AMARILLO: 1, VERDE: 2, SIN_DATOS: 3 };

export function ordenDeAprendices<T extends Pick<AprendizDelSemaforo, 'color' | 'porcentaje' | 'nombre'>>(aprendices: readonly T[]): T[] {
  return [...aprendices].sort((a, b) => {
    const porColor = RANGO_DEL_COLOR[a.color] - RANGO_DEL_COLOR[b.color];
    if (porColor !== 0) return porColor;
    const pa = a.porcentaje ?? Number.POSITIVE_INFINITY;
    const pb = b.porcentaje ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa < pb ? -1 : 1;
    return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es', { sensitivity: 'base' });
  });
}
