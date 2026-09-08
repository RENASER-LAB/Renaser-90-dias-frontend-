import { Alert } from '../../../components/Alerta';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { TipoEvidencia } from '../api/evidenciaHabitoApi';

/**
 * Elegir/capturar el archivo de evidencia de un hábito. Solo selección y normalización — el
 * upload vive en `api/evidenciaHabitoApi.ts` y la orquestación en el modal.
 *
 * Se replica la forma de `features/community/utils/normalizarImagen.ts` (el Muro) en vez de
 * importarla: aquélla devuelve un `FotoMuroNormalizada` con `width`/`height` que acá no sirven,
 * y sobre todo `habits` no debe depender de `community`.
 */

/** Archivo listo para subir. `mimeType` viaja tal cual al firmar Y al hacer el PUT. */
export interface ArchivoEvidencia {
  uri: string;
  mimeType: string;
  tipo: TipoEvidencia;
  /** Para mostrar en la tarjeta ("foto_1234.jpg", "audio de 0:12"). */
  etiqueta: string;
  /**
   * Cuándo se tomó la foto, en ISO, o `null` si no se puede saber.
   *
   * **Para qué.** Las rocas diarias exigen este dato para las FOTO y lo comparan contra el
   * instante de subida con ±15 min de margen (Ley VI, `RocaDiariaService.requireExifDentroDeMargen`).
   * Es antifraude: evita subir hoy la foto de la semana pasada.
   *
   * **De dónde sale, y por qué no siempre se puede.** De la cámara sale del momento en que la app
   * vio la captura, que es un dato que la app sí puede atestiguar. De la galería sale del EXIF
   * `DateTimeOriginal` — y muchas imágenes no lo tienen: capturas de pantalla, fotos reenviadas por
   * WhatsApp, imágenes ya editadas. En ese caso vale `null` y **no se inventa**: quien decide qué
   * hacer con la falta es quien va a mandar la evidencia.
   *
   * Los hábitos no lo usan (su backend acepta `null`), así que para ellos es informativo.
   */
  tomadaEn: string | null;
}

/**
 * El EXIF viene como `"2026:09:08 14:32:10"` — con dos puntos también en la fecha, que `new Date()`
 * no entiende, y sin zona horaria (es hora local del teléfono que la sacó).
 *
 * Devuelve `null` ante cualquier cosa rara en vez de una fecha inventada: una fecha equivocada acá
 * termina en un `EXIF_MISMATCH` del servidor que el aprendiz no puede interpretar.
 */
function instanteDelExif(exif: Record<string, unknown> | null | undefined): string | null {
  const crudo = exif?.DateTimeOriginal ?? exif?.DateTime ?? exif?.DateTimeDigitized;
  if (typeof crudo !== 'string') return null;
  const partes = crudo.trim().match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!partes) return null;
  const [, anio, mes, dia, hora, minuto, segundo] = partes;
  const fecha = new Date(
    Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo)
  );
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/**
 * expo-image-picker no siempre informa el MIME real: en Android suele venir `undefined` y en
 * iOS a veces llega el genérico `image`. Se deriva de la extensión, con un default sensato.
 * Importa que sea exacto porque es lo que S3 firma.
 */
function mimeDeVideo(uri: string, declarado?: string | null): string {
  if (declarado && declarado.includes('/')) return declarado;
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  if (extension === '3gp') return 'video/3gpp';
  return 'video/mp4';
}

function nombreDe(uri: string, porDefecto: string): string {
  const ultimo = uri.split('?')[0].split('/').pop();
  return ultimo && ultimo.trim() ? ultimo : porDefecto;
}

/**
 * Reencodea a JPEG con el ancho acotado. Dos motivos, los dos importantes acá:
 *  - una foto de 12 MP de un teléfono moderno son varios MB por una ducha fría;
 *  - pasar por el manipulador aplica la rotación EXIF, así que la evidencia no queda de costado.
 */
