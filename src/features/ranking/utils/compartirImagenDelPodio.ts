import { PixelRatio, Platform } from 'react-native';

import { SALIDA_PX } from './medidasDelPodio';

/**
 * Saca la imagen del podio de la pantalla y se la entrega a quien la pidió (spec 006 del backend, pedido del
 * dueño: «que haya opción para descargar en los podios»):
 *
 * - **Teléfono**: `captureRef` (`react-native-view-shot`, ya instalado, el mismo que usa la firma) la deja en un
 *   archivo temporal PNG y se abre la hoja de compartir del sistema con `expo-sharing` (WhatsApp, historias de
 *   Instagram, «Guardar imagen»…).
 * - **Web**: no hay hoja de compartir para un archivo local (la Web Share API no comparte archivos locales y
 *   casi ningún navegador la tiene), así que `captureRef` (html2canvas) da un data URI y se baja como archivo
 *   con un `<a download>`.
 *
 * Todo lo de afuera entra por un `entorno` inyectable, para probar cada salida sin teléfono (mismo estilo que
 * `caja/utils/archivosConSesion`). Nunca lanza: devuelve qué pasó.
 *
 * **Cancelar la hoja de compartir no es un error.** Android e iOS resuelven la promesa al cerrarla; la Web Share
 * API (y alguna versión de iOS) la rechaza con `AbortError`: eso también cuenta como «cancelado» y no se avisa.
 */

export type ResultadoDeCompartir =
  | { ok: true; via: 'hoja' | 'archivo' }
  | { ok: false; motivo: 'cancelado' }
  | { ok: false; motivo: 'sin-compartir' }
  | { ok: false; motivo: 'fallo'; detalle: string };

export interface PedidoDeCaptura {
  /** La vista de la tarjeta (el ref de `TarjetaDelPodioParaCompartir`). */
  vista: unknown;
  /** El nombre del archivo, con `.png`: `podio-general-2026-10-19.png`. */
  nombreDelArchivo: string;
}

export interface EntornoDeLaImagen {
  esWeb: boolean;
  /** Captura la vista a 1080 × 1920 px. Teléfono: `uri` de un archivo PNG. Web: un data URI. Lanza si falla. */
  capturar: (vista: unknown, opciones: { nombreDelArchivo: string; formato: 'archivo' | 'data-uri' }) => Promise<string>;
  /** Teléfono: abre la hoja de compartir. `false` si el teléfono no puede compartir. Rechaza si el sistema falla. */
  compartir: (uri: string, opciones: { titulo: string }) => Promise<boolean>;
  /** Web: baja el archivo con ese nombre. */
  bajarEnElNavegador: (dataUri: string, nombreDelArchivo: string) => void;
}

/**
 * Cuántas unidades pedirle a `captureRef` para que la imagen salga exactamente a 1080 × 1920 px.
 *
 * `captureRef` documenta `width` y `height` en píxeles lógicos, pero no se comporta igual en todos lados:
 * en Android (`ViewShot.java`, `Bitmap.createScaledBitmap`) y en la web (el lienzo de html2canvas) son
 * PÍXELES de la imagen; en iOS son puntos y se multiplican por la densidad de la pantalla. La tarjeta se dibuja
 * a 540 × 960 dp, así que en cualquier densidad el resultado se escala al tamaño pedido y siempre sale igual.
 */
export function medidasDeLaCaptura(
  plataforma: string = Platform.OS,
  densidad: number = PixelRatio.get(),
): { ancho: number; alto: number } {
  if (plataforma === 'ios') return { ancho: SALIDA_PX.ancho / densidad, alto: SALIDA_PX.alto / densidad };
  return { ancho: SALIDA_PX.ancho, alto: SALIDA_PX.alto };
}

/** ¿El error es que la persona cerró la hoja de compartir o el diálogo del navegador? */
export function fueCancelado(error: unknown): boolean {
  const nombre = error instanceof Error ? error.name : '';
  const texto = `${nombre} ${error instanceof Error ? error.message : String(error ?? '')}`;
  return /abort|cancel/i.test(texto);
}

