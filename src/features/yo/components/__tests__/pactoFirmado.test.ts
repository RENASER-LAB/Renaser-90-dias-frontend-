/**
 * El Pacto ya firmado, en solo lectura (decisión 12 del dueño, 2026-10-05): «Firmado el <fecha>», sin
 * lienzo ni «Sellar mi compromiso». La firma dibujada no se muestra porque el servidor no la devuelve.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { PactoFirmado } from '../PactoFirmado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function textos(firmadoEn: string | null): string[] {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(PactoFirmado, { firmadoEn }));
  });
  return raiz.root.findAll(n => n.type === Text).map(n => String(n.props.children));
}

describe('el Pacto firmado', () => {
  it('dice cuándo se firmó', () => {
    expect(textos('2026-09-29T17:10:00Z')).toEqual([
      'Firmado el 29 de septiembre de 2026',
      'Tu firma quedó guardada en tu expediente.',
    ]);
  });

  it('sin fecha legible dice que está firmado, sin inventar el día', () => {
    expect(textos(null)[0]).toBe('Pacto firmado');
  });
});
