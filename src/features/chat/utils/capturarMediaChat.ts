import { Alert } from '../../../components/Alerta';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Elegir o capturar la foto que se manda por chat, y derivar el MIME del audio grabado. Solo
 * selección y normalización — la subida vive en `api/chatApi.ts` y la orquestación en
 * `hooks/useEnvioMediaChat.ts`.
 *
 * Se replica la forma de `features/habits/utils/capturarEvidencia.ts` en vez de importarla, por
 * el mismo motivo por el que aquélla replicó a la del Muro: `chat` no debe depender de `habits`,
 * y aquélla devuelve un `ArchivoEvidencia` con un `tipo` ('FOTO'/'AUDIO'/'VIDEO') que pertenece
 * al contrato de evidencias y acá no significa nada.
 */

/** Archivo listo para subir. `mimeType` viaja tal cual al firmar Y al hacer el PUT: S3 firma
 * incluyendo el `Content-Type`, así que si los dos no coinciden responde 403. */
export interface ArchivoChat {
  uri: string;
  mimeType: string;
}

/**
 * Reencodea a JPEG con el ancho acotado. Dos motivos, los dos importantes en un chat:
 *  - una foto de 12 MP son varios MB, y acá se mandan de a una y seguido;
 *  - pasar por el manipulador aplica la rotación EXIF, así que la foto no llega de costado.
 */
async function normalizarFoto(asset: ImagePicker.ImagePickerAsset): Promise<ArchivoChat> {
  const anchoDestino = asset.width > 0 ? Math.min(asset.width, 1440) : 1440;
  // API contextual de `expo-image-manipulator@57`: la vieja `manipulateAsync` está deprecada.
  const renderizada = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: anchoDestino })
    .renderAsync();
  const resultado = await renderizada.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return { uri: resultado.uri, mimeType: 'image/jpeg' };
}

/** Galería → foto. Devuelve `null` si se canceló o se negó el permiso (nunca lanza). */
export async function elegirFotoDeGaleriaChat(): Promise<ArchivoChat | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de galería requerido',
      'Renaser necesita acceder a tus fotos para que puedas mandarlas por chat.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  try {
    return await normalizarFoto(resultado.assets[0]);
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Probá con otra imagen.');
    return null;
  }
}

/** Cámara → foto. El permiso de cámara es distinto del de galería y se pide aparte. */
export async function tomarFotoConCamaraChat(): Promise<ArchivoChat | null> {
  const permiso = await ImagePicker.requestCameraPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de cámara requerido',
      'Renaser necesita la cámara para que puedas mandar una foto por chat.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  try {
    return await normalizarFoto(resultado.assets[0]);
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Probá sacarla de nuevo.');
    return null;
  }
}

/**
 * MIME del audio grabado por `expo-audio`. El preset `HIGH_QUALITY` graba `.m4a` en iOS y en
 * Android; el resto se contempla igual porque la ruta del archivo es lo único observable acá.
 */
export function mimeDeAudioChat(uri: string): string {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === '3gp') return 'audio/3gpp';
  if (extension === 'caf') return 'audio/x-caf';
  if (extension === 'wav') return 'audio/wav';
  return 'audio/m4a';
}