export const TITULO_DE_LA_HOJA = 'Compartir el podio';

export async function compartirImagenDelPodio(
  pedido: PedidoDeCaptura,
  entorno: EntornoDeLaImagen = entornoDeLaPlataforma(),
): Promise<ResultadoDeCompartir> {
  try {
    if (entorno.esWeb) {
      const dataUri = await entorno.capturar(pedido.vista, { nombreDelArchivo: pedido.nombreDelArchivo, formato: 'data-uri' });
      entorno.bajarEnElNavegador(dataUri, pedido.nombreDelArchivo);
      return { ok: true, via: 'archivo' };
    }
    const uri = await entorno.capturar(pedido.vista, { nombreDelArchivo: pedido.nombreDelArchivo, formato: 'archivo' });
    const compartida = await entorno.compartir(uri, { titulo: TITULO_DE_LA_HOJA });
    return compartida ? { ok: true, via: 'hoja' } : { ok: false, motivo: 'sin-compartir' };
  } catch (error) {
    if (fueCancelado(error)) return { ok: false, motivo: 'cancelado' };
    return { ok: false, motivo: 'fallo', detalle: error instanceof Error ? error.message : String(error) };
  }
}

// ─── El entorno real ────────────────────────────────────────────────────────

/** El archivo de la captura anterior: se borra al sacar la siguiente (ver `capturar`). */
let ultimoArchivo: string | null = null;

/**
 * `react-native-view-shot` y `expo-sharing` se cargan recién al usarse: así las pruebas de lo demás no
 * dependen de sus módulos nativos, y un binario sin alguno de los dos falla acá, con un aviso, y no al abrir
 * Comunidad.
 */
async function capturar(
  vista: unknown,
  opciones: { nombreDelArchivo: string; formato: 'archivo' | 'data-uri' },
  plataforma: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { captureRef, releaseCapture } = require('react-native-view-shot') as typeof import('react-native-view-shot');
  const { ancho, alto } = medidasDeLaCaptura(plataforma);
  // `fileName` (solo Android, 3 caracteres como mínimo): el archivo que se comparte lleva un nombre que se
  // entiende, no «ReactNative-snapshot-image…». El sistema le agrega un número y la extensión.
  const fileName = opciones.nombreDelArchivo.replace(/\.png$/i, '');
  const resultado = await captureRef(vista as Parameters<typeof captureRef>[0], {
    format: 'png',
    quality: 1,
    result: opciones.formato === 'data-uri' ? 'data-uri' : 'tmpfile',
    width: ancho,
    height: alto,
    fileName,
  });
  if (opciones.formato === 'data-uri') return resultado;
  /* No se borra el archivo al terminar de compartir: `shareAsync` vuelve al cerrarse la hoja, y la app que la
     recibió (WhatsApp, Instagram) puede leerlo un momento después. Se suelta el de la vez anterior. */
  if (ultimoArchivo) {
    try {
      releaseCapture(ultimoArchivo);
    } catch {
      // Un archivo temporal que no se pudo borrar lo limpia el sistema; no es motivo para fallar.
    }
  }
  ultimoArchivo = resultado;
  return resultado.startsWith('/') ? `file://${resultado}` : resultado;
}

async function compartir(uri: string, opciones: { titulo: string }): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: opciones.titulo });
  return true;
}

function bajarEnElNavegador(dataUri: string, nombreDelArchivo: string): void {
  if (typeof document === 'undefined') return;
  const enlace = document.createElement('a');
  enlace.href = dataUri;
  enlace.download = nombreDelArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

export function entornoDeLaPlataforma(esWeb: boolean = Platform.OS === 'web'): EntornoDeLaImagen {
  const plataforma = esWeb ? 'web' : Platform.OS;
  return { esWeb, capturar: (vista, opciones) => capturar(vista, opciones, plataforma), compartir, bajarEnElNavegador };
}
