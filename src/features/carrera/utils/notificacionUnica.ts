import type { EstadoDeLaCarrera } from '../types/carrera.types';
import { CATEGORIA_CARRERA, CATEGORIA_CARRERA_EN_PAUSA } from './avisoDeCarrera';
import { lineaDeLaNotificacion, TEXTOS_DE_LA_NOTIFICACION } from './textosDeLaCarrera';

/**
 * La notificación ÚNICA de la carrera (spec 042, FR-011): reemplaza la del servicio en primer plano del GPS (ver
 * `scripts/arreglar-notificacion-de-carrera.js`), así que tiene que decir todo: km, tiempo, ritmo, si está en pausa, y los
 * botones que tocan («Pausar» corriendo, «Seguir» en pausa, y siempre «Abrir»). Puro: sin módulos nativos.
 */

/**
 * ¿Ya se puede mostrar? Durante la cuenta regresiva (3, 2, 1) la carrera ya existe y está en pausa, pero todavía no empezó:
 * ofrecer «Seguir» ahí la arrancaría antes de tiempo. Hasta entonces se ve la del servicio («Carrera en curso»).
 */
export function laCarreraYaEmpezo(e: Pick<EstadoDeLaCarrera, 'desdeMs' | 'activoAcumuladoMs'> | null): boolean {
  return e != null && (e.desdeMs != null || e.activoAcumuladoMs > 0);
}

export interface DatosDeLaNotificacion {
  metros: number;
  activoMs: number;
  ritmo: number | null;
  enPausa: boolean;
}

/** Título, texto y qué botones lleva. `duracion` es el tiempo ya formateado («00:21:04»). */
export function contenidoDeLaNotificacion(
  datos: DatosDeLaNotificacion,
  duracion: string,
): { title: string; body: string; categoryIdentifier: string } {
  return {
    title: datos.enPausa ? TEXTOS_DE_LA_NOTIFICACION.enPausa : TEXTOS_DE_LA_NOTIFICACION.titulo,
    body: lineaDeLaNotificacion(datos.metros, duracion, datos.ritmo),
    categoryIdentifier: datos.enPausa ? CATEGORIA_CARRERA_EN_PAUSA : CATEGORIA_CARRERA,
  };
}
