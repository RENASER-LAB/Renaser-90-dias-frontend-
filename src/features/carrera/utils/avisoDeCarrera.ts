/**
 * Los identificadores de la notificación fija de la carrera (spec 042, FR-011). Aparte y sin dependencias para que el manejador de
 * avisos de la app (`habits/notificaciones/recordatoriosDeHabito`) los pueda usar sin un ciclo de importaciones.
 */
export const ID_NOTIFICACION_CARRERA = 'carrera-en-vivo';
/** Los botones «Pausar» y «Abrir» (corriendo). */
export const CATEGORIA_CARRERA = 'carrera-en-vivo';
/** Los botones «Seguir» y «Abrir» (en pausa). Android no cambia los botones de una categoría: son dos. */
export const CATEGORIA_CARRERA_EN_PAUSA = 'carrera-en-pausa';
export const CANAL_CARRERA = 'carrera-en-vivo';
export const ACCION_PAUSAR = 'pausar';
export const ACCION_SEGUIR = 'seguir';
export const ACCION_ABRIR = 'abrir';

/**
 * El id de Android de la notificación del servicio en primer plano de `expo-location` (fijo por
 * `scripts/arreglar-notificacion-de-carrera.js`). La de la carrera se publica con ese id y sin tag, así REEMPLAZA a la del
 * servicio y queda UNA sola notificación (FR-011). Tiene que coincidir con el del script: lo vigila `notificacionUnica.test.ts`.
 */
export const ID_ANDROID_DEL_SERVICIO_GPS = 481756;

/** ¿Este aviso es el de la carrera? Con la app abierta no se muestra como banner: ya se ve la carrera. */
export function esAvisoDeCarrera(identificador: string | null | undefined): boolean {
  return identificador === ID_NOTIFICACION_CARRERA;
}
