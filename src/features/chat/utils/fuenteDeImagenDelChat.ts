import type { ImageSource } from 'expo-image';

/**
 * De dónde sale la imagen de un mensaje del chat (fotos, tarjetas del programa y stickers),
 * 2026-10-01: la tarjeta del semáforo aparecía ~1 s después de su burbuja.
 *
 * La causa: `mediaUrl` es una URL firmada de S3 que el backend vuelve a firmar en CADA lectura de
 * mensajes. Con la URL como clave, la caché nunca acertaba y la foto se bajaba de nuevo cada vez
 * que se abría el chat. `mediaPath` (la ruta del objeto) no cambia: es la clave de caché. Con eso,
 * desde la segunda vez la foto sale del disco aunque la firma sea otra.
 *
 * **Tarjetas del semáforo empaquetadas.** Las tres JPG viajan dentro de la app y, si `mediaPath`
 * coincide EXACTAMENTE con la ruta versionada que sube el backend, se muestran sin red (también la
 * primera vez). Son byte a byte las de `src/main/resources/semaforo/tarjetas/` del backend, que
 * `TarjetasDelSemaforoEnRecursos` sube sin transformar a `ColorDeTarjeta.rutaEnAlmacenamiento()`.
 *
 * > **Al cambiar `ColorDeTarjeta.VERSION` en el backend (diseño nuevo) hay que actualizar esto:**
 * > copiar las JPG nuevas a `assets/semaforo/<color>-<VERSION>.jpg` y cambiar las rutas de abajo.
 * > Si no se hace, no se rompe nada: la ruta nueva no coincide y la tarjeta sale de la red (con
 * > caché), así que un diseño nuevo nunca muestra la imagen vieja.
 */
const TARJETAS_DEL_SEMAFORO_EMPAQUETADAS: Readonly<Record<string, number>> = {
  'semaforo/tarjetas/verde-v1.jpg': require('../../../../assets/semaforo/verde-v1.jpg'),
  'semaforo/tarjetas/amarillo-v1.jpg': require('../../../../assets/semaforo/amarillo-v1.jpg'),
  'semaforo/tarjetas/rojo-v1.jpg': require('../../../../assets/semaforo/rojo-v1.jpg'),
};

/**
 * La fuente para `expo-image`, o `null` si no hay nada que mostrar. Sin `mediaPath` (la foto
 * recién mandada, que se ve desde el archivo local) la clave queda la de siempre, la URL.
 */
export function fuenteDeImagenDelChat(
  mediaUrl: string | null | undefined,
  mediaPath: string | null | undefined
): ImageSource | number | null {
  const empaquetada = mediaPath ? TARJETAS_DEL_SEMAFORO_EMPAQUETADAS[mediaPath] : undefined;
  if (empaquetada !== undefined) {
    return empaquetada;
  }
  if (!mediaUrl) {
    return null;
  }
  return mediaPath ? { uri: mediaUrl, cacheKey: mediaPath } : { uri: mediaUrl };
}
