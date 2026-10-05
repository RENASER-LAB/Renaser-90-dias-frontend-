import type { Edge } from 'react-native-safe-area-context';

/**
 * Los bordes seguros que aplica una pantalla que vive bajo la barra de pestañas: todos menos el de
 * abajo.
 *
 * BUG 2026-10-05 — «línea negra» encima de la barra en Hoy, Plan, Training y Yo (en Comunidad no).
 * Es el mismo bug que Comunidad ya había corregido el 2026-09-26 («franja blanca», ver
 * `ComunidadScreen`): el `SafeAreaView` de la pantalla iba con los cuatro bordes y ponía
 * `paddingBottom = insets.bottom` pintado de `c.bg`, y la barra de pestañas, que se dibuja DEBAJO de
 * la pantalla, ya reserva ese mismo inset (`TabBar`: `paddingBottom: max(insets.bottom, 14)`). El
 * borde de la barra de gestos se pagaba dos veces y el primero quedaba a la vista como una franja.
 * En claro no se notaba (`bg` y `cardBg` son casi iguales); en oscuro la barra es `bg` + 4 % de
 * blanco y la franja `bg` puro, y se veía como una línea negra de ~24 dp.
 *
 * Al esconderse la barra al desplazar, el borde de la barra de gestos lo sigue pintando la caja de
 * la barra (`TabBar`), así que el contenido tampoco queda debajo de los gestos.
 */
export const BORDES_DE_UNA_PESTANA: readonly Edge[] = ['top', 'left', 'right'];
