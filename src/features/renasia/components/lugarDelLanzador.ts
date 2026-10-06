/**
 * Dónde está y cuánto ocupa el botón flotante de SER (`RenasiaLauncher`).
 *
 * Viven en un archivo aparte, sin dependencias, para que una vista pueda reservarle lugar sin
 * cargar el panel del acompañante (que arrastra el chat, la voz y la sesión). El botón las lee de
 * acá: si algún día cambia de tamaño o de lugar, todas las vistas que le dejan espacio se mueven
 * con él, sin perseguir números por la app (2026-10-05).
 */

/**
 * Alto aproximado de `TabBar` sin contar el área segura, que se suma aparte. Si algún día la barra
 * cambia de alto, este número es lo único que hay que mover para que el botón no se le monte.
 */
export const ALTO_TAB_BAR = 62;
/** Entre el botón y la barra de pestañas, y entre el botón y lo que se le acerca de costado. */
export const SEPARACION = 16;
export const DIAMETRO = 52;
/** Del borde derecho de la pantalla al botón. */
export const MARGEN_DERECHO = 18;

/**
 * Hueco que cada pantalla con scroll debe dejar al final de su contenido para que este boton
 * flotante no tape la ultima tarjeta ni, peor, un control pulsable (pasaba con "Compartir" en
 * el Muro). Se exporta desde aqui para que el dia que el boton cambie de tamano o de
 * separacion no haya que perseguir el numero por cinco pantallas.
 *
 * Cubre el minimo de 36 que pide AGENTS.md 2 con holgura.
 */
export const ESPACIO_PARA_LANZADOR = DIAMETRO + SEPARACION + 20;

/**
 * La franja de la derecha que el botón ocupa a la altura en que flota, contada desde el borde de la
 * pantalla: su margen, su diámetro y una separación.
 *
 * El hueco de abajo (`ESPACIO_PARA_LANZADOR`) solo sirve para lo ÚLTIMO de una lista: al llegar al
 * final, sube por encima del botón. Un control que en reposo queda a la altura del botón y no es lo
 * último (pasó con «Siguiente fase» en El Método, prueba en Android del 2026-10-05) necesita además
 * que no se meta en esta franja.
 */
export const ANCHO_PARA_LANZADOR = MARGEN_DERECHO + DIAMETRO + SEPARACION;

/**
 * Cuánto tiene que entrar un control desde el borde de su contenido para no meterse debajo del
 * botón, sabiendo cuánto margen deja ya la pantalla. Nunca negativo: con márgenes anchos (tableta,
 * contenido centrado) no hace falta nada.
 */
export function entradaParaElLanzador(margenDeLaPantalla: number): number {
  return Math.max(0, ANCHO_PARA_LANZADOR - margenDeLaPantalla);
}
