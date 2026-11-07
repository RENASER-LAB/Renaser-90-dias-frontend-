import type { EstadoDeLaCarrera } from '../types/carrera.types';
import { ACCION_PAUSAR, ACCION_SEGUIR, CATEGORIA_CARRERA, CATEGORIA_CARRERA_EN_PAUSA, ID_NOTIFICACION_CARRERA } from './avisoDeCarrera';
import { cuerpoDeLaNotificacion, tituloDeLaNotificacion } from './textosDeLaCarrera';

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
    title: tituloDeLaNotificacion(datos.metros, datos.enPausa),
    body: cuerpoDeLaNotificacion(duracion, datos.ritmo, datos.enPausa),
    categoryIdentifier: datos.enPausa ? CATEGORIA_CARRERA_EN_PAUSA : CATEGORIA_CARRERA,
  };
}

/**
 * Los datos que lee el parche nativo (`scripts/arreglar-notificacion-de-carrera.js`) para pintarla dorada y llevar el cronómetro:
 * `inicioCronometroMs` es «ahora − tiempo activo», así el cronómetro del sistema marca el tiempo activo y sigue solo.
 */
export function datosDeLaNotificacion(datos: DatosDeLaNotificacion, ahora: number): { carrera: true; enPausa: boolean; inicioCronometroMs: number } {
  return { carrera: true, enPausa: datos.enPausa, inicioCronometroMs: Math.round(ahora - datos.activoMs) };
}

/** Lo que importa de una respuesta de `expo-notifications` (un toque en la notificación o en uno de sus botones). */
export interface ToqueEnLaNotificacion {
  actionIdentifier: string;
  notification: { date: number; request: { identifier: string } };
}

/** Un toque más viejo que esto no se atiende al abrir la app: no es de esta vez. */
export const VIGENCIA_DEL_TOQUE_MS = 10 * 60_000;

/**
 * Qué hacer con un toque en la notificación de la carrera. «Pausar» solo corriendo y «Seguir» solo en pausa (un toque doble no
 * hace dos cosas). Al abrir la app con el proceso recién armado el toque llega antes que el oyente y se lee después con
 * `getLastNotificationResponseAsync`: por eso se descarta el de otra carrera (anterior a esta) o uno viejo.
 */
export function accionDelToque(
  toque: ToqueEnLaNotificacion | null,
  e: Pick<EstadoDeLaCarrera, 'fase' | 'iniciadaEnMs'> | null,
  ahora: number,
): 'pausar' | 'seguir' | 'abrir' | null {
  if (!toque || !e || toque.notification.request.identifier !== ID_NOTIFICACION_CARRERA) return null;
  const fecha = toque.notification.date;
  if (Number.isFinite(fecha) && (fecha < e.iniciadaEnMs || ahora - fecha > VIGENCIA_DEL_TOQUE_MS)) return null;
  if (toque.actionIdentifier === ACCION_PAUSAR) return e.fase === 'corriendo' ? 'pausar' : 'abrir';
  if (toque.actionIdentifier === ACCION_SEGUIR) return e.fase === 'pausa' ? 'seguir' : 'abrir';
  return 'abrir';
}

/** La marca de un toque, para atenderlo una sola vez (llega por el oyente y otra vez por la última respuesta). */
export function marcaDelToque(toque: ToqueEnLaNotificacion): string {
  return `${toque.notification.date}|${toque.actionIdentifier}`;
}
