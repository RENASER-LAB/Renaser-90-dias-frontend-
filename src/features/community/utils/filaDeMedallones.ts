/**
 * La fila de medallones de Comunidad se desliza, y tiene que VERSE que se desliza (2026-10-05).
 *
 * Con seis secciones, a 412 px entraban cinco medallones y el sexto (Testimonios) quedaba entero
 * fuera de la pantalla, justo en el borde: la fila parecía completa y nadie la deslizaba. La pista
 * que se usa en iOS y Android para «hay más» es que el último elemento visible ASOME cortado. Acá se
 * reparte el espacio entre medallones para que el último quede cortado por la mitad.
 *
 * - Si la fila entra entera (tablet), no se toca: separación de siempre y sin asomo.
 * - Si no entra, se busca cuántos caben enteros (`k`) con una separación entre `min` y `max`, de modo
 *   que el `k + 1` muestre la mitad. Se prefiere el mayor `k` posible: más secciones a la vista.
 * - Si ninguna separación cae en el rango (un ancho rarísimo), se deja la de siempre.
 */
export function separacionDeLaFila({
  anchoVisible,
  relleno,
  anchoMedallon,
  cantidad,
  separacionBase = 12,
  separacionMin = 8,
  separacionMax = 24,
}: {
  /** Ancho de la fila en pantalla (lo que mide el `ScrollView`). */
  anchoVisible: number;
  /** Relleno a cada lado del contenido. */
  relleno: number;
  /** Ancho de cada medallón con su etiqueta. */
  anchoMedallon: number;
  cantidad: number;
  separacionBase?: number;
  separacionMin?: number;
  separacionMax?: number;
}): { separacion: number; desliza: boolean } {
  const entera = 2 * relleno + cantidad * anchoMedallon + (cantidad - 1) * separacionBase;
  if (anchoVisible <= 0 || entera <= anchoVisible) return { separacion: separacionBase, desliza: false };
  // Lo que ocupan `k` medallones enteros con su separación, más medio medallón asomando.
  const paraLosEnteros = anchoVisible - relleno - anchoMedallon / 2;
  for (let k = cantidad - 1; k >= 1; k--) {
    const separacion = paraLosEnteros / k - anchoMedallon;
    if (separacion >= separacionMin && separacion <= separacionMax) return { separacion, desliza: true };
  }
  return { separacion: separacionBase, desliza: true };
}
