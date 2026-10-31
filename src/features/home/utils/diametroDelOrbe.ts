/**
 * El diámetro del fénix del centro de Hoy (`OrbeAcompanante`: es también su área de toque).
 *
 * Sale de un «lado de referencia» que antes era, además, el ALTO FIJO de la sección (`styles.hero`): la sección medía
 * 252 (206 en pantalla baja) escalados con `rs()` aunque su contenido ocupara ~206, y el resto —entre 23 y 35 px arriba
 * y otros tantos abajo, más el aire normal entre secciones— quedaba en blanco (pedido del dueño, 2026-10-30: «en la parte
 * de arriba mucho espacio, podemos optimizar sin reducir el tamaño»).
 *
 * Ahora la sección mide lo que ocupa su contenido. **El tamaño del ave no cambia en ninguna pantalla**: esta cuenta es
 * la de siempre, sacada tal cual de `HoyScreen` para que una prueba (`hoyEspacioDelFenix.test.ts`) la fije contra la
 * fórmula anterior en todos los anchos, altos y escalas. Un teléfono angosto o de poca altura sigue teniendo el ave
 * más chica que 140, como antes: «sin reducir» no es «agrandar».
 */

/** Diámetro máximo del orbe, en px (el de un teléfono estándar). */
export const DIAMETRO_MAXIMO_DEL_ORBE = 140;

/** Fracción del lado de referencia que ocupa el orbe cuando el lado de referencia no deja llegar al máximo. */
const FRACCION_DEL_LADO = 0.58;

/** Lado de referencia: lo que antes era el alto del hero (`rs(252)`, o `rs(206)` en pantalla baja), sin pasar del ancho. */
export function ladoDeReferenciaDelOrbe(anchoContenido: number, rs: (px: number) => number, pantallaBaja: boolean): number {
  return Math.min(anchoContenido, rs(pantallaBaja ? 206 : 252));
}

/** Diámetro del orbe (y de su área de toque). */
export function diametroDelOrbe(anchoContenido: number, rs: (px: number) => number, pantallaBaja: boolean): number {
  return Math.min(
    DIAMETRO_MAXIMO_DEL_ORBE,
    Math.round(ladoDeReferenciaDelOrbe(anchoContenido, rs, pantallaBaja) * FRACCION_DEL_LADO),
  );
}
