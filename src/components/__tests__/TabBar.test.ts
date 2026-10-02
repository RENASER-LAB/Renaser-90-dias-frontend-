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
import { BarraInferiorProvider, useBarraInferior, type BarraInferior } from '../../navigation/barraAlDesplazar/BarraInferior';
import { StyleSheet } from 'react-native';

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

/**
 * «Ocultar la barra al desplazar» (2026-10-02): la barra se achica hasta el borde seguro de abajo
 * (no se desmonta ni tapa el contenido) y vuelve al cambiar de pestaña.
 */
describe('TabBar al desplazar', () => {
  let barra: BarraInferior | null = null;
  function Espia() {
    barra = useBarraInferior();
    return null;
  }
  function conBarra(indice: number) {
    const nombres = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];
    const routes = nombres.map(name => ({ key: `${name}-k`, name }));
    const props = {
      state: { index: indice, routes },
      descriptors: Object.fromEntries(routes.map(r => [r.key, { options: {} }])),
      navigation: { navigate: () => undefined },
    } as unknown as React.ComponentProps<typeof TabBar>;
    return React.createElement(BarraInferiorProvider, null, React.createElement(Espia), React.createElement(TabBar, props));
  }
  const barraInterior = (raiz: ReactTestRenderer) => raiz.root.findAll(n => typeof n.props.onLayout === 'function')[0];
  /** La caja de afuera: la madre de la barra, la que reserva el lugar. */
  const estiloDeLaCaja = (raiz: ReactTestRenderer) =>
    StyleSheet.flatten(raiz.root.findAll(n => n.props.testID === 'caja-de-la-barra')[0].props.style) as { height?: number };

  it('escondida, la caja queda del alto del borde seguro y la barra se desliza fuera de la pantalla', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(conBarra(0));
    });
    act(() => barraInterior(raiz).props.onLayout({ nativeEvent: { layout: { height: 100 } } }));
    expect(estiloDeLaCaja(raiz).height).toBe(100);
    expect(barra!.altoQueGana.value).toBe(76);
    act(() => barra!.fijarVisible(false));
    act(() => raiz.update(conBarra(0)));
    expect(barra!.escondida.value).toBe(1);
    expect(estiloDeLaCaja(raiz).height).toBe(24);
    const estilo = StyleSheet.flatten(barraInterior(raiz).props.style) as {
      position: string;
      bottom: number;
      transform: Array<{ translateY: number }>;
    };
    expect(estilo.position).toBe('absolute');
    expect(estilo.bottom).toBe(0);
    // Su alto entero más lo que asoma el botón de TRAINING: no queda nada a la vista.
    expect(estilo.transform[0].translateY).toBeGreaterThan(100);
    expect(barraInterior(raiz).props.accessibilityElementsHidden).toBe(true);
  });

  it('vuelve a la vista al cambiar de pestaña', () => {
    let raiz!: ReactTestRenderer;
    act(() => {
      raiz = TestRenderer.create(conBarra(0));
    });
    act(() => barra!.fijarVisible(false));
    expect(barra!.escondida.value).toBe(1);
    act(() => raiz.update(conBarra(1)));
    expect(barra!.escondida.value).toBe(0);
  });
});
