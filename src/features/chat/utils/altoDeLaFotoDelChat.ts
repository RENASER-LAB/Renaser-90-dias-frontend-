/**
 * Qué alto lleva una foto en su burbuja (el ancho es siempre 240), 2026-10-07.
 *
 * La burbuja era siempre cuadrada con `cover`, y el podio de la semana (D-262 del backend, 1080 × 1350,
 * 4:5) salía recortado arriba y abajo: no se veían el encabezado ni la frase final. Con su proporción
 * real la burbuja ya tiene el tamaño final antes de que baje la imagen, así que no salta.
 *
 * Se decide por la ruta porque la respuesta no trae las medidas. Las demás fotos siguen cuadradas: las
 * tarjetas del semáforo son 1:1 y las fotos de la gente no tienen una proporción fija.
 */
export const ANCHO_DE_LA_FOTO = 240;

const PODIO_DE_LA_SEMANA = 'ranking-semanal/';
const PROPORCION_DEL_PODIO = 1350 / 1080;

export function altoDeLaFotoDelChat(mediaPath: string | null | undefined): number {
  if (mediaPath?.startsWith(PODIO_DE_LA_SEMANA)) {
    return Math.round(ANCHO_DE_LA_FOTO * PROPORCION_DEL_PODIO);
  }
  return ANCHO_DE_LA_FOTO;
}
