import type { FaseDeVoz } from '../hooks/useConversacionPorVoz';

/**
 * Cuántas veces por segundo se vuelve a dibujar el orbe de puntos, como máximo (2026-09-26, "en mi
 * Xiaomi se laguea feo" del dueño).
 *
 * El paquete dibujaba la nube entera en CADA cuadro de la pantalla: 90 o 120 veces por segundo en
 * los Xiaomi con pantalla rápida, todo en el hilo de UI, que es el mismo que mueve el scroll de Hoy.
 * En reposo el orbe gira lento (tempo 0.35): 30 cuadros por segundo se ven igual de suaves y cuestan
 * la cuarta parte que a 120. Cuando escucha, piensa o habla se mueve rápido y se deja en 60.
 */
export const FPS_MAXIMO_DEL_ORBE: Record<FaseDeVoz, number> = {
  reposo: 30,
  escuchando: 60,
  pensando: 60,
  hablando: 60,
};

/** Suavizado del período medido entre cuadros (media móvil exponencial). */
const PESO_DEL_CUADRO_NUEVO = 0.1;
/** Un cuadro más largo que esto es un tirón (GC, carga de datos), no el período de la pantalla. */
const TIRON_MS = 50;
const MARGEN_DE_REDONDEO = 0.1;

/**
 * Cada cuántos cuadros de la pantalla se dibuja uno del orbe, para no pasar de `fpsMaximo`.
 *
 * Es un número ENTERO de cuadros, no "cada 33 ms": con una pantalla de 90 Hz y un tope de 60, el
 * reloj alternaría saltos de 1 y 2 cuadros y el orbe tironearía. Un paso fijo (cada 2 cuadros = 45
 * por segundo parejos) se ve fluido aunque quede algo debajo del tope. Se redondea hacia arriba (con
 * un margen de 0.1 para que una pantalla de 60 Hz medida en 16.9 ms no pase a dibujar la mitad): el
 * tope es un techo, nunca se dibuja más seguido que eso.
 */
export function cuadrosPorDibujo(periodoMs: number, fpsMaximo: number): number {
  'worklet';
  if (!(periodoMs > 0) || !(fpsMaximo > 0)) return 1;
  const pasos = Math.ceil(1000 / fpsMaximo / periodoMs - MARGEN_DE_REDONDEO);
  return pasos < 1 ? 1 : pasos;
}

/**
 * El período de la pantalla, medido y suavizado: un cuadro que se atrasó no cambia el paso. Sin
 * medida previa (`anteriorMs` en 0) arranca de la primera, así el tope vale desde el primer segundo.
 */
export function periodoSuavizado(anteriorMs: number, medidoMs: number): number {
  'worklet';
  if (!(medidoMs > 0) || medidoMs > TIRON_MS) return anteriorMs;
  if (!(anteriorMs > 0)) return medidoMs;
  return anteriorMs + (medidoMs - anteriorMs) * PESO_DEL_CUADRO_NUEVO;
}
