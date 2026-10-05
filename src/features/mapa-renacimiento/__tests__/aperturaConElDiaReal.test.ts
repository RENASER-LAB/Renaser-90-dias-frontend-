import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La apertura del Mapa con el día REAL del programa (bug reportado en la auditoría de Hoy del
 * 2026-10-05): una cuenta en el día 15 leía «Día 15 de 90» y «los próximos 75 días» en Hoy, tocaba la
 * tarjeta del Mapa y la apertura le decía «DÍA 7» y «los próximos 83 días» (texto escrito a mano de
 * cuando el Mapa vivía en el Día 7), con otro «Día 7» en la cabecera del paso.
 *
 * Contra el código anterior falla: la pantalla dibujaba «DÍA 7», «Día 7» y «83 días» sin importar el día.
 */

type Programa = { diaPrograma: number; fase: string | null; inscrito: boolean; loading: boolean; recargar: () => Promise<void> };
let mockPrograma: Programa;

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../programa/hooks/useProgramaDia', () => ({ useProgramaDia: () => mockPrograma }));

import { AperturaScreen } from '../screens/AperturaScreen';
import { textosDeApertura } from '../textosDeApertura';
import { diasQueQuedan } from '../../home/utils/diasQueQuedan';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(): ReactTestRenderer {
  const estado = { mapa: { estado: 'no_iniciado', pasoActual: 1 }, siguiente: () => undefined };
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(AperturaScreen, { estado: estado as never, onSalir: () => undefined }),
    );
  });
  return r;
}

function textos(r: ReactTestRenderer): string {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''))
    .join(' | ');
}

describe('la apertura del Mapa', () => {
  beforeEach(() => {
    mockPrograma = { diaPrograma: 15, fase: 'PHASE_2_DEVELOPMENT', inscrito: true, loading: false, recargar: async () => undefined };
  });

  it('en el día 15 dice «Día 15» y «los próximos 75 días», como Hoy', () => {
    const texto = textos(montar());
    expect(texto).toContain('Día 15');
    expect(texto).toContain('un plan claro para los próximos 75 días.');
    expect(texto).not.toMatch(/DÍA 7|Día 7\b|83 días/);
  });

  it('la cuenta de los días que quedan es la de Hoy (90 menos el día, nunca menos de 1)', () => {
    for (const dia of [0, 1, 7, 15, 89, 90]) {
      mockPrograma = { ...mockPrograma, diaPrograma: dia };
      const esperado = diasQueQuedan(dia);
      const { plan } = textosDeApertura(mockPrograma);
      expect(plan).toContain(esperado === 1 ? 'el día que queda.' : `los próximos ${esperado} días.`);
    }
    expect(diasQueQuedan(15)).toBe(75);
    expect(diasQueQuedan(90)).toBe(1);
  });

  it('mientras no se sabe el día (cargando o sin lectura) no inventa ningún número', () => {
    mockPrograma = { ...mockPrograma, loading: true };
    const cargando = textos(montar());
    expect(cargando).not.toMatch(/Día \d|\d+ días/);
    expect(cargando).toContain('un plan claro para lo que queda del programa.');

    mockPrograma = { diaPrograma: 0, fase: null, inscrito: false, loading: false, recargar: async () => undefined };
    expect(textos(montar())).not.toMatch(/Día \d|\d+ días/);
  });

  it('la cabecera del paso ya no dice «Día 7»: solo el paso', () => {
    const texto = textos(montar());
    expect(texto).toContain('Paso 1 de 10');
    expect(texto.split(' | ').filter(t => /^Día \d+$/.test(t))).toEqual(['Día 15']);
  });
});
