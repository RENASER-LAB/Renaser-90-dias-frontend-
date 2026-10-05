import { Easing } from 'react-native-reanimated';

/**
 * Las decisiones de la hoja desde abajo (`HojaDesdeAbajo`), sin React: cómo sigue al dedo, cuándo
 * se cierra al soltarla y cuánto se oscurece el fondo (selectores de la Ficha Inicial, 2026-10-05).
 *
 * Están acá, y no dentro del componente, para poder probarlas una por una: son exactamente las
 * reglas que hacen que una hoja se sienta «de teléfono» o «de página web», y un número mal puesto
 * no se ve en una captura.
 */

/**
 * La curva del cajón de iOS (`--ease-drawer` de Emil Kowalski, tomada de Ionic):
 * `cubic-bezier(0.32, 0.72, 0, 1)`. Arranca rápido y se posa largo, como una hoja que sube.
 *
 * Vive acá y no en `theme/movimiento.ts` porque ese archivo lo está cambiando en paralelo la rama
 * del login nuevo (2026-10-05); cuando se junten, conviene mudarla allá junto a las demás curvas.
 */
export const CURVA_CAJON = Easing.bezier(0.32, 0.72, 0, 1);

export const DURACION_HOJA_MS = {
  /** La entrada. El tope de las guías es 300 ms; la hoja recorre medio teléfono, va cerca del tope. */
  entrada: 280,
  /** La salida que no viene de un gesto (tocar fuera, la ✕, «Listo»): más corta que la entrada. */
  salida: 200,
  /** El arrastre que se suelta: se termina con un resorte que hereda la velocidad del dedo. */
  resorte: 300,
} as const;

/** Qué fracción del alto de la hoja hay que bajarla para que se cierre aunque se suelte despacio. */
export const FRACCION_PARA_CERRAR = 0.25;

/**
 * Velocidad media (px/ms) a partir de la cual soltar la hoja la cierra aunque no haya llegado al
 * umbral: un golpe corto hacia abajo basta (regla de Emil Kowalski en Sonner y Vaul, ~0.11).
 */
export const VELOCIDAD_PARA_CERRAR = 0.11;

/**
 * Sin este mínimo, un temblor de 10 px en 60 ms (0.17 px/ms) al apoyar el dedo en la cabecera
 * cerraría la hoja. La regla de la velocidad vale para un gesto, no para un pulso.
 */
export const RECORRIDO_MINIMO_PARA_VELOCIDAD = 20;

/** Si al soltar el dedo va hacia ARRIBA más rápido que esto, la persona se arrepintió: vuelve. */
const VELOCIDAD_DE_ARREPENTIMIENTO = -0.05;

/** Cuánto hay que mover el dedo en vertical antes de que la hoja empiece a seguirlo. */
export const UMBRAL_PARA_ARRASTRAR = 6;

/**
 * La resistencia al pasarse de un borde (fórmula de `apple-design`, «rubber-banding»): cuanto más
 * se tira, menos se mueve. Nunca llega a `dimension`, y para un exceso chico casi acompaña al dedo.
 */
export function amortiguar(exceso: number, dimension: number, constante = 0.55): number {
  'worklet';
  if (exceso <= 0 || dimension <= 0) return 0;
  return (exceso * dimension * constante) / (dimension + constante * exceso);
}

/**
 * Dónde dibujar la hoja mientras el dedo la arrastra (`dy` > 0 es hacia abajo). Hacia abajo la
 * sigue 1:1; hacia arriba ya está en su tope, así que sube con resistencia en vez de chocar contra
 * una pared invisible.
 */
export function posicionAlArrastrar(dy: number, altoHoja: number): number {
  'worklet';
  if (dy >= 0) return dy;
  return -amortiguar(-dy, altoHoja);
}

export interface SoltarHoja {
  /** Cuánto bajó la hoja desde su lugar (px). */
  desplazamiento: number;
  /** Cuánto duró el arrastre (ms). */
  msTranscurridos: number;
  /** La velocidad del dedo en el instante de soltar (px/ms, positiva hacia abajo). */
  velocidadFinal: number;
  altoHoja: number;
}

/**
 * Al soltar: ¿se cierra o vuelve a su lugar?
 *
 * - **Va hacia arriba al soltar → vuelve**, aunque la haya bajado mucho. Lo que decide es hacia
 *   dónde iba el dedo al final, no dónde quedó (`apple-design`: el signo de la velocidad).
 * - **Bajó un cuarto de su alto o más → se cierra**, aunque se suelte despacio.
 * - **Un golpe hacia abajo → se cierra** aunque no llegue al cuarto: velocidad media sobre
 *   {@link VELOCIDAD_PARA_CERRAR} px/ms, con un recorrido mínimo para que un temblor no cuente.
 */
export function decidirAlSoltar({ desplazamiento, msTranscurridos, velocidadFinal, altoHoja }: SoltarHoja): 'cerrar' | 'volver' {
  if (desplazamiento <= 0) return 'volver';
  if (velocidadFinal < VELOCIDAD_DE_ARREPENTIMIENTO) return 'volver';
  if (desplazamiento >= altoHoja * FRACCION_PARA_CERRAR) return 'cerrar';
  const velocidadMedia = desplazamiento / Math.max(1, msTranscurridos);
  if (desplazamiento >= RECORRIDO_MINIMO_PARA_VELOCIDAD && velocidadMedia > VELOCIDAD_PARA_CERRAR) return 'cerrar';
  return 'volver';
}

/**
 * Cuánto se ve el velo oscuro detrás de la hoja (0 a 1): entero con la hoja arriba, nada con la
 * hoja afuera, y en el medio en proporción. Así, al arrastrarla, el fondo se aclara con el dedo.
 */
export function opacidadDelVelo(y: number, altoHoja: number): number {
  'worklet';
  if (altoHoja <= 0) return 0;
  const fraccion = 1 - y / altoHoja;
  return Math.max(0, Math.min(1, fraccion));
}
