import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Pedido del dueño, 2026-11-01: con la letra del sistema grande, la cabecera de la ficha («Diana Diplomado T…» y el correo, junto a
 * «Escribirle») se cortaba con «…». El título y el subtítulo de `CabeceraAdmin` pasan a dos renglones en toda Administración.
 */
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { CabeceraAdmin } from '../CabeceraAdmin';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('la cabecera de Administración', () => {
  it('deja el título y el subtítulo en dos renglones, sin cortarlos en uno', () => {
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        React.createElement(CabeceraAdmin, {
          titulo: 'Diana Diplomado Tres con un nombre largo',
          subtitulo: 'ef-aprendiz-dip3@renaser.test',
          onVolver: () => undefined,
          accion: { etiqueta: 'Escribirle', onPress: () => undefined },
        }),
      );
    });
    const textos = r.root.findAll((n: ReactTestInstance) => (n.type as unknown) === 'Text');
    const delTitulo = textos.find(n => React.Children.toArray(n.props.children).join('').startsWith('Diana'));
    const delSubtitulo = textos.find(n => React.Children.toArray(n.props.children).join('').startsWith('ef-aprendiz'));
    expect(delTitulo?.props.numberOfLines).toBe(2);
    expect(delSubtitulo?.props.numberOfLines).toBe(2);
  });
});
