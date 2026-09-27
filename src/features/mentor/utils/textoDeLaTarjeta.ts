import type { ResumenPorColor } from '../../semaforo/types/semaforo.types';
import { lineaDeAyudaDelGrupo } from '../../semaforo/utils/ayudaDelSemaforo';
import type { FalloCelula } from '../hooks/useCelulaQueAcompano';

/**
 * La línea de la tarjeta. Con el semáforo respondido manda él («2 necesitan tu ayuda esta semana»);
 * si el servidor todavía no lo tiene (404), o el mentor ya no puede verlo, se dice solo cuántos son
 * —nunca «sin avance registrado», que era una afirmación sin datos detrás—.
 */
export function textoDeLaTarjeta({
  cargando,
  fallo,
  total,
  resumen,
}: {
  cargando: boolean;
  fallo: FalloCelula | null;
  total: number;
  resumen: ResumenPorColor | null;
}): string {
  if (cargando) return 'Cargando tu grupo…';
  if (fallo === 'no_disponible') return 'El seguimiento del grupo aún no está disponible.';
  // Un mentor sin grupo asignado no es un error: decirle «No pudimos cargar» lo manda a revisar
  // su conexión por algo que no depende de él (visto en el e2e del 26/09).
  if (fallo === 'sin_celula') return 'Todavía no lideras ningún grupo.';
  if (fallo) return 'No pudimos cargar tu grupo.';
  if (total === 0) return 'Todavía no tienes aprendices asignados.';
  if (resumen) return lineaDeAyudaDelGrupo(resumen);
  return total === 1 ? '1 aprendiz en tu grupo' : `${total} aprendices en tu grupo`;
}
