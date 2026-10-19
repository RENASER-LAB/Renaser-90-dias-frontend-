import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La tarjeta de Hoy mientras todavía no se sabe si la hora ya se respondió (2026-10-19): ni «Abierto»
 * ni «En espera» serían ciertos, así que no dibuja nada hasta tener la lectura.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { LinearGradient: View };
});

import { TarjetaCodigoRenaser } from '../TarjetaCodigoRenaser';
import type { EstadoRadar } from '../../utils/slotsDelRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slot = { hora: 10, etiqueta: '10:00', cierraA: '11:00' };

function dibujar(estado: EstadoRadar): ReactTestRenderer {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(TarjetaCodigoRenaser, { estado, obligatorio: true, minutosParaAbrir: 0, onResponder: () => undefined }),
    );
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll((n: ReactTestInstance) => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(x => typeof x === 'string').join(''))
    .join(' | ');
}

describe('TarjetaCodigoRenaser mientras carga', () => {
  it('no dibuja nada con el estado cargando', () => {
    const r = dibujar({ tipo: 'cargando', slot });
    expect(r.root.findAll((n: ReactTestInstance) => typeof n.type === 'string')).toHaveLength(0);
  });

  it('y en cuanto se sabe, dibuja el estado verdadero', () => {
    expect(textos(dibujar({ tipo: 'abierto', slot, minutosParaCerrar: 30 }))).toContain('Innegociable');
    expect(textos(dibujar({ tipo: 'respondido', slot, proximaHora: 11 }))).toContain('Registrado');
  });
});
