/**
 * La foto que la cámara dejó cuando Android mató el PROCESO de la app (no solo la actividad) con la cámara abierta (#49).
 *
 * **Qué pasa.** `expo-image-picker` le pide a la app de cámara que escriba la foto en un archivo de la caché de Renaser
 * (`cache/ImagePicker/<uuid>.jpeg`, por un `FileProvider`) y espera el resultado en memoria. Si el sistema mata el
 * proceso mientras la cámara está abierta:
 * - esa espera desaparece, y `ImagePicker.getPendingResultAsync()` —que solo guarda un resultado EN MEMORIA, para cuando la
 *   actividad se destruye pero el proceso sigue (la opción «No conservar actividades»)— no tiene nada que devolver;
 * - Expo solo anota su estado al destruirse la actividad (`onHostDestroy`), que en una muerte de proceso no corre;
 * - Android le entrega el resultado a la actividad nueva antes de que React esté listo y React lo descarta
 *   («Tried to access onActivityResult while context is not ready»).
 *
 * Lo único que sobrevive es el ARCHIVO: la cámara ya lo escribió antes de devolver el resultado. Como lo que se anota en
 * `fotoPendiente` antes de abrir la cámara sí sobrevive, al volver se busca ahí la foto más nueva que la anotación.
 *
 * Es una recuperación de mejor esfuerzo y solo en Android: si no hay carpeta, ni archivo, o no se puede leer, no se
 * hace nada y la persona vuelve a tocar el hábito (como antes). Si el nombre de la carpeta de Expo cambiara, lo vigila
 * `fotoHuerfanaDeLaCamara.test.ts` contra el código fuente de `expo-image-picker`.
 */

/** La carpeta de la caché donde `expo-image-picker` deja lo que saca la cámara (`ImagePickerConstants.CACHE_DIR_NAME`). */
export const CARPETA_DE_LA_CAMARA = 'ImagePicker';

/**
 * Cuánto antes de la anotación se acepta una foto. El reloj es el mismo (el del teléfono), pero algunos sistemas de
 * archivos redondean la hora de modificación al segundo.
 */
export const MARGEN_DEL_RELOJ_MS = 2_000;

const EXTENSIONES_DE_FOTO = /\.(jpe?g|png|webp|heic|heif)$/i;

export type FotoEnLaCache = {
  uri: string;
  nombre: string;
  /** En bytes. Una foto a medias o recién creada por Expo (`createNewFile`) pesa 0. */
  tamano: number;
  /** Milisegundos desde 1970: cuándo la cámara terminó de escribirla. */
  modificadaEnMs: number;
};

/** Lo que se toca del teléfono, para probar la regla sin teléfono. */
export interface EntornoDeLaCache {
  /** Los archivos de la carpeta de la cámara. Lista vacía si la carpeta no existe. */
  listar: () => FotoEnLaCache[];
  borrar: (uri: string) => void;
}

/**
 * La foto que corresponde a una cámara abierta en `desdeMs`: la más reciente de las que tienen contenido, son imágenes y
 * se escribieron después. Las de antes son de otra toma (Expo no las borra: dejan en la caché la copia ya exportada de cada
 * foto), y las de 0 bytes son el archivo vacío que Expo crea antes de abrir la cámara (si la persona la cierra sin tomar
 * nada, se queda así).
 */
export function elegirFotoHuerfana(fotos: readonly FotoEnLaCache[], desdeMs: number): FotoEnLaCache | null {
  const candidatas = fotos.filter(
    foto =>
      foto.tamano > 0 &&
      EXTENSIONES_DE_FOTO.test(foto.nombre) &&
      Number.isFinite(foto.modificadaEnMs) &&
      foto.modificadaEnMs >= desdeMs - MARGEN_DEL_RELOJ_MS,
  );
  if (candidatas.length === 0) return null;
  return candidatas.reduce((nueva, otra) => (otra.modificadaEnMs > nueva.modificadaEnMs ? otra : nueva));
}

/** Nunca lanza: sin carpeta, sin permiso o con cualquier fallo del sistema de archivos, no hay foto que recuperar. */
export function buscarFotoDeLaCamara(desdeMs: number, entorno?: EntornoDeLaCache): FotoEnLaCache | null {
  try {
    return elegirFotoHuerfana((entorno ?? entornoDelTelefono()).listar(), desdeMs);
  } catch {
    return null;
  }
}

/** Borra la foto original de la caché (a resolución completa) una vez que ya se usó. Mejor esfuerzo. */
export function soltarFotoHuerfana(foto: FotoEnLaCache, entorno?: EntornoDeLaCache): void {
  try {
    (entorno ?? entornoDelTelefono()).borrar(foto.uri);
  } catch {
    // Queda en la caché del teléfono, que el sistema vacía cuando le hace falta el espacio.
  }
}

/**
 * `expo-file-system` se carga recién al usarse: esta recuperación corre una vez por arranque, solo en Android y solo si
 * había una foto anotada, y el resto de las pantallas no pagan el módulo.
 */
function entornoDelTelefono(): EntornoDeLaCache {
  const { Directory, File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  return {
    listar: () => {
      const carpeta = new Directory(Paths.cache, CARPETA_DE_LA_CAMARA);
      if (!carpeta.exists) return [];
      const fotos: FotoEnLaCache[] = [];
      for (const entrada of carpeta.list()) {
        if (!(entrada instanceof File)) continue;
        fotos.push({
          uri: entrada.uri,
          nombre: entrada.name,
          tamano: entrada.size ?? 0,
          modificadaEnMs: entrada.modificationTime ?? 0,
        });
      }
      return fotos;
    },
    borrar: uri => new File(uri).delete(),
  };
}
