import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { BotonPlanificarMes, ETIQUETA_DE_PLANIFICAR_MI_MES } from '../BotonPlanificarMes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('BotonPlanificarMes: la fila discreta de Plan', () => {
  it('dice «Planificar mi mes» y el mes en curso, es un botón y abre la hoja', () => {
    const onPress = jest.fn();
    act(() => {
      raiz = TestRenderer.create(React.createElement(BotonPlanificarMes, { mesEnCurso: 'Mes 2 · Semanas 5 a 8', onPress }));
    });
    expect(ETIQUETA_DE_PLANIFICAR_MI_MES).toBe('Planificar mi mes');
    const textos = raiz!.root.findAll(n => (n.type as unknown) === 'Text').map(n => String(n.props.children));
    expect(textos).toEqual(['Planificar mi mes', 'Mes 2 · Semanas 5 a 8']);
    const [boton] = raiz!.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(boton.props.accessibilityLabel).toBe('Planificar mi mes. Mes 2 · Semanas 5 a 8');
    act(() => boton.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('mientras no se sabe el mes en curso no dice ninguno', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(BotonPlanificarMes, { mesEnCurso: null, onPress: jest.fn() }));
    });
    const textos = raiz!.root.findAll(n => (n.type as unknown) === 'Text').map(n => String(n.props.children));
    expect(textos).toEqual(['Planificar mi mes']);
    const [boton] = raiz!.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(boton.props.accessibilityLabel).toBe('Planificar mi mes');
  });
});
