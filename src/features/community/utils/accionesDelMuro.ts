/**
 * La fila «Me gusta · Comentar · Compartir» de la tarjeta del Muro con letra grande (E2E del 03/11, issue #115): las etiquetas se cortaban con
 * «…». Pasa a mostrar solo los íconos —cada botón ya tiene su nombre para el lector de pantalla y un área de 48— en dos casos:
 *
 * - con la letra del sistema por encima de 1,15 (el mismo umbral con el que Hoy apila «Hábitos de hoy» y «Mi Radar»): tres etiquetas y tres íconos
 *   ya no entran en una tarjeta de teléfono, y se decide sin esperar a medir (sin parpadeo);
 * - con una letra menor, si aun así una etiqueta se parte en dos líneas (lo mide la tarjeta con `onTextLayout`).
 */
export const ESCALA_DE_LETRA_QUE_PASA_A_ICONOS = 1.15;

export function accionesSoloConIconos(escalaDeLetra: number, algunaEtiquetaSePartio: boolean): boolean {
  return escalaDeLetra > ESCALA_DE_LETRA_QUE_PASA_A_ICONOS || algunaEtiquetaSePartio;
}
