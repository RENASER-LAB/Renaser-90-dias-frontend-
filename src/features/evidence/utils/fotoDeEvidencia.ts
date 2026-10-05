import type { EvidenciaApi } from '../api/evidenceSchemas';

/** Lo que `expo-image` necesita para pintar la foto de una evidencia. */
export interface FuenteDeFotoDeEvidencia {
  uri: string;
  cacheKey: string;
}

/**
 * De dónde sale la foto de la miniatura de una evidencia (2026-10-05, pedido del dueño: «¿mostrar
 * la foto real de cada evidencia en Yo?» → sí).
 *
 * `fotoUrl` es una URL firmada de S3 que el backend vuelve a firmar en CADA listado (D-252): con la
 * URL como clave, la caché no acertaría nunca y la foto se bajaría de nuevo cada vez que se abre Yo.
 * Es el mismo problema que resolvió `fuenteDeImagenDelChat`. La clave es la URL **sin la firma**
 * (sin `?…`): la dirección del objeto en el almacenamiento, que es una por evidencia y no cambia
 * entre firmas. Y es la misma clave que usa el visor (`ImageViewerModal`), así que al tocar la
 * miniatura la foto grande sale del disco, sin volver a bajarla.
 *
 * `null` cuando no hay nada que mostrar —la evidencia no es una foto, el backend es anterior a
 * D-252, o la URL no es de la red (el almacenamiento de marcador del entorno local devuelve
 * `about:blank#…`)— y la miniatura queda con el ícono de su tipo, como antes.
 */
export function fuenteDeFotoDeEvidencia(
  evidencia: Pick<EvidenciaApi, 'fotoUrl'>
): FuenteDeFotoDeEvidencia | null {
  const url = evidencia.fotoUrl;
  if (!url || !/^https?:\/\//i.test(url)) {
    return null;
  }
  return { uri: url, cacheKey: claveDeCacheDeLaFoto(url) };
}

/** La dirección del objeto sin la firma. Igual que `cacheKeyEstable` del visor del Muro. */
export function claveDeCacheDeLaFoto(url: string): string {
  return url.split('?')[0];
}
