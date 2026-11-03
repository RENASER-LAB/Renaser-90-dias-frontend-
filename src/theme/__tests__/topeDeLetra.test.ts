import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import { aplicarTopeDeLetra, escalaDeLetra, TOPE_DE_LETRA } from '../topeDeLetra';

/**
 * El tope global de la letra del sistema (2026-11-03, pedido del dueño: «Redúcele el tamaño de texto, es muy grande»): `Text` y
 * `TextInput` de `react-native` reciben `maxFontSizeMultiplier = 1,2` cuando quien los usa no pidió el suyo. Se aplica una sola vez
 * (`topeDeLetraGlobal`, lo primero de `index.ts`); la prueba lo aplica y lo deshace por su cuenta.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as typeof import('react-native');

const deshaceres: Array<() => void> = [];
afterEach(() => {
  for (const d of deshaceres.splice(0)) d();
});
const aplicar = () => {
  const deshacer = aplicarTopeDeLetra();
  deshaceres.push(deshacer);
  return deshacer;
};

/** El nodo nativo (`Text` / `TextInput` en minúsculas del doble de Jest) que dibuja un elemento. */
function nativo(elemento: React.ReactElement, tipo: 'Text' | 'TextInput'): ReactTestInstance {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  return r.root.findAll((n: ReactTestInstance) => (n.type as unknown) === tipo)[0];
}

describe('el tope es 1,2', () => {
  it('es el número que pidió el coordinador', () => {
    expect(TOPE_DE_LETRA).toBe(1.2);
  });

  it('`escalaDeLetra` deja pasar la letra normal, la deja crecer hasta el tope y no más', () => {
    expect(escalaDeLetra(1)).toBe(1);
    expect(escalaDeLetra(1.1)).toBe(1.1);
    expect(escalaDeLetra(1.3)).toBe(1.2);
    expect(escalaDeLetra(2)).toBe(1.2);
    // Una letra más chica que la normal no se achica más: las cuentas de espacio parten de 1.
    expect(escalaDeLetra(0.85)).toBe(1);
    expect(escalaDeLetra(Number.NaN)).toBe(1);
    expect(escalaDeLetra(0)).toBe(1);
  });
});

describe('Text y TextInput de react-native, con el tope', () => {
  it('sin aplicar, no llevan ninguno (la prueba parte de un React Native limpio)', () => {
    expect(nativo(React.createElement(RN.Text, null, 'hola'), 'Text').props.maxFontSizeMultiplier).toBeUndefined();
  });

  it('un Text que no dice nada recibe 1,2, y su texto y su estilo pasan tal cual', () => {
    aplicar();
    const t = nativo(React.createElement(RN.Text, { style: { fontSize: 17 }, numberOfLines: 2 }, 'hola'), 'Text');
    expect(t.props.maxFontSizeMultiplier).toBe(1.2);
    expect(t.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(t.props.style).fontSize).toBe(17);
    expect(React.Children.toArray(t.props.children)).toEqual(['hola']);
  });

  it('un TextInput también, y conserva `TextInput.State`', () => {
    aplicar();
    const i = nativo(React.createElement(RN.TextInput, { value: 'abc', placeholder: 'Escribe' }), 'TextInput');
    expect(i.props.maxFontSizeMultiplier).toBe(1.2);
    expect(i.props.placeholder).toBe('Escribe');
    expect(typeof RN.TextInput.State.currentlyFocusedInput).toBe('function');
  });

  it('lo que cada lugar pide gana: un tope propio, y también `allowFontScaling={false}`', () => {
    aplicar();
    expect(nativo(React.createElement(RN.Text, { maxFontSizeMultiplier: 1.3 }, 'a'), 'Text').props.maxFontSizeMultiplier).toBe(1.3);
    expect(nativo(React.createElement(RN.Text, { maxFontSizeMultiplier: 1.15 }, 'a'), 'Text').props.maxFontSizeMultiplier).toBe(1.15);
    expect(nativo(React.createElement(RN.Text, { allowFontScaling: false }, 'a'), 'Text').props.allowFontScaling).toBe(false);
    // `undefined` explícito (un componente que reenvía una prop que no recibió) no borra el tope.
    expect(nativo(React.createElement(RN.Text, { maxFontSizeMultiplier: undefined }, 'a'), 'Text').props.maxFontSizeMultiplier).toBe(1.2);
  });

  it('el `ref` y el `onPress` llegan al texto de verdad', () => {
    aplicar();
    const alTocar = jest.fn();
    const t = nativo(React.createElement(RN.Text, { onPress: alTocar }, 'toca'), 'Text');
    act(() => t.props.onPress());
    expect(alTocar).toHaveBeenCalledTimes(1);
  });

  it('aplicarlo dos veces no envuelve dos veces', () => {
    aplicar();
    const primero = RN.Text;
    aplicar();
    expect(RN.Text).toBe(primero);
  });

  it('deshacerlo devuelve los componentes originales', () => {
    const antesText = RN.Text;
    const antesInput = RN.TextInput;
    const deshacer = aplicarTopeDeLetra();
    expect(RN.Text).not.toBe(antesText);
    expect(RN.TextInput).not.toBe(antesInput);
    deshacer();
    expect(RN.Text).toBe(antesText);
    expect(RN.TextInput).toBe(antesInput);
  });

  it('en web no toca nada', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    try {
      const antes = RN.Text;
      aplicarTopeDeLetra();
      expect(RN.Text).toBe(antes);
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original });
    }
  });
});

describe('quién lo aplica', () => {
  it('`index.ts` carga el tope ANTES que la app, para que nada guarde el Text sin tope al cargar', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const entrada = fs.readFileSync(require.resolve('../../../index.ts'), 'utf-8');
    expect(entrada.indexOf("./src/theme/topeDeLetraGlobal")).toBeGreaterThan(-1);
    expect(entrada.indexOf("./src/theme/topeDeLetraGlobal")).toBeLessThan(entrada.indexOf("from 'expo'"));
    expect(entrada.indexOf("./src/theme/topeDeLetraGlobal")).toBeLessThan(entrada.indexOf("from './App'"));
    const global = fs.readFileSync(require.resolve('../topeDeLetraGlobal.ts'), 'utf-8');
    expect(global).toMatch(/^aplicarTopeDeLetra\(\);$/m);
  });

  it('las cuentas de espacio que seguían a `fontScale` ya usan la escala con tope', () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const leer = (ruta: string) => fs.readFileSync(require.resolve(ruta), 'utf-8');
    expect(leer('../../features/training/components/FilaDelDia.tsx')).toContain('escalaDeLetra(fontScale)');
    expect(leer('../../features/huecos/components/LineaDeTiempoDelDia.tsx')).toContain('escalaDeLetra(fontScale)');
    expect(leer('../../features/yo/components/TarjetaDeFase.tsx')).toContain('escalaDeLetra(ventana.fontScale)');
  });
});
