/**
 * El interruptor de la app (Yo, 2026-10-05): reemplaza al `Switch` con colores a mano, cuyo pulgar
 * salía verde azulado en la web (`activeThumbColor` por defecto de react-native-web).
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));

import { tacto } from '../../utils/tacto';
import { Interruptor } from '../Interruptor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function dibujar(props: Partial<React.ComponentProps<typeof Interruptor>> = {}) {
  const onCambiar = jest.fn<(v: boolean) => void>();
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(Interruptor, { valor: false, etiqueta: 'Modo oscuro', onCambiar, ...props }),
    );
  });
  const [boton] = raiz.root.findAll(
    (n: ReactTestInstance) => n.props.accessibilityRole === 'switch' && typeof n.props.onPress === 'function',
  );
  return { raiz, boton, onCambiar };
}

describe('el interruptor', () => {
  it('se anuncia como interruptor, con su nombre y su estado', () => {
    const { boton } = dibujar({ valor: true });
    expect(boton.props.accessibilityLabel).toBe('Modo oscuro');
    expect(boton.props.accessibilityState).toEqual({ checked: true, disabled: false });
    // La web solo lee `aria-checked` (react-native-web 0.21).
    expect(boton.props['aria-checked']).toBe(true);
  });

  it('al tocarlo pide el valor contrario y da un solo «tic»', () => {
    const { boton, onCambiar } = dibujar({ valor: false });
    act(() => boton.props.onPress());
    expect(onCambiar).toHaveBeenCalledWith(true);
    expect(tacto.seleccion).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado no se puede tocar', () => {
    const { boton } = dibujar({ deshabilitado: true });
    expect(boton.props.disabled).toBe(true);
    expect(boton.props.accessibilityState).toEqual({ checked: false, disabled: true });
    expect(boton.props['aria-checked']).toBe(false);
  });

  it('el área táctil llega a 48 aunque el riel mida 31', () => {
    const { boton } = dibujar();
    const estilo = [boton.props.style].flat(3).reduce((a, b) => ({ ...a, ...(b || {}) }), {}) as { minHeight?: number };
    expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
  });
});
