import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { Alert } from '../../../components/Alerta';
import { almacenamientoSinConfigurar, subirImagenAS3 } from '../../community/api/wallApi';
import { confirmarPortada, solicitarUrlDePortada } from '../api/eventosApi';
import type { Evento } from '../types/eventos.types';

/**
 * La portada opcional de un evento (Alquimista y Admin; pedido del dueño del 2026-09-26: las tarjetas
 * de eventos «como cursos»). Mismo flujo de tres pasos que el Muro y el avatar, y con sus mismas
 * piezas: `expo-image-picker` + `expo-image-manipulator` (ya en la app, cero dependencias nuevas) y
 * `subirImagenAS3` / `almacenamientoSinConfigurar` del Muro para el `PUT` directo al almacenamiento.
 *
 * No se reusa `elegirYNormalizarFotoMuro` porque pide el permiso hablando de «tu publicación» y no
 * recorta; ni `elegirFotoDePerfil`, que recorta en cuadrado. La portada se dibuja apaisada (la caja de
 * los cursos, 185 px de alto a lo ancho de la tarjeta), así que el editor del sistema recorta en 16:9.
 */

/** El ancho al que se reduce: la tarjeta ocupa el ancho del teléfono (≤ 1440 px físicos). */
const ANCHO_DE_PORTADA = 1280;

export interface PortadaElegida {
  uri: string;
  mimeType: string;
}

/** Abre la galería con recorte 16:9. `null` si canceló o negó el permiso (ya se avisó). Nunca lanza. */
export async function elegirPortada(): Promise<PortadaElegida | null> {
  try {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        'Permiso de galería requerido',
        'Para elegir la portada del evento, Renaser necesita acceso a tus fotos. Puedes habilitarlo desde los ajustes del teléfono.',
      );
      return null;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [16, 9],
    });
    const asset = resultado.canceled ? null : resultado.assets?.[0];
    if (!asset) return null;
    const ancho = asset.width > 0 ? Math.min(asset.width, ANCHO_DE_PORTADA) : ANCHO_DE_PORTADA;
    // Pasar por el manipulador también endereza la foto según su EXIF (ver `normalizarImagen.ts`).
    const renderizada = await ImageManipulator.manipulate(asset.uri).resize({ width: ancho }).renderAsync();
    const guardada = await renderizada.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return { uri: guardada.uri, mimeType: 'image/jpeg' };
  } catch {
    Alert.alert('No se pudo usar esa imagen', 'Prueba con otra.');
    return null;
  }
}

/**
 * Sube la portada de un evento ya guardado: URL prefirmada → `PUT` de los bytes → confirmar la ruta.
 * Lanza si algún paso falla; quien llama decide qué decir (el evento ya quedó guardado).
 */
export async function subirPortada(eventoId: string, portada: PortadaElegida): Promise<Evento> {
  const { url, ruta } = await solicitarUrlDePortada(eventoId, portada.mimeType);
  if (almacenamientoSinConfigurar(url)) {
    throw new Error('El almacenamiento de imágenes del servidor todavía no está configurado.');
  }
  await subirImagenAS3(url, portada.uri, portada.mimeType);
  return confirmarPortada(eventoId, ruta);
}
