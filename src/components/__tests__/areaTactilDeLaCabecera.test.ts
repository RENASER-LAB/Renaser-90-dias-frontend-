/**
 * El botón de la cabecera (el engranaje de Yo, el de tu grupo en Comunidad) se toca en una caja de
 * 44 × 44, el mínimo de un área táctil (pedido del dueño del 2026-10-05). Era de 38; en la web no hay
 * `hitSlop`, así que el área tocable era la caja. El ícono sigue de 24 y la cabecera mide lo mismo: la
 * caja lleva márgenes de −3, ocupa en la fila lo que ocupaba la de 38.
 *
 * Contra el código anterior falla: `headerBtn` era `{ width: 38, height: 38 }` sin margen.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../theme/responsive', () => ({ useResponsive: () => ({ horizontalPadding: 18 }) }));

import { ScreenHeader } from '../ui';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(ScreenHeader, { title: 'YO', right: 'settings', etiquetaRight: 'Ajustes', onPressRight: () => undefined }),
    );
  });
  return raiz;
}

describe('el botón de la cabecera', () => {
  it('se toca en 44 × 44 y ocupa en la fila lo mismo que antes (38)', () => {
    const [boton] = montar().root.findAll(n => n.props.accessibilityLabel === 'Ajustes' && n.props.onPress !== undefined);
    const estilo = StyleSheet.flatten(boton.props.style) as { width: number; height: number; margin: number };
    expect({ ancho: estilo.width, alto: estilo.height }).toEqual({ ancho: 44, alto: 44 });
    expect(estilo.width + 2 * estilo.margin).toBe(38);
    expect(estilo.height + 2 * estilo.margin).toBe(38);
  });

  it('el ícono sigue de 24', () => {
    const [icono] = montar().root.findAll(n => typeof n.type === 'function' && (n.type as { name?: string }).name === 'Icon');
    expect(icono.props.size).toBe(24);
  });
});
