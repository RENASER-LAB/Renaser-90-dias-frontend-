import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El control segmentado que reemplazó a las pestañas «Iniciar sesión / Crear cuenta» del login y al
 * selector de tipo de documento de la ficha (2026-10-05). Lo que importa de su comportamiento:
 * avisa el cambio con UN háptico de selección, no hace nada al tocar la opción que ya está elegida,
 * y cada segmento se anuncia con su rol y su estado al lector de pantalla.
 */

const mockSeleccion = jest.fn();

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../utils/tacto', () => ({
  tacto: { seleccion: () => mockSeleccion(), error: () => undefined, logro: () => undefined },
}));

import { ControlSegmentado } from '../ControlSegmentado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
const onCambiar = jest.fn<(valor: 'login' | 'register') => void>();

function montar(valor: 'login' | 'register') {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(ControlSegmentado<'login' | 'register'>, {
        opciones: [
          { valor: 'login', etiqueta: 'Iniciar sesión' },
          { valor: 'register', etiqueta: 'Crear cuenta' },
        ],
        valor,
        onCambiar,
      }),
    );
  });
  return raiz!;
}

const segmento = (r: ReactTestRenderer, etiqueta: string) =>
  r.root.findAll(n => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  mockSeleccion.mockReset();
  onCambiar.mockReset();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('ControlSegmentado', () => {
  it('tocar la otra opción la elige y vibra una vez', () => {
    const r = montar('login');
    act(() => segmento(r, 'Crear cuenta').props.onPress());
    expect(onCambiar).toHaveBeenCalledWith('register');
    expect(mockSeleccion).toHaveBeenCalledTimes(1);
  });

  it('tocar la que ya está elegida no hace nada (ni vibra)', () => {
    const r = montar('login');
    act(() => segmento(r, 'Iniciar sesión').props.onPress());
    expect(onCambiar).not.toHaveBeenCalled();
    expect(mockSeleccion).not.toHaveBeenCalled();
  });

  it('cada segmento es una pestaña con su estado, para el lector de pantalla', () => {
    const r = montar('register');
    expect(segmento(r, 'Crear cuenta').props).toEqual(
      expect.objectContaining({ accessibilityRole: 'tab', accessibilityState: { selected: true } }),
    );
    expect(segmento(r, 'Iniciar sesión').props.accessibilityState).toEqual({ selected: false });
  });
});
