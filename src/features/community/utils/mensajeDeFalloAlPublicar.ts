import { ApiError, mensajeDeError } from '../../../services/http/apiClient';

/** Lo que se dice cuando la publicación no llegó por la red (sin conexión, o la foto no se pudo subir). */
export const SIN_CONEXION_AL_PUBLICAR = 'No pudimos publicar. Revisa tu conexión e inténtalo de nuevo.';
/** Cualquier otro fallo sin un motivo pensado para leerse. */
export const FALLO_AL_PUBLICAR = 'No pudimos publicar. Intenta de nuevo en un momento.';

/**
 * Qué se le dice a la persona cuando publicar en el Muro falla (issue #149).
 *
 * Antes se mostraba `error.message` de cualquier error que no fuera `ApiError`: la subida de la foto a S3 es un `fetch` directo
 * y su fallo decía «fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9002». Y un fallo de red
 * del servidor decía «Revisa que el backend esté corriendo», un texto para quien programa. Ahora:
 * - un fallo de red (ApiError con estado 0) o cualquier error que no venga del servidor → {@link SIN_CONEXION_AL_PUBLICAR};
 * - una respuesta del servidor → su motivo, si está pensado para leerse (`mensajeDeError`), o {@link FALLO_AL_PUBLICAR}.
 */
export function mensajeDeFalloAlPublicar(error: unknown): string {
  if (!(error instanceof ApiError)) return SIN_CONEXION_AL_PUBLICAR;
  if (error.esDeRed) return SIN_CONEXION_AL_PUBLICAR;
  if (error.status >= 500) return FALLO_AL_PUBLICAR;
  const mensaje = mensajeDeError(error, FALLO_AL_PUBLICAR);
  // «Forbidden», «Bad Request»…: el texto por defecto de Spring, en inglés, no es un motivo.
  return /^[A-Za-z ]+$/.test(mensaje.trim()) ? FALLO_AL_PUBLICAR : mensaje;
}
