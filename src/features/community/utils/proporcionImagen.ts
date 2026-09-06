/**
 * Proporción (ancho ÷ alto) con la que se dibuja la caja de una foto en el Muro.
 *
 * **El problema que resuelve.** Hasta ahora la caja de una foto sola era `height: 120` fija
 * (`ComunidadScreen.tsx`, `styles.mediaSingleBox`) y la foto se pintaba con `contentFit="cover"`:
 * el ancho lo daba la tarjeta y el alto era siempre 120, así que cualquier foto que no fuera un
 * panorama muy ancho **se recortaba**. Una foto vertical de celular (9:16) perdía más de la mitad.
 *
 * **Cómo lo resuelven Instagram y Facebook.** No fijan el alto: leen la proporción real de la foto
 * y estiran la caja para que la foto entre entera. Lo único que acotan son los extremos, para que
 * una foto muy alta no se coma la pantalla entera y una muy ancha no quede como una rendija.
 *
 * Acá se hace lo mismo, con dos decisiones propias que conviene dejar escritas:
 *
 * 1. **El retrato se admite hasta 3:4, no hasta el 4:5 de Instagram.** 3:4 (0,75) es la vertical
 *    que sale por defecto de la cámara de un teléfono, así que es la foto más común del Muro: con
 *    el 4:5 de Instagram esa foto —la más frecuente de todas— ya caía fuera del rango. El techo
 *    práctico queda en un alto de 1,33 veces el ancho de la tarjeta, que es más o menos donde
 *    corta Facebook y deja el feed navegable.
 * 2. **En los extremos se dibuja con `contentFit="contain"`, no `cover`.** Dentro del rango las
 *    dos se ven idénticas, porque la caja ya tiene la proporción de la foto y no sobra nada que
 *    recortar ni que rellenar. La diferencia aparece solo fuera del rango (una captura 9:16, un
 *    panorama muy ancho): ahí `contain` muestra la foto entera con dos franjas del color de la
 *    tarjeta y `cover` cortaría. Como el pedido fue justamente "la imagen se recorta", se prefiere
 *    la franja antes que el recorte. Con esto **ninguna foto del Muro pierde contenido nunca.**
 */

/**
 * Retrato más alto que se dibuja sin franjas: 3:4, la vertical por defecto de la cámara de un
 * teléfono. Más alto que esto (una captura de pantalla 9:16, por ejemplo) entra completo igual,
 * con franjas a los costados.
 */
export const PROPORCION_MINIMA = 3 / 4;

/**
 * Panorama más ancho que se dibuja sin franjas: 1,91:1, el mismo límite que publica Instagram.
 * Más ancho que esto queda como una rendija ilegible dentro de la tarjeta.
 */
export const PROPORCION_MAXIMA = 1.91;

/**
 * Proporción que se usa mientras la foto todavía no cargó y no se conoce su tamaño real.
 * Cuadrada, que es el punto medio entre los dos límites y la forma más común en un muro: así el
 * salto de layout al terminar de cargar es el más chico posible en el caso típico.
 */
export const PROPORCION_POR_DEFECTO = 1;

/**
 * Traduce el tamaño real que reportó el decodificador de la imagen a la proporción de la caja.
 *
 * Devuelve {@link PROPORCION_POR_DEFECTO} ante cualquier dato inservible (0, negativo, `NaN`,
 * `Infinity`) en vez de propagarlo: un `aspectRatio` inválido en React Native colapsa la caja a
 * altura 0 y la publicación queda sin foto y sin explicación.
 */
export function acotarProporcion(ancho: number, alto: number): number {
  if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) {
    return PROPORCION_POR_DEFECTO;
  }
  return Math.min(Math.max(ancho / alto, PROPORCION_MINIMA), PROPORCION_MAXIMA);
}
