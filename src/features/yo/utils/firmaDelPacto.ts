import { claveDeCacheDeLaFoto } from '../../evidence/utils/fotoDeEvidencia';

/** Lo que `expo-image` necesita para pintar la firma del Pacto. */
export interface FuenteDeLaFirma {
  uri: string;
  cacheKey: string;
}

/**
 * De dónde sale la imagen de la firma del Pacto en Yo (2026-10-05, pedido del dueño; backend D-253,
 * `GET /api/v1/onboarding/pact/signature`).
 *
 * La URL es una firma de S3 de 15 minutos que el backend emite de nuevo cada vez que se abre el Pacto:
 * con la URL como clave la caché no acertaría nunca. La clave es la URL **sin la firma** (sin `?…`), la
 * dirección del objeto, igual que la foto de una evidencia (`fuenteDeFotoDeEvidencia`): una por firma y
 * estable entre aperturas.
 *
 * `null` si no hay nada que pintar: sin URL, o una que no es de la red (el almacenamiento de marcador del
 * entorno local devuelve `about:blank#…`). Ahí el Pacto queda con «Firmado el …», como antes.
 */
export function fuenteDeLaFirma(url: string | null | undefined): FuenteDeLaFirma | null {
  if (!url || !/^https?:\/\//i.test(url)) {
    return null;
  }
  return { uri: url, cacheKey: claveDeCacheDeLaFoto(url) };
}
