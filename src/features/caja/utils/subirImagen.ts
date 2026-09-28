import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { Alert } from '../../../components/Alerta';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { almacenamientoSinConfigurar } from '../../community/api/wallApi';

/**
 * Las imágenes de la Caja Renaser (la foto de la caja armada, el comprobante del envío y el fondo de
 * la carta), en tres pasos como la portada de la bienvenida: pedir dónde subir → subir directo al
 * almacenamiento (`subirImagenAS3`, `arrayBuffer` y no multipart) → confirmar con la RUTA.
 *
 * Las piezas llegan inyectadas para probar cada salida sin teléfono ni red.
 */

export interface ImagenElegida {
  uri: string;
  mimeType: string;
}

export type ResultadoDeLaSubida<T> =
  | { tipo: 'cancelada' }
  | { tipo: 'lista'; valor: T }
  | { tipo: 'fallo'; mensaje: string };

export interface PiezasDeLaSubida<T> {
  elegir: () => Promise<ImagenElegida | null>;
  pedirSubida: (tipoContenido: string) => Promise<{ url: string; ruta: string }>;
  subir: (url: string, uri: string, tipoContenido: string) => Promise<void>;
  confirmar: (ruta: string) => Promise<T>;
  alSubir?: () => void;
}

export const SIN_ALMACENAMIENTO = 'Este servidor no tiene dónde guardar imágenes.';

export async function subirImagen<T>(piezas: PiezasDeLaSubida<T>): Promise<ResultadoDeLaSubida<T>> {
  const imagen = await piezas.elegir();
  if (!imagen) return { tipo: 'cancelada' };
  piezas.alSubir?.();

  let subida: { url: string; ruta: string };
  try {
    subida = await piezas.pedirSubida(imagen.mimeType);
  } catch (error) {
    return { tipo: 'fallo', mensaje: mensajeDeError(error, 'No se pudo preparar la subida.') };
  }
  // En local el almacenamiento es de marcador: un PUT a `about:blank#…` no sube nada.
  if (almacenamientoSinConfigurar(subida.url)) return { tipo: 'fallo', mensaje: SIN_ALMACENAMIENTO };
  try {
    await piezas.subir(subida.url, imagen.uri, imagen.mimeType);
  } catch (error) {
    const sinRed = error instanceof ApiError && error.esDeRed;
    return { tipo: 'fallo', mensaje: sinRed ? 'Sin conexión: la imagen no se subió.' : 'No se pudo subir la imagen.' };
  }
  try {
    return { tipo: 'lista', valor: await piezas.confirmar(subida.ruta) };
  } catch (error) {
    return { tipo: 'fallo', mensaje: mensajeDeError(error, 'No se pudo guardar la imagen.') };
  }
}

/** El ancho máximo al que se reduce: se lee bien un comprobante y no se suben 12 MP por datos móviles. */
const ANCHO_MAXIMO = 1600;

/**
 * Elige una foto de la galería o la toma con la cámara, sin recortar (un comprobante no es cuadrado),
 * y la deja en JPEG de hasta {@link ANCHO_MAXIMO} px. Pasar por el manipulador endereza la rotación
 * del EXIF. `null` si canceló o negó el permiso (ya se avisó).
 */
export async function elegirImagen(desde: 'galeria' | 'camara', para: string): Promise<ImagenElegida | null> {
  const permiso =
    desde === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      desde === 'camara' ? 'Permiso de cámara requerido' : 'Permiso de galería requerido',
      `Renaser lo necesita para ${para}.`,
    );
    return null;
  }
  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false };
  const resultado =
    desde === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
  const asset = resultado.canceled ? null : resultado.assets?.[0];
  if (!asset) return null;
  try {
    const ancho = asset.width > 0 ? Math.min(asset.width, ANCHO_MAXIMO) : ANCHO_MAXIMO;
    const renderizada = await ImageManipulator.manipulate(asset.uri).resize({ width: ancho }).renderAsync();
    const guardada = await renderizada.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return { uri: guardada.uri, mimeType: 'image/jpeg' };
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Prueba con otra imagen.');
    return null;
  }
}
