import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

/**
 * Pinta la foto real de una publicación del Muro dentro de la caja de media que ya existe en
 * `ComunidadScreen.tsx` (`styles.mediaSingleBox`/`mediaHalfBox`/`mediaLargeLeft`/`mediaSmallRight`).
 * Antes de este componente esas cajas no tenían ningún `<Image>`: mostraban `post.media[0].title`
 * ("📷 Foto 1") como texto plano dentro de un recuadro de color.
 *
 * Se monta como overlay absoluto DESPUÉS del `<Text>` de esa caja (nunca antes): así, si la foto
 * carga bien, la tapa por completo; si es un video o falla, este componente no dibuja nada y el
 * texto de siempre queda visible sin cambios — es la forma de cumplir "que quede el recuadro como
 * está hoy" sin tocar el JSX ni los estilos de la caja en sí.
 */

interface FotoMuroProps {
  /** `WallMedia.url` tal cual la manda el feed — ver `cacheKeyEstable` sobre por qué cambia en cada request. */
  url: string;
  mimeType: string;
  /**
   * Radio de borde de la caja contenedora (`mediaSingleBox`=12, `mediaHalfBox`/`mediaLargeLeft`=10,
   * `mediaSmallRight`=8). Se replica en la imagen para que la esquina no se salga del recuadro,
   * en vez de agregar `overflow: 'hidden'` a esos estilos — la tarea prohíbe tocarlos.
   */
  radioBorde: number;
  /** Color de fondo mientras la foto está cargando — el mismo `c.cardBgAlt` que ya pinta la caja hoy. */
  colorFondo: string;
}

export function FotoMuro({ url, mimeType, radioBorde, colorFondo }: FotoMuroProps) {
  const [fallo, setFallo] = useState(false);

  // Reproducción de video queda fuera de alcance de esta tarea (no hay librería de video
  // instalada en el proyecto). Para un video no se monta ningún <Image>: el recuadro se deja tal
  // como está hoy, con su texto "🎥 Video N" de siempre.
  const esVideo = mimeType.startsWith('video/');
  if (esVideo || fallo || !url) {
    return null;
  }

  return (
    <Image
      source={{ uri: url, cacheKey: cacheKeyEstable(url) }}
      style={[styles.overlay, { borderRadius: radioBorde, backgroundColor: colorFondo }]}
      contentFit="cover" // llena la caja recortando el sobrante, nunca 'fill' (deformaría la foto)
      transition={150}
      // Declarado a propósito, no el default implícito de la librería (memoria + disco cachean
      // ambos): 'memory' sola hace el scroll fluido pero se pierde al cerrar la app y vuelve a
      // gastar datos móviles del aprendiz en el próximo refresco del feed; 'disk' sola evita ese
      // gasto pero no evita el redibujado al hacer scroll. Las dos juntas es lo que reemplazan.
      // El caché en disco lo administra la librería nativa (Glide en Android, SDWebImage en iOS)
      // con expulsión de las entradas más viejas cuando se llena — no crece sin límite. Como las
      // fotos ya salen normalizadas a 1440px/JPEG 0.8 desde `normalizarImagen.ts` (unos cientos de
      // KB cada una), no cachear sería la opción que de verdad gasta más: quemaría datos móviles
      // en cada refresco. Si algún día hace falta un botón de "liberar espacio", existen
      // `Image.clearDiskCache()` / `Image.clearMemoryCache()`.
      cachePolicy="memory-disk"
      onError={() => setFallo(true)}
    />
  );
}

/**
 * El backend firma la URL de lectura de cada foto EN CADA RESPUESTA del feed
 * (`PublicacionMuroService.firmarLectura`, ver `almacenamientoPort.firmarLectura` — misma familia
 * de problema que la bitácora del backend registra como E-57 para los avatares). Como la firma
 * SigV4 cambia la query string en cada pedido, usar la URL completa como clave de caché nunca
 * acierta: el celular volvería a bajar todas las fotos en cada refresco del Muro.
 *
 * La regla, calcada de la misma solución que ya usó E-57 (`split_part(avatar_url, '?', 1)` en el
 * backend): en SigV4 todo lo que caduca vive DESPUÉS del `?`. La parte de antes del `?` identifica
 * siempre al mismo objeto de S3, así que es la clave de caché estable. No la reinventes con otra
 * heurística — es la misma regla, aplicada del lado del cliente.
 */
function cacheKeyEstable(url: string): string {
  return url.split('?')[0];
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
