/**
 * Las medidas de la imagen del podio que se comparte (spec 006 del backend). En un archivo aparte para que la
 * lógica de captura (`compartirImagenDelPodio`) las lea sin traerse la tarjeta y sus imágenes.
 *
 * El lienzo mide 540 × 960 dp y la imagen sale a 1080 × 1920 px, el doble (9:16, el formato de historias). Se
 * dibuja a la mitad a propósito: una vista de 1080 × 1920 dp pesaría, a la densidad de un teléfono medio
 * (×2,75), unos 63 MB de bitmap solo para sacar una imagen; a 540 × 960 son ~16 MB, y `captureRef` la deja en
 * el tamaño exacto. Todo el diseño de la tarjeta está dado en esa escala: 1 dp = 2 px de la imagen.
 */
export const ANCHO_DE_LA_TARJETA = 540;
export const ALTO_DE_LA_TARJETA = 960;

/** La imagen que se guarda y se comparte. */
export const SALIDA_PX = { ancho: 1080, alto: 1920 } as const;
