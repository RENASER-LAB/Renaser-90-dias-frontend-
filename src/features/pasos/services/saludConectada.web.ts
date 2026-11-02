import type { LecturaCrudaDelDia } from '../types/pasos.types';

/**
 * La web (y el iPhone, que entra por la web): sin Health Connect. Misma forma que `saludConectada.ts` para que quien la usa no
 * ramifique por plataforma. La captura de siempre es el camino (spec 037, D-310).
 */

export const API_MINIMA_DE_ANDROID = 34;

export async function soporteDeSalud(): Promise<'disponible' | 'no-disponible'> {
  return 'no-disponible';
}

export async function permisosDeSalud(): Promise<'otorgados' | 'faltan'> {
  return 'faltan';
}

export async function pedirPermisosDeSalud(): Promise<boolean> {
  return false;
}

export function abrirHealthConnect(): void {
  /* no hay Health Connect en la web */
}

export async function leerLosPasosDelDia(_desde: Date, _hasta: Date): Promise<LecturaCrudaDelDia> {
  return { pasos: null, distanciaM: null, origenesUsados: [], registros: [] };
}
