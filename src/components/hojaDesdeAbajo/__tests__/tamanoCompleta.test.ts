import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La hoja `completa` (spec 011): el editor de Planificar ocupa todo el alto disponible, hasta debajo de la barra de
 * estado, sin que asome la pantalla de atrás. `grande` —la de las demás hojas de la app— no cambia.
 */

const BARRA_DE_ESTADO = 30;
const mockInsets = { top: BARRA_DE_ESTADO, bottom: 0, left: 0, right: 0 };

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

import { HojaDesdeAbajo, type HojaDesdeAbajoProps } from '../HojaDesdeAbajo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

function montar(tamano: HojaDesdeAbajoProps['tamano']): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(HojaDesdeAbajo, {
        visible: true,
        alCerrar: () => undefined,
        titulo: 'Planificar Descanso',
        tamano,
        children: React.createElement(Text, null, 'contenido'),
      }),
    );
  });
  return raiz!;
}

const estiloDe = (n: ReactTestInstance) => (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, unknown>;
/** La hoja misma: la vista que se anuncia como modal. */
const laHoja = (r: ReactTestRenderer): ReactTestInstance =>
  r.root.findAll(n => n.props.accessibilityViewIsModal === true)[0];
/** El contenedor que le da el relleno de arriba (el `KeyboardAvoidingView`). */
const elContenedor = (r: ReactTestRenderer): ReactTestInstance =>
  r.root.findAll(n => typeof estiloDe(n).paddingTop === 'number' && estiloDe(n).pointerEvents === 'box-none')[0];

const altoDeLaVentana = (): number => Dimensions.get('window').height;

describe('HojaDesdeAbajo: tamano completa', () => {
  it('ocupa todo el alto disponible, hasta debajo de la barra de estado', () => {
    const ventana = altoDeLaVentana();
    const r = montar('completa');
    expect(estiloDe(laHoja(r)).height).toBe(ventana - BARRA_DE_ESTADO);
    // Y el contenedor no le deja aire de más arriba: pegada a la barra de estado.
    expect(estiloDe(elContenedor(r)).paddingTop).toBe(BARRA_DE_ESTADO);
  });

  it('`grande` queda como siempre: 40 de fondo oscuro arriba y 8 de relleno', () => {
    const ventana = altoDeLaVentana();
    const r = montar('grande');
    expect(estiloDe(laHoja(r)).height).toBe(ventana - BARRA_DE_ESTADO - 40);
    expect(estiloDe(elContenedor(r)).paddingTop).toBe(BARRA_DE_ESTADO + 8);
  });

  it('`contenido` sigue sin alto fijo', () => {
    const r = montar(undefined);
    expect(estiloDe(laHoja(r)).height).toBeUndefined();
  });

  it('la completa es más alta que la grande en la misma pantalla', () => {
    const completa = estiloDe(laHoja(montar('completa'))).height as number;
    act(() => raiz?.unmount());
    const grande = estiloDe(laHoja(montar('grande'))).height as number;
    expect(completa).toBeGreaterThan(grande);
  });
});
