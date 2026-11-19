import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';

/**
 * Los cuatro estados del semáforo en las pantallas del líder (spec 056 FR-043), en el vocabulario de estas pantallas. Puro (sin tema ni pantalla) para que
 * las utilidades y sus pruebas no arrastren la interfaz.
 */
export type EstadoDelLider = 'rojo' | 'ambar' | 'verde' | 'sinDatos';

/** La palabra de cada estado: «5 en rojo», «4 sin datos». */
export const PALABRA_DEL_ESTADO: Record<EstadoDelLider, string> = { rojo: 'en rojo', ambar: 'en ámbar', verde: 'en verde', sinDatos: 'sin datos' };

/** El estado del semáforo del servidor (`ColorSemaforo`) en el vocabulario de estas pantallas. */
export function estadoDelColor(color: ColorSemaforo | null | undefined): EstadoDelLider {
  switch (color) {
    case 'ROJO':
      return 'rojo';
    case 'AMARILLO':
      return 'ambar';
    case 'VERDE':
      return 'verde';
    default:
      return 'sinDatos';
  }
}

/** Lo que oye el lector de pantalla: «5 en rojo»; sin cifra, «En rojo». */
export function etiquetaDelEstado(estado: EstadoDelLider, cifra?: number | null): string {
  if (cifra === undefined || cifra === null) return PALABRA_DEL_ESTADO[estado].replace(/^en /, 'En ').replace(/^sin /, 'Sin ');
  return `${cifra} ${PALABRA_DEL_ESTADO[estado]}`;
}
