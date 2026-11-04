import { Platform } from 'react-native';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Achica una foto y la guarda en JPEG. Es lo que todos los lugares que reciben una foto (evidencia de hábitos, chat, Muro,
 * Caja, foto de perfil y portadas) hacían cada uno por su lado con `ImageManipulator.manipulate(uri).resize(..).renderAsync()`.
 *
 * **Por qué no eso (issue #120).** En Android el manipulador decodifica la foto ENTERA —sin achicarla— y recién después la reduce:
 * una foto de 50 MP son ~200 MB de bitmap y una de 108 MP ~430 MB. Con poca memoria libre el trabajo se cancela
 * (`Context.renderAsync has been rejected … JobCancellationException`) y la persona veía «No se pudo procesar la foto» con una foto
 * perfectamente buena. Pasaba en cualquier teléfono con cámara de muchos megapíxeles y de forma intermitente (según la memoria
 * que hubiera en ese momento), así que ni siquiera se podía repetir a voluntad.
 *
 * **Qué se hace.** La foto se carga YA achicada: `Image.loadAsync(uri, { maxWidth })` de expo-image muestrea al decodificar (Glide
 * lee la foto a una fracción de su tamaño y nunca arma el bitmap grande), y ese resultado se le pasa al manipulador, que lo corrige
 * de orientación (EXIF, lo hace Glide al decodificar), le pone la medida exacta y lo guarda. Un bitmap de 1440 px de ancho son
 * ~11 MB en vez de cientos. Es solo JavaScript: `expo-image` y `expo-image-manipulator` ya vienen en la app.
 *
 * **Si aun así falla** (memoria justísima), se reintenta con la foto más chica antes de rendirse: una evidencia a 864 px sirve
 * mucho más que un aviso de error. Cada fallo queda en el registro de la app, con su causa real: antes el `catch` de quien llamaba
 * la tapaba y no había forma de saber qué había pasado en el teléfono de la persona.
 */

/** Medida pedida. Si hay `height`, la foto se deja exactamente de `width × height` (el avatar cuadrado); si no, solo se limita el ancho. */
export interface MedidasDeFoto {
  width: number;
  height?: number;
}

export interface FotoReducida {
  uri: string;
  width: number;
  height: number;
}

/**
 * A qué fracción de la medida pedida se intenta, en orden. Se parte de la medida pedida (lo de siempre) y se baja solo si falló.
 * Exportado para las pruebas.
 */
export const FACTORES_DE_REINTENTO: readonly number[] = [1, 0.6, 0.35];

/** Una sola pasada: carga ya achicada, pone la medida exacta y guarda en JPEG. */
async function reducirUnaVez(uri: string, medidas: MedidasDeFoto, calidad: number): Promise<FotoReducida> {
  // En la web el navegador decodifica sin el problema de memoria de Android y el manipulador lee la dirección tal cual: se deja
  // como estaba.
  const cargada =
    Platform.OS === 'web'
      ? null
      : await Image.loadAsync(uri, {
          maxWidth: medidas.width,
          ...(medidas.height != null ? { maxHeight: medidas.height } : {}),
        });
  try {
    const renderizada = await ImageManipulator.manipulate(cargada ?? uri)
      .resize(medidas.height != null ? { width: medidas.width, height: medidas.height } : { width: medidas.width })
      .renderAsync();
    const guardada = await renderizada.saveAsync({ compress: calidad, format: SaveFormat.JPEG });
    return { uri: guardada.uri, width: guardada.width, height: guardada.height };
  } finally {
    // El bitmap cargado no se necesita más; no esperar al recolector para soltarlo.
    try {
      cargada?.release();
    } catch {
      // Ya estaba suelto: no importa.
    }
  }
}

/**
 * Achica la foto de `uri` y la guarda en JPEG a `calidad` (0 a 1). Lanza el último error si ningún intento funcionó: quien llama
 * sigue decidiendo qué decirle a la persona.
 */
export async function reducirFoto(uri: string, medidas: MedidasDeFoto, calidad: number): Promise<FotoReducida> {
  let ultimoError: unknown;
  for (const factor of FACTORES_DE_REINTENTO) {
    const aEsteTamano: MedidasDeFoto = {
      width: Math.max(1, Math.round(medidas.width * factor)),
      ...(medidas.height != null ? { height: Math.max(1, Math.round(medidas.height * factor)) } : {}),
    };
    try {
      return await reducirUnaVez(uri, aEsteTamano, calidad);
    } catch (e) {
      ultimoError = e;
      console.warn(
        `[foto] no se pudo achicar a ${aEsteTamano.width}px de ancho: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
      );
    }
  }
  throw ultimoError;
}
