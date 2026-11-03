import React from 'react';
import { Platform } from 'react-native';

/**
 * El tope GLOBAL de cuánto crece la letra con el tamaño de fuente del sistema (2026-11-03, pedido del dueño con capturas de un
 * teléfono real: «Redúcele el tamaño de texto, es muy grande»).
 *
 * ## Por qué
 *
 * Android deja elegir un tamaño de letra hasta el 200 %, y React Native lo aplica a TODO `Text` y `TextInput` sin límite. En el
 * teléfono del dueño la letra del sistema estaba agrandada y cada pantalla (Eventos, la tarjeta de acciones de Hoy…) se veía enorme
 * y ocupaba media pantalla. Hasta ahora solo unos pocos lugares ponían su propio `maxFontSizeMultiplier`.
 *
 * ## Qué hace
 *
 * `TOPE_DE_LETRA` = **1,2**: con la letra del sistema al 130 %, 150 % o 200 %, la app crece como mucho un 20 %. Se sigue
 * respetando la accesibilidad (la letra no deja de agrandarse) pero nada se desborda. Es un máximo, no un tamaño: con la letra
 * del sistema al 100 % o al 110 % nada cambia.
 *
 * - **Se aplica una sola vez, a `Text` y `TextInput` de `react-native`** (`aplicarTopeDeLetra`, llamado por `topeDeLetraGlobal`,
 *   que es lo primero que carga `index.ts`). En React Native 0.86 / React 19 `Text.defaultProps` ya no se lee, y cambiar los
 *   cientos de `import { Text } from 'react-native'` por un componente propio habría sido otro riesgo; por eso se envuelven los
 *   dos componentes en la propia exportación del módulo. Los envoltorios solo suman la prop: `ref`, `style`, `onPress`, las
 *   estáticas de `TextInput` (`TextInput.State`) y todo lo demás pasan tal cual.
 * - **Lo que cada lugar pide gana.** Un `Text` con su propio `maxFontSizeMultiplier` (los chips de días, la rueda de «Otra») o con
 *   `allowFontScaling={false}` se comporta como antes; el tope solo cubre lo que no dice nada.
 * - **En web no se hace nada**: `react-native-web` no usa `maxFontSizeMultiplier` y el navegador ya escala por su cuenta.
 * - **Lo que usa `fontScale` para reservar espacio** (la hora de Training, la línea de tiempo del tiempo libre, la tarjeta de fase de
 *   Yo, las mitades de Hoy) pasa por {@link escalaDeLetra}: la letra nunca crece más que el tope, así que reservar más sería
 *   gastar espacio sin motivo.
 */
export const TOPE_DE_LETRA = 1.2;

/** La escala de letra que de verdad se ve: la del sistema, entre 1 y el tope. Para las cuentas de espacio que dependen de `fontScale`. */
export function escalaDeLetra(fontScale: number, tope: number = TOPE_DE_LETRA): number {
  if (!Number.isFinite(fontScale) || fontScale <= 0) return 1;
  return Math.min(Math.max(fontScale, 1), tope);
}

type PropsDeTexto = { maxFontSizeMultiplier?: number | null } & Record<string, unknown>;
type Componente = React.ComponentType<PropsDeTexto> & Record<string, unknown>;

const MARCA = '__conTopeDeLetra';

/** Envuelve un componente de texto para darle el tope cuando quien lo usa no pidió el suyo. */
function conTope(Original: Componente, tope: number): Componente {
  const ConTope = (props: PropsDeTexto) =>
    React.createElement(Original, { ...props, maxFontSizeMultiplier: props.maxFontSizeMultiplier ?? tope });
  // Las estáticas (`TextInput.State`…) y el nombre se heredan; la marca evita envolver dos veces.
  const envuelto = Object.assign(ConTope, Original, { displayName: Original.displayName ?? 'Texto', [MARCA]: true });
  return envuelto as unknown as Componente;
}

/**
 * Pone el tope a `Text` y `TextInput` de `react-native`. Devuelve la función que lo deshace (para las pruebas).
 * Llamarla dos veces no envuelve dos veces.
 */
export function aplicarTopeDeLetra(tope: number = TOPE_DE_LETRA): () => void {
  if (Platform.OS === 'web') return () => undefined;
  // `require` y no `import`: hace falta la propia exportación del módulo (un objeto con getters configurables), no una copia.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as Record<string, unknown>;
  const deshacer: Array<() => void> = [];
  for (const nombre of ['Text', 'TextInput'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(RN, nombre);
    const original = RN[nombre] as Componente | undefined;
    if (!descriptor || !descriptor.configurable || !original || original[MARCA]) continue;
    const envuelto = conTope(original, tope);
    Object.defineProperty(RN, nombre, { configurable: true, enumerable: descriptor.enumerable, get: () => envuelto });
    deshacer.push(() => Object.defineProperty(RN, nombre, descriptor));
  }
  return () => deshacer.forEach(f => f());
}
