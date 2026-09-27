import { StyleSheet } from 'react-native';

/**
 * Esconder la barra de pestañas de abajo mientras una pantalla se toma el alto entero (2026-09-26:
 * una conversación de Comunidad, como en WhatsApp).
 *
 * Es la opción estándar de React Navigation (`tabBarStyle: { display: 'none' }`), puesta por la
 * propia pantalla con `navigation.setOptions`. Pero la barra de esta app es propia
 * (`components/TabBar`) y una barra propia **no** lee `tabBarStyle` sola: sin
 * {@link pestanasOcultas} la opción se ignoraba y la barra seguía ahí.
 */
export const OPCIONES_SIN_PESTANAS = { tabBarStyle: { display: 'none' } } as const;

/** Lo que se vuelve a poner al cerrar la conversación: la barra como siempre. */
export const OPCIONES_CON_PESTANAS = { tabBarStyle: undefined } as const;

/**
 * Si la pestaña enfocada pidió esconder la barra. Se mira solo la ENFOCADA: si Comunidad queda con
 * una conversación abierta y se salta a otra pestaña (una notificación, por ejemplo), la barra
 * vuelve a verse en esa otra.
 */
export function pestanasOcultas(opciones: { tabBarStyle?: unknown } | undefined): boolean {
  /* `unknown`: el tipo de React Navigation admite estilos animados, y acá solo se lee `display`. */
  const estilo = StyleSheet.flatten(opciones?.tabBarStyle as Parameters<typeof StyleSheet.flatten>[0]) as
    | { display?: string }
    | undefined;
  return estilo?.display === 'none';
}
