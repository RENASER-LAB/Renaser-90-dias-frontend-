import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El botón de luna/sol salió del onboarding junto con el del login (2026-10-05, pedido del dueño:
 * «quitamos la luna para que no afecte»). `MarcoDePaso` es el esqueleto de la Ficha Inicial, de
 * Términos y de «Elige tu Día 1», así que con mirarlo a él alcanza: ninguna de esas pantallas
 * puede volver a dibujar el interruptor sin pasar por acá. El modo oscuro sigue en Yo.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

import { MarcoDePaso } from '../MarcoDePaso';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('MarcoDePaso', () => {
  it('no tiene el botón de modo oscuro (sí la flecha de volver)', () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        React.createElement(MarcoDePaso, {
          alVolver: () => undefined,
          pie: React.createElement(Text, null, 'Siguiente'),
          children: React.createElement(Text, null, 'Contenido'),
        }),
      );
    });
    const etiquetas = r.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .map(n => n.props.accessibilityLabel as string);
    expect(etiquetas).toContain('Volver al paso anterior');
    expect(etiquetas.some(e => /modo (oscuro|claro)/i.test(e))).toBe(false);
    act(() => r.unmount());
  });
});