async function normalizarFoto(
  asset: ImagePicker.ImagePickerAsset,
  tomadaEn: string | null,
): Promise<ArchivoEvidencia> {
  const anchoDestino = asset.width > 0 ? Math.min(asset.width, 1440) : 1440;
  // API contextual de `expo-image-manipulator@57`: la vieja `manipulateAsync` está deprecada.
  const renderizada = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: anchoDestino })
    .renderAsync();
  const resultado = await renderizada.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return {
    uri: resultado.uri,
    mimeType: 'image/jpeg',
    tipo: 'FOTO',
    etiqueta: asset.fileName?.trim() || nombreDe(resultado.uri, `foto_${Date.now()}.jpg`),
    tomadaEn,
  };
}

/** Galería → foto. Devuelve `null` si el aprendiz canceló o negó el permiso (nunca lanza). */
export async function elegirFotoDeGaleria(): Promise<ArchivoEvidencia | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de galería requerido',
      'Renaser necesita acceder a tus fotos para que puedas subir la evidencia de tu hábito.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
    // El reencodeo de abajo borra el EXIF, así que hay que leerlo ACÁ, del asset original.
    exif: true,
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  try {
    const asset = resultado.assets[0];
    return await normalizarFoto(asset, instanteDelExif(asset.exif));
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Probá con otra imagen.');
    return null;
  }
}

/** Cámara → foto. El permiso de cámara es distinto del de galería y se pide aparte. */
export async function tomarFotoConCamara(): Promise<ArchivoEvidencia | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de cámara requerido',
      'Renaser necesita la cámara para que puedas tomar la foto de tu evidencia.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: true });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  try {
    const asset = resultado.assets[0];
    // Se prefiere el EXIF de la cámara; si el teléfono no lo escribió, vale el instante en que la
    // app recibió la captura, que acaba de pasar y la app sí puede atestiguar.
    return await normalizarFoto(asset, instanteDelExif(asset.exif) ?? new Date().toISOString());
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Probá sacarla de nuevo.');
    return null;
  }
}

/**
 * Galería → video. NO se reencodea: transcodificar video en el teléfono es caro y lento, y
 * `expo-image-manipulator` es solo para imágenes. Se sube tal cual llegó.
 */
export async function elegirVideoDeGaleria(): Promise<ArchivoEvidencia | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de galería requerido',
      'Renaser necesita acceder a tus videos para que puedas subir la evidencia de tu hábito.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: false,
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  const asset = resultado.assets[0];
  return {
    uri: asset.uri,
    mimeType: mimeDeVideo(asset.uri, asset.mimeType),
    tipo: 'VIDEO',
    etiqueta: asset.fileName?.trim() || nombreDe(asset.uri, `video_${Date.now()}.mp4`),
    // Solo las FOTO tienen exigencia de instante (Ley VI). Un video no la tiene.
    tomadaEn: null,
  };
}

/** Cámara → video. */
export async function grabarVideoConCamara(): Promise<ArchivoEvidencia | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de cámara requerido',
      'Renaser necesita la cámara para que puedas grabar la evidencia de tu hábito.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  const asset = resultado.assets[0];
  return {
    uri: asset.uri,
    mimeType: mimeDeVideo(asset.uri, asset.mimeType),
    tipo: 'VIDEO',
    etiqueta: asset.fileName?.trim() || nombreDe(asset.uri, `video_${Date.now()}.mp4`),
    // Solo las FOTO tienen exigencia de instante (Ley VI). Un video no la tiene.
    tomadaEn: null,
  };
}

/**
 * MIME del audio grabado por `expo-audio`. El preset `HIGH_QUALITY` graba `.m4a` en iOS y en
 * Android; el `.3gp` solo aparece con `LOW_QUALITY`, pero se contempla igual porque la ruta del
 * archivo es lo único observable desde acá.
 */
export function mimeDeAudio(uri: string): string {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === '3gp') return 'audio/3gpp';
  if (extension === 'caf') return 'audio/x-caf';
  if (extension === 'wav') return 'audio/wav';
  return 'audio/m4a';
}

/** "0:07", "1:24" — para etiquetar el audio grabado sin depender de una librería de fechas. */
export function duracionLegible(segundos: number): string {
  const enteros = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(enteros / 60);
  const resto = enteros % 60;
  return `${minutos}:${resto.toString().padStart(2, '0')}`;
}
