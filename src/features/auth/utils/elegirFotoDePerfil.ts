import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// El `Alert` del proyecto, no el de react-native: en web aquel no existe y el aviso se perderia.
import { Alert } from '../../../components/Alerta';

/** Lo que hace falta para subir una foto de perfil, y nada más. */
export interface FotoDePerfil {
  uri: string;
  mimeType: string;
}

/**
 * El lado del cuadrado al que se reduce la foto antes de subirla.
 *
 * 512 px es de sobra: el avatar más grande que la app dibuja son 70 px lógicos, que en una pantalla
 * de densidad 3 son 210 físicos. Subir los 12 MP originales de un teléfono moderno para mostrarlos
 * ahí es varios MB por una foto que nadie va a ver a ese tamaño — y esos MB los paga la persona en
 * datos al subir, y otra vez cada quien abra la app.
 */
export const LADO_DEL_AVATAR = 512;

/**
 * Elegir y encuadrar la foto de perfil.
 *
 * **Por qué no se reusa `elegirFotoDeGaleria` de hábitos.** Porque es el selector de EVIDENCIAS y
 * se nota: pide el permiso diciendo *"para que puedas subir la evidencia de tu hábito"* —a alguien
 * que está cambiando su foto de perfil—, lee el EXIF para la exigencia de instante de la Ley VI,
 * que a un avatar no le aplica, y sobre todo **no recorta**. Sin recorte, una foto apaisada entra
 * al círculo del avatar tal cual y queda con la cara fuera del encuadre. Eso era lo que se veía.
 *
 * **El recorte es el nativo, no uno propio.** `allowsEditing` con `aspect: [1, 1]` abre el editor
 * del sistema —el mismo que usan Facebook, WhatsApp e Instagram en Android—, donde se arrastra y se
 * hace zoom hasta encuadrar, y devuelve la foto ya cuadrada. Escribir un recortador propio con
 * gestos sería mucho código, y peor: uno que no se comporta como el que la persona ya conoce.
 *
 * Después del recorte se reduce a {@link LADO_DEL_AVATAR} y se reencodea a JPEG. Pasar por el
 * manipulador además aplica la rotación del EXIF, así que una foto tomada de costado no se sube
 * acostada.
 *
 * Devuelve `null` si canceló o negó el permiso — nunca lanza.
 */
export async function elegirFotoDePerfil(): Promise<FotoDePerfil | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso de galería requerido',
      'Renaser necesita acceder a tus fotos para que puedas elegir tu foto de perfil.',
    );
    return null;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
    // El editor del sistema, en cuadrado: es lo que deja centrar la cara dentro del círculo.
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (resultado.canceled || !resultado.assets?.[0]) return null;
  try {
    return await reducirACuadrado(resultado.assets[0].uri);
  } catch {
    Alert.alert('No se pudo procesar la foto', 'Prueba con otra imagen.');
    return null;
  }
}

/**
 * Reduce a un cuadrado de {@link LADO_DEL_AVATAR} y reencodea a JPEG.
 *
 * Se piden las dos dimensiones y no solo el ancho: el editor ya devolvió un cuadrado, así que fijar
 * las dos no deforma nada, y deja el resultado en una medida conocida pase lo que pase. Si algún
 * día el recorte se hiciera opcional, esto seguiría entregando algo que entra bien en el círculo.
 */
async function reducirACuadrado(uri: string): Promise<FotoDePerfil> {
  const renderizada = await ImageManipulator.manipulate(uri)
    .resize({ width: LADO_DEL_AVATAR, height: LADO_DEL_AVATAR })
    .renderAsync();
  const resultado = await renderizada.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return { uri: resultado.uri, mimeType: 'image/jpeg' };
}
