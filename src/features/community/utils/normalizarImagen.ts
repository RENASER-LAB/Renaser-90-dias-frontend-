import { Alert } from '../../../components/Alerta';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Selección y normalización de la foto para "Nueva publicación" del Muro (`ComunidadScreen.tsx`,
 * modal `createPostModalVisible`). El backend exige al menos un archivo por publicación
 * (`Publicacion.MEDIA_MIN = 1`, "una publicación sin foto rompe la retícula" —
 * `community/domain/model/publicacion/Publicacion.java`), así que esto deja de ser opcional.
 *
 * Verificado contra la documentación versionada de Expo SDK 57
 * (https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/ y .../sdk/imagemanipulator/):
 * `expo-image-picker@57` pide permiso con `requestMediaLibraryPermissionsAsync` y devuelve
 * `{ canceled, assets }`; `expo-image-manipulator@57` reemplazó la vieja `manipulateAsync`
 * (marcada `@deprecated` en su propio `.d.ts`) por la API contextual
 * `ImageManipulator.manipulate(uri).resize(...).renderAsync()` + `ImageRef.saveAsync(...)`.
 */

/** Ancho máximo de subida: ver el porqué en `normalizarFoto`. */
const ANCHO_MAXIMO_PX = 1440;
const CALIDAD_JPEG = 0.8;

export interface FotoMuroNormalizada {
  /** URI local del archivo ya normalizado (JPEG), lista para leer sus bytes y subir a S3. */
  uri: string;
  mimeType: string;
  /** Solo para el label del chip en el modal — no es identidad real del archivo. */
  nombre: string;
  width: number;
  height: number;
}

/**
 * Pide permiso de galería, abre el selector y devuelve la foto ya normalizada. `null` si la
 * persona canceló o si el permiso quedó denegado — en ambos casos ya se avisó con `Alert.alert`
 * (mismo patrón que el resto de la pantalla, ver `mensajeDeError` en `ComunidadScreen.tsx`), así
 * que quien llama solo necesita cortar el flujo sin mostrar nada más.
 */
export async function elegirYNormalizarFotoMuro(): Promise<FotoMuroNormalizada | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de galería requerido',
      'Para adjuntar una foto a tu publicación, Renaser necesita acceso a tu galería. Puedes habilitarlo desde los ajustes del teléfono e intentar de nuevo.'
    );
    return null;
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1, // sin compresión acá: la compresión real pasa después, ya normalizada
    allowsMultipleSelection: false, // "Agregar" del modal ya soporta repetir la selección una por una
  });
  if (resultado.canceled || !resultado.assets?.[0]) {
    return null;
  }

  try {
    return await normalizarFoto(resultado.assets[0]);
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Probá con otra imagen, o intentá de nuevo en un momento.');
    return null;
  }
}

async function normalizarFoto(asset: ImagePicker.ImagePickerAsset): Promise<FotoMuroNormalizada> {
  // El ancho de salida nunca supera ANCHO_MAXIMO_PX, pero tampoco agranda una foto que ya venía
  // más chica: subir de más una foto de 12 MP por datos móviles es lento y llena el bucket sin
  // necesidad, pero interpolar hacia arriba una foto angosta solo la afea.
  const anchoDestino = asset.width > 0 ? Math.min(asset.width, ANCHO_MAXIMO_PX) : ANCHO_MAXIMO_PX;

  // Pasar la foto por el manipulador -aunque sea solo para achicarla- ya corrige la orientación:
  // el decodificador nativo que usa expo-image-manipulator (UIImage en iOS, BitmapFactory +
  // ExifInterface en Android) lee el tag EXIF de orientación al abrir el archivo y entrega los
  // píxeles ya "derechos", sin el tag. Es la causa nº1 de fotos "de costado" que pidió corregir
  // el dueño del proyecto, y se resuelve solo con pasar la imagen por acá — rotar a mano leyendo
  // el tag nosotros mismos rotaría dos veces. (Sin dispositivo real a mano en este entorno para
  // confirmarlo en carne propia: queda como lo único de este archivo sin verificar en un teléfono,
  // ver el informe de la tarea.)
  const renderizada = await ImageManipulator.manipulate(asset.uri).resize({ width: anchoDestino }).renderAsync();

  // Sin recorte a un aspecto fijo, a propósito: la "retícula" del Muro
  // (ComunidadScreen.tsx, styles.mediaSingleBox/mediaHalfBox/mediaLargeLeft/mediaSmallRight) hoy
  // son cajas de ALTURA fija pero ANCHO flexible (según cuántas fotos tenga el post, no según la
  // proporción de cada foto), rellenas con un texto ("📷 Foto 1"), no con un <Image> real — no
  // existe ningún `resizeMode` en esta pantalla para el feed del Muro. No hay ninguna proporción
  // de diseño real que "leer" y respetar todavía, así que forzar un recorte cuadrado o 4:5 sería
  // inventar una regla que el diseño no tiene. Se conserva la proporción original de la foto:
  // una vertical sigue vertical, una horizontal sigue horizontal — "manejar vertical y horizontal"
  // sin descartar contenido de ninguna de las dos.
  const resultado = await renderizada.saveAsync({ compress: CALIDAD_JPEG, format: SaveFormat.JPEG });

  return {
    uri: resultado.uri,
    mimeType: 'image/jpeg',
    nombre: asset.fileName?.trim() || `foto_${Date.now()}.jpg`,
    width: resultado.width,
    height: resultado.height,
  };
}
