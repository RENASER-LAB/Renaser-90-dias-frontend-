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
const BASE = { numero: 2, totalDeFases: 4, nombreDeLaFase: 'El Ciclo Alquímico', rango: 'Días 8–34', animal: ANIMAL, diasDelPrograma: 90 };

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
    expect(t).toContain('Día 15 de 90');
    expect(t).toContain('Te quedan 19 días en esta fase');
  });

  it('el número grande es el MISMO día que Plan (Día 30 de 90), no el día dentro de la fase', () => {
    // Pedido del dueño, 2026-10-06 («ajusta el texto, no coincide»): en el día 30 la tarjeta decía «Día 23 de 27»
    // mientras Plan y Hoy hablaban del día 30. Contra el código anterior falla.
    const t = textos({ diasDeLaFase: { dia: 23, total: 27 }, diaDelPrograma: 30 });
    expect(t).toContain('Día 30 de 90');
    expect(t).not.toContain('Día 23 de 27');
    expect(t).toContain('Te quedan 4 días en esta fase');
  });

  it('el último día de la fase lo dice así, sin «te quedan 0»', () => {
    expect(textos({ diasDeLaFase: { dia: 27, total: 27 }, diaDelPrograma: 34 })).toContain('Último día de esta fase');
    expect(textos({ diasDeLaFase: { dia: 26, total: 27 }, diaDelPrograma: 33 })).toContain('Te queda 1 día en esta fase');
  });

  it('dice los mismos días de la fase que Plan («Días 8–34»), junto a «FASE 2 DE 4»', () => {
    // Pedido del dueño, 2026-10-06: «los mismos días que salen en Plan, en "Arquitectura de tiempo"».
    // Contra el código anterior falla: la tarjeta solo decía «Día 23 de 27 de esta fase».
    const t = textos({ diasDeLaFase: { dia: 23, total: 27 }, diaDelPrograma: 30 });
    expect(t).toContain('FASE 2 DE 4|Días 8–34');
  });

  it('sin días de la fase no hay barra ni «de esta fase»: no se inventa un avance', () => {
    const t = textos({ diasDeLaFase: null, diaDelPrograma: 15 });
    expect(t).not.toContain('en esta fase');
    expect(t).toContain('Día 15 de 90');
  });

  it('«¡Entraste en la Fase N!» solo cuando toca celebrar', () => {
    expect(textos({ celebrar: false })).not.toContain('Entraste');
    expect(textos({ celebrar: true })).toContain('¡Entraste en la Fase 2!');
  });

  it('se dibuja con la paleta que se le pase (la vista previa del administrador en oscuro)', () => {
    expect(() => textos({ paleta: dark, diasDeLaFase: { dia: 1, total: 7 } })).not.toThrow();
  });
});
