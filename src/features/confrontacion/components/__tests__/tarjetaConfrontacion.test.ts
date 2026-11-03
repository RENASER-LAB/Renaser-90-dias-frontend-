import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * La frase del día en Hoy sale SIEMPRE (2026-11-01, pedido del dueño: «que salga pese que no inició su programa»): con día de programa
 * por su día, y sin él —personal sin programa, Día 0, sin Día 1 elegido— por la fecha del calendario. Solo no se dibuja mientras no se
 * sabe ni el día ni la fecha.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

import { FRASES_DE_CONFRONTACION } from '../../data/frasesDeConfrontacion';
import { fraseDelDia } from '../../utils/fraseDelDia';
import { TarjetaConfrontacion } from '../TarjetaConfrontacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
function montar(props: { diaPrograma: number | null | undefined; fechaDeHoy?: string | null }) {
  act(() => {
    raiz = TestRenderer.create(React.createElement(TarjetaConfrontacion, props));
  });
}
const textos = (): string[] =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string').join(''));

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('TarjetaConfrontacion', () => {
  it('con día de programa dice la frase de su día', () => {
    montar({ diaPrograma: 12, fechaDeHoy: '2026-11-01' });
    expect(textos()).toEqual([fraseDelDia(12)!.texto]);
  });

  it('sin día de programa dice la frase del calendario (personal sin programa, Día 0, sin Día 1)', () => {
    for (const dia of [0, null, undefined]) {
      montar({ diaPrograma: dia, fechaDeHoy: '2026-11-01' });
      expect(textos()).toEqual([fraseDelDia(0, '2026-11-01')!.texto]);
      expect(FRASES_DE_CONFRONTACION.map(f => f.texto)).toContain(textos()[0]);
      act(() => raiz?.unmount());
    }
  });

  it('mientras no se sabe ni el día ni la fecha no dibuja nada (sin parpadeo)', () => {
    montar({ diaPrograma: null, fechaDeHoy: null });
    expect(textos()).toEqual([]);
    expect(raiz!.root.findAll(x => (x.type as unknown) === 'View')).toHaveLength(0);
  });
});
