import { Asset } from 'expo-asset';
import { requireNativeModule } from 'expo-modules-core';

type CopiarRecurso = (nombre: string, md5Hash: string | null, tipo: string) => Promise<string>;

const copiarConElModuloNativo: CopiarRecurso = (nombre, md5Hash, tipo) =>
  requireNativeModule<{ downloadAsync: CopiarRecurso }>('ExpoAsset').downloadAsync(nombre, md5Hash, tipo);

/**
 * Deja el sticker como un archivo local (`file://…`) que `fetch` pueda leer para subirlo.
 *
 * En un APK de release las imágenes van embebidas como recursos de Android y `expo-asset` marca
 * la imagen como "ya descargada" con `localUri` = el nombre del recurso (`assets_stickers_renaser_
 * muybien`), porque a `<Image>` le sirve así. `fetch` no sabe leerlo y fallaba con
 * `MalformedURLException: no protocol` (E-463). El módulo nativo sí copia un recurso a la caché:
 * se le pide directo cuando lo que quedó no tiene esquema. En desarrollo y en web ya es una URL.
 */
export async function archivoDelSticker(imagen: number,
                                        copiarRecurso: CopiarRecurso = copiarConElModuloNativo): Promise<string> {
  const asset = await Asset.fromModule(imagen).downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (uri.includes(':')) return uri;
  return copiarRecurso(uri, asset.hash, asset.type ?? 'webp');
}
