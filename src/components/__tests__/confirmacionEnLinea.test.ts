/**
 * `ConfirmacionEnLinea` (2026-10-05): el reemplazo de los diálogos de éxito de Comunidad. Se lee, se
 * anuncia al lector de pantalla y se va sola; quien la muestra se entera cuando terminó de irse.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { CONFIRMACION_VISIBLE_MS, ConfirmacionEnLinea } from '../ConfirmacionEnLinea';
import { DURACION_MS } from '../../theme/movimiento';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('ConfirmacionEnLinea', () => {
  it('muestra el texto, lo anuncia y avisa al terminar de irse', () => {
    const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    const onTerminar = jest.fn();
    act(() => {
      raiz = TestRenderer.create(React.createElement(ConfirmacionEnLinea, { texto: 'Publicado en el Muro.', onTerminar }));
    });
    const textos = raiz!.root.findAll(n => n.type === 'Text').map(n => n.props.children);
    expect(textos).toContain('Publicado en el Muro.');
    expect(anunciar).toHaveBeenCalledWith('Publicado en el Muro.');

    act(() => {
      jest.advanceTimersByTime(CONFIRMACION_VISIBLE_MS);
    });
    expect(onTerminar).not.toHaveBeenCalled(); // está saliendo (fundido)
    act(() => {
      jest.advanceTimersByTime(DURACION_MS.fundido);
    });
    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it('si cambia el texto (el hábito se cerró después de publicar), sigue a la vista otro rato', () => {
    const onTerminar = jest.fn();
    act(() => {
      raiz = TestRenderer.create(React.createElement(ConfirmacionEnLinea, { texto: 'Publicado en el Muro.', onTerminar }));
    });
    act(() => {
      jest.advanceTimersByTime(CONFIRMACION_VISIBLE_MS - 500);
    });
    act(() => {
      raiz!.update(React.createElement(ConfirmacionEnLinea, { texto: 'Publicado. Tu hábito se completó.', onTerminar }));
    });
    act(() => {
      jest.advanceTimersByTime(1000 + DURACION_MS.fundido);
    });
    expect(onTerminar).not.toHaveBeenCalled();
  });
});
