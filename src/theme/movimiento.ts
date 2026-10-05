import { Easing } from 'react-native-reanimated';

/**
 * Curvas y duraciones del movimiento de la app (alta y onboarding nativos, 2026-10-05).
 *
 * Valores de las guías de movimiento que se siguen en este proyecto (`emil-design-eng`,
 * `animate-expo`, `apple-design`), no aproximados a ojo:
 *
 * - **Nada de `ease-in` en interfaz.** Arranca lento justo en el instante que la persona está
 *   mirando, y la pantalla se siente lenta aunque dure lo mismo.
 * - **Lo que entra o sale, `CURVA_SALIDA`** (ease-out fuerte): responde de inmediato y se posa.
 * - **Lo que se mueve DENTRO de la pantalla** (el indicador del control segmentado), `CURVA_EN_PANTALLA`.
 * - **Todo por debajo de 300 ms.** La navegación del sistema dura más; lo nuestro, menos.
 *
 * Todo se anima con valores compartidos de Reanimated (`withTiming`), en el hilo de la interfaz.
 * No se usan las «transiciones de estilo» de Reanimated 4 (`transitionTimingFunction`): en esta
 * versión sólo aceptan curvas con nombre ('ease-out'…) y una curva propia escrita como texto
 * (`'cubic-bezier(…)'`) revienta al dibujar con «Invalid predefined timing function».
 */

/** Ease-out fuerte: entradas, salidas, respuestas. `cubic-bezier(0.23, 1, 0.32, 1)`. */
export const CURVA_SALIDA = Easing.bezier(0.23, 1, 0.32, 1);

/** Ease-in-out para algo que se desplaza sobre la pantalla. `cubic-bezier(0.77, 0, 0.175, 1)`. */
export const CURVA_EN_PANTALLA = Easing.bezier(0.77, 0, 0.175, 1);

export const DURACION_MS = {
  /** Lo que responde al dedo al apretar (escala 0.97). Se ve decenas de veces: casi imperceptible. */
  presion: 120,
  /** El cambio de color/borde de una opción elegida. */
  seleccion: 180,
  /** El indicador del control segmentado, que viaja de un segmento al otro. */
  indicador: 250,
  /** La entrada del contenido de un paso nuevo (el contenido viejo sale al instante). */
  paso: 260,
  /** El relleno de la barra de avance. */
  avance: 280,
  /** El fundido que reemplaza al deslizamiento cuando el sistema pide reducir el movimiento. */
  fundido: 160,
  /** Entre un bloque y el siguiente de una entrada escalonada (el login: título, campos, botón). */
  escalon: 50,
  /** La sacudida de «no» de un formulario rechazado: tres idas y vueltas que se apagan. */
  sacudida: 280,
} as const;

/** Escala de un elemento apretado. Nunca menos de 0.95: lo físico no se encoge de golpe. */
export const ESCALA_APRETADO = 0.97;
