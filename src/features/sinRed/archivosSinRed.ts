/**
 * Spec 048: las fotos hechas sin señal se copian a `Documentos/renaser-sin-red` (la caché de la cámara la puede limpiar el
 * sistema) y esperan ahí a la cola. Lo usan las evidencias de los hábitos (fase 1) y las publicaciones del Muro (fase 2).
 */
const CARPETA_SIN_RED = 'renaser-sin-red';

/** Copia el archivo a la carpeta sin red. Devuelve la nueva URI. */
export async function guardarArchivoSinRed(uri: string, mimeType: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Directory, File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const carpeta = new Directory(Paths.document, CARPETA_SIN_RED);
  if (!carpeta.exists) carpeta.create({ intermediates: true, idempotent: true });
  const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
  const destino = new File(carpeta, `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`);
  new File(uri).copy(destino);
  return destino.uri;
}

export function existeArchivoSinRed(uri: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require('expo-file-system') as typeof import('expo-file-system');
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function borrarArchivoSinRed(uri: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File } = require('expo-file-system') as typeof import('expo-file-system');
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* si no se puede borrar, se borra con la cuenta */
  }
}

/** Un error que la cola no reintenta (queda marcado con su motivo): la foto guardada ya no está. */
export function sinArchivo(): Error {
  return Object.assign(new Error('La foto guardada sin señal ya no está en el teléfono.'), { status: 410 });
}
