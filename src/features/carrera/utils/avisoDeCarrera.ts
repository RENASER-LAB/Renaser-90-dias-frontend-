/**
 * Los identificadores de la notificación fija de la carrera (spec 042, FR-011). Aparte y sin dependencias para que el manejador de
 * avisos de la app (`habits/notificaciones/recordatoriosDeHabito`) los pueda usar sin un ciclo de importaciones.
 */
export const ID_NOTIFICACION_CARRERA = 'carrera-en-vivo';
export const CATEGORIA_CARRERA = 'carrera-en-vivo';
export const CANAL_CARRERA = 'carrera-en-vivo';
export const ACCION_PAUSAR = 'pausar';
export const ACCION_ABRIR = 'abrir';

/** ¿Este aviso es el de la carrera? Con la app abierta no se muestra como banner: ya se ve la carrera. */
export function esAvisoDeCarrera(identificador: string | null | undefined): boolean {
  return identificador === ID_NOTIFICACION_CARRERA;
}
