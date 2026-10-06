/** La tarjeta de fase de Yo (diseño B): qué dice, y que no inventa la barra si no hay días. */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: jest.fn(), seleccion: jest.fn() } }));

import { dark } from '../../../../theme/tokens';
import { TarjetaDeFase } from '../TarjetaDeFase';

const ANIMAL = { nombre: 'Gorila', imagen: 1, imagenDeRespaldo: 2 };
const BASE = { numero: 2, totalDeFases: 4, nombreDeLaFase: 'El Ciclo Alquímico', animal: ANIMAL, diasDelPrograma: 90 };

function textos(props: Partial<React.ComponentProps<typeof TarjetaDeFase>>): string {
  let raiz!: ReactTestRenderer;
  act(() => { raiz = TestRenderer.create(React.createElement(TarjetaDeFase, { ...BASE, ...props })); });
  return raiz.root.findAll((n: ReactTestInstance) => n.type === 'Text')
    .map((n: ReactTestInstance) => [n.props.children].flat(Infinity).map((h: unknown) => (typeof h === 'string' || typeof h === 'number' ? String(h) : '')).join('')).join('|');
}

describe('TarjetaDeFase', () => {
  it('dice la fase, su nombre, el animal, los días de la fase y los del programa', () => {
    const t = textos({ diasDeLaFase: { dia: 8, total: 27 }, diaDelPrograma: 15 });
    expect(t).toContain('FASE 2 DE 4');
    expect(t).toContain('El Ciclo Alquímico');
    expect(t).toContain('Tu animal: ');
    expect(t).toContain('Gorila');
    expect(t).toContain('Día 8 de 27');
    expect(t).toContain('de esta fase');
    expect(t).toContain('Día 15 de 90 en total');
  });

  it('sin días de la fase no hay barra ni «de esta fase»: no se inventa un avance', () => {
    const t = textos({ diasDeLaFase: null, diaDelPrograma: 15 });
    expect(t).not.toContain('de esta fase');
    expect(t).toContain('Día 15 de 90 en total');
  });

  it('«¡Entraste en la Fase N!» solo cuando toca celebrar', () => {
    expect(textos({ celebrar: false })).not.toContain('Entraste');
    expect(textos({ celebrar: true })).toContain('¡Entraste en la Fase 2!');
  });

  it('se dibuja con la paleta que se le pase (la vista previa del administrador en oscuro)', () => {
    expect(() => textos({ paleta: dark, diasDeLaFase: { dia: 1, total: 7 } })).not.toThrow();
  });
});
