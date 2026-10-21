import type { MarcaDelTelefono } from '../utils/marcaDelTelefono';

/**
 * Qué cambiar en el teléfono para que NO cierre Renaser y borre las alarmas, marca por marca (spec 007,
 * historia 2, `data-model.md` §Guía por marca).
 *
 * Honor y Huawei (y a veces Xiaomi, Oppo o Vivo) tratan «quitar de recientes» o el ahorro de batería como
 * una detención forzada, y Android borra todas las alarmas de la app hasta que se vuelve a abrir. La guía
 * genérica de antes, «Batería → Sin restricciones», no existe en Honor: ahí el ajuste está en «Inicio de
 * aplicaciones» → «Gestionar automáticamente».
 *
 * Regla del dueño (28/09): una línea, dos frases como máximo, en tuteo. Las pantallas que abre el botón
 * están en el módulo nativo (`modules/renaser-alarmas`); acá solo el camino escrito.
 */

/** Dos frases como máximo (dueño, 28/09: «mucho texto marea al usuario»). Es la guía de una marca desconocida. */
export const TEXTO_DE_BATERIA =
  'Para que tus alarmas no se borren, en Batería elige «Sin restricciones» y no cierres Renaser a la fuerza.';

/**
 * La hoja de la guía preventiva (spec 007, refuerzo FR-021): la misma hoja del aviso de «tu teléfono cerró Renaser»,
 * antes de que pase. Una frase de texto; la línea de la marca va aparte, debajo.
 */
export const TITULO_PREVENTIVO = 'Un ajuste para tus alarmas';
export const TEXTO_PREVENTIVO = 'En tu teléfono, Renaser necesita un ajuste para que tus alarmas suenen siempre.';

const HONOR_Y_HUAWEI = 'Inicio de aplicaciones → Renaser → apaga «Gestionar automáticamente» y deja todo encendido.';

export const GUIAS_POR_MARCA: Readonly<Record<MarcaDelTelefono, string>> = {
  honor: HONOR_Y_HUAWEI,
  huawei: HONOR_Y_HUAWEI,
  xiaomi: 'Inicio automático → activa Renaser. En Ahorro de batería elige «Sin restricciones».',
  samsung: 'Batería → Renaser → «Sin restricciones», y sácala de «Apps en suspensión».',
  oppo: 'Inicio automático → activa Renaser, y en Batería permite la actividad en segundo plano.',
  vivo: 'Inicio automático / Segundo plano → permite Renaser.',
  otra: TEXTO_DE_BATERIA,
};

/** La línea de la guía de una marca; la genérica si no se la reconoce. */
export function lineaDeLaGuia(marca: MarcaDelTelefono): string {
  return GUIAS_POR_MARCA[marca] ?? TEXTO_DE_BATERIA;
}
