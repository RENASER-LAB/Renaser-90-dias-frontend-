/** Lo que un evento de scroll de React Native trae, y lo único que hace falta mirar. */
export interface MedidasDeScroll {
  layoutMeasurement: { height: number };
  contentOffset: { y: number };
  contentSize: { height: number };
}

/**
 * Cuántos píxeles antes del final se considera "ya casi": una pantalla y media.
 *
 * **Por qué tan lejos y no al llegar abajo.** Si se pidiera la página siguiente recién al tocar el
 * fondo, la persona vería la lista cortarse y esperaría a la red con la pantalla quieta. Pidiéndola
 * con una pantalla y media de margen, lo normal es que las publicaciones nuevas ya estén ahí cuando
 * llega — que es todo el punto de cargar de a poco en vez de todo junto.
 */
export const MARGEN_PARA_PEDIR_MAS = 900;

/**
 * ¿El scroll está lo bastante cerca del final como para pedir la página siguiente?
 *
 * Se aísla de la pantalla por dos razones. Una es que es la única línea con aritmética de todo el
 * lazy loading, y probarla acá cuesta cuatro casos en vez de montar una lista. La otra es el caso
 * degenerado del final: con poco contenido —un muro de tres publicaciones— el contenido entra
 * entero en la pantalla y la cuenta da "cerca del final" desde el primer render, sin que nadie haya
 * movido un dedo. Eso está BIEN y es deliberado: si todo entra y el servidor dice que hay más, hay
 * que traer más, porque si no la persona no tiene cómo pedirlo (no hay nada que desplazar).
 */
export function estaCercaDelFinal(medidas: MedidasDeScroll): boolean {
  const { layoutMeasurement, contentOffset, contentSize } = medidas;
  return contentOffset.y + layoutMeasurement.height >= contentSize.height - MARGEN_PARA_PEDIR_MAS;
}
