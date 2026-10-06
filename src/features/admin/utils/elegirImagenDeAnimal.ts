import * as ImagePicker from 'expo-image-picker';

import { Alert } from '../../../components/Alerta';
import type { ImagenElegida } from './imagenDeAnimal';

/**
 * Elegir de la galería la imagen de un animal. Sin recorte ni reencodeado: el animal va recortado con
 * fondo transparente y pasar por el selector cuadrado de las fotos de perfil lo cuadraría y lo
 * convertiría en JPEG (sin transparencia). Devuelve `null` si canceló o negó el permiso — nunca lanza.
 */
export async function elegirImagenDeAnimal(): Promise<ImagenElegida | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert('Permiso de galería requerido', 'Renaser necesita acceder a tus fotos para que puedas elegir la imagen del animal.');
    return null;
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
    allowsEditing: false,
  });
  const asset = resultado.canceled ? null : resultado.assets?.[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/png',
    peso: asset.fileSize ?? null,
    ancho: asset.width ?? null,
    alto: asset.height ?? null,
  };
}
