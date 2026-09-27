/**
 * La barra de pestañas propia obedece `tabBarStyle: { display: 'none' }` de la pestaña enfocada
 * (2026-09-26, conversación de Comunidad a pantalla completa). Antes la ignoraba: una barra
 * propia no lee esa opción sola.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));

import { TabBar } from '../TabBar';
import { OPCIONES_CON_PESTANAS, OPCIONES_SIN_PESTANAS } from '../../navigation/pestanasOcultas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(opcionesDeComunidad: object): ReactTestRenderer {
  const nombres = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];
  const routes = nombres.map(name => ({ key: `${name}-k`, name }));
  const descriptors = Object.fromEntries(
    routes.map(r => [r.key, { options: r.name === 'Comunidad' ? opcionesDeComunidad : {} }])
  );
  const props = {
    state: { index: 3, routes },
    descriptors,
    navigation: { navigate: () => undefined },
  } as unknown as React.ComponentProps<typeof TabBar>;
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(TabBar, props));
  });
  return raiz;
}

describe('TabBar', () => {
  it('no se dibuja mientras Comunidad tiene una conversación abierta', () => {
    expect(dibujar(OPCIONES_SIN_PESTANAS).root.findAll(n => (n.type as unknown) === 'Text')).toHaveLength(0);
  });

  it('vuelve al cerrarla', () => {
    expect(dibujar(OPCIONES_CON_PESTANAS).root.findAll(n => (n.type as unknown) === 'Text').length).toBeGreaterThan(0);
  });
});
