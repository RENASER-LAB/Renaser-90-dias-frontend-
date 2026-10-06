/** La fila de los cuatro animales de Yo: qué se dice de cada uno según la fase en la que estás. */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: jest.fn(), seleccion: jest.fn() } }));

import { FilaDeFases } from '../FilaDeFases';
import { estadoDeLasFases } from '../../utils/estadoDeLasFases';

function etiquetas(fase: string): string[] {
  let raiz!: ReactTestRenderer;
  act(() => { raiz = TestRenderer.create(React.createElement(FilaDeFases, { fases: estadoDeLasFases(fase) })); });
  return raiz.root.findAll((n: ReactTestInstance) => n.type === 'View' && typeof n.props.accessibilityLabel === 'string' && n.props.accessible === true)
    .map((n: ReactTestInstance) => n.props.accessibilityLabel as string);
}

describe('FilaDeFases', () => {
  it('en la fase 2: el mono superado, el gorila actual, el caballo y el águila sin llegar', () => {
    expect(etiquetas('PHASE_2_DEVELOPMENT')).toEqual([
      'Fase 1, Mono, superada',
      'Fase 2, Gorila, tu fase actual',
      'Fase 3, Caballo, todavía no llegas',
      'Fase 4, Águila, todavía no llegas',
    ]);
  });

  it('en la fase 1 ninguna futura se anuncia como superada', () => {
    expect(etiquetas('PHASE_1_REBIRTH').filter(e => e.includes('superada'))).toEqual([]);
  });
});
