import type { MarcaDelTelefono } from '../utils/marcaDelTelefono';

/**
 * Qué ajustar en el teléfono para que Renaser siga funcionando en segundo plano y sus recordatorios suenen siempre,
 * marca por marca (spec 007, historia 2, `data-model.md` §Guía por marca). Solo se lee en Yo → Alarmas.
 *
 * Honor y Huawei (y a veces Xiaomi, Oppo o Vivo) tratan «quitar de recientes» o el ahorro de batería como
 * una detención forzada, y Android borra todas las alarmas de la app hasta que se vuelve a abrir. La guía
 * genérica de antes, «Batería → Sin restricciones», no existe en Honor: ahí el ajuste está en «Inicio de
 * aplicaciones» → «Gestionar automáticamente».
 *
 * Regla del dueño (28/09): una línea, dos frases como máximo, en tuteo. Desde el 2026-10-31 el texto va en positivo («Para que
 * tus recordatorios suenen siempre»): sin culpar al teléfono ni decir «no cierres la app a la fuerza». Las pantallas que abre el botón
 * están en el módulo nativo (`modules/renaser-alarmas`); acá solo el camino escrito.
 */

/** El título de la guía de Yo → Alarmas y el botón que abre la pantalla de la marca (dueño, 31/10/2026). */
export const TITULO_DE_LA_GUIA = 'Para que tus recordatorios suenen siempre';
export const BOTON_DE_LA_GUIA = 'Revisar';

/** Dos frases como máximo (dueño, 28/09: «mucho texto marea al usuario»). Es la guía de una marca desconocida. */
export const TEXTO_DE_BATERIA = 'En Batería, elige «Sin restricciones» para Renaser.';

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
