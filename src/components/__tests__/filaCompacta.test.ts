import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La fila compacta de Hoy y de Plan (2026-11-01): una sola para la acción que toca y para la entrada al programa propio. Con `onPress` es
 * un botón con chevron; sin él es una línea informativa; y la acción de la derecha (la ✕) va fuera de la fila tocable.
 */

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { FilaCompacta } from '../FilaCompacta';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
function montar(props: Partial<React.ComponentProps<typeof FilaCompacta>>) {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(FilaCompacta, { icono: 'calendarRange', titulo: 'Título', accessibilityLabel: 'Título.', ...props }),
    );
  });
}
const textos = () => raiz!.root.findAll(x => x.type === Text).map(x => [x.props.children].flat().join(''));
const iconos = () => raiz!.root.findAll(x => typeof x.props.name === 'string' && typeof x.props.size === 'number').map(x => x.props.name as string);
const botones = () => raiz!.root.findAll(x => x.props.accessibilityRole === 'button' && typeof x.props.onPress === 'function');

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('FilaCompacta', () => {
  it('con onPress es un botón de 72 como mínimo, con título, línea y chevron', () => {
    const alPulsar = jest.fn();
    montar({ titulo: 'Haz tu programa de 90 días', linea: 'Elige tu Día 1', onPress: alPulsar });
    expect(textos()).toEqual(['Haz tu programa de 90 días', 'Elige tu Día 1']);
    expect(iconos()).toEqual(['calendarRange', 'chevron']);
    expect(StyleSheet.flatten(botones()[0].props.style).minHeight).toBe(72);
    act(() => botones()[0].props.onPress());
    expect(alPulsar).toHaveBeenCalledTimes(1);
  });

  it('sin onPress es solo una línea informativa: sin chevron y sin botón', () => {
    montar({ titulo: 'Tu programa empieza el lunes 3 de noviembre', accessibilityLabel: 'Tu programa empieza el lunes 3 de noviembre' });
    expect(textos()).toEqual(['Tu programa empieza el lunes 3 de noviembre']);
    expect(iconos()).toEqual(['calendarRange']);
    expect(botones()).toHaveLength(0);
  });

  it('la acción de la derecha queda fuera de la fila tocable y le deja su lugar', () => {
    const equis = React.createElement(View, { testID: 'equis' });
    montar({ onPress: jest.fn(), accionDerecha: equis });
    const fila = botones()[0];
    const laEquis = (x: ReactTestInstance) => x.props.testID === 'equis' && (x.type as unknown) === 'View';
    expect(fila.findAll(laEquis)).toHaveLength(0);
    expect(raiz!.root.findAll(laEquis)).toHaveLength(1);
    expect(StyleSheet.flatten(fila.props.style).paddingRight).toBe(56);
  });
});
