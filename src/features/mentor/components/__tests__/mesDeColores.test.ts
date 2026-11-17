import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { MesDeColores } from '../MesDeColores';
import { SemanaDeCirculos } from '../SemanaDeCirculos';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});

const montarMes = (elegido: string): ReactTestRenderer => {
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(
      React.createElement(MesDeColores, {
        mes: { anio: 2026, mes: 11 },
        hoy: '2026-11-17',
        diaUno: '2026-09-01',
        elegido,
        colorDe: (f: string) => (f === '2026-11-10' ? 'ROJO' : f === '2026-11-17' ? 'SIN_DATOS' : null),
        onElegir: () => undefined,
        onCambiarMes: () => undefined,
      }),
    );
  });
  return r;
};
type TextoDibujado = { texto: string; estilo: { color?: unknown; fontFamily?: unknown } };
const textos = (r: ReactTestRenderer): TextoDibujado[] => r.root.findAll(n => n.type === Text).map((t: { props: { children?: unknown; style?: unknown } }) => ({ texto: String(t.props.children), estilo: (StyleSheet.flatten(t.props.style as never) ?? {}) as TextoDibujado["estilo"] }));

describe('el mes de colores de la ficha', () => {
  it('va de sábado a viernes, como la fila de la semana y la semana del semáforo', () => { // spec 055 FR-011
    const iniciales = textos(montarMes('2026-11-17')).slice(1, 8).map(t => t.texto);
    expect(iniciales).toEqual(['S', 'D', 'L', 'M', 'M', 'J', 'V']);
  });

  it('no dibuja los días de otro mes (en Android el texto «transparente» sale negro y parecían elegibles)', () => { // spec 055 FR-015
    const numeros = textos(montarMes('2026-11-17')).map(t => t.texto);
    expect(numeros).not.toContain('31'); // 31 de octubre: no hay 31 en noviembre
    expect(numeros.filter(n => n === '1')).toHaveLength(1); // solo el 1 de noviembre, no el de diciembre
    for (const t of textos(montarMes('2026-11-17'))) expect(t.estilo.color).not.toBe('transparent');
  });

  it('el día no cambia de letra al elegirlo ni al soltarlo (en Android, cambiar la fuente dejaba invisible al 17)', () => { // spec 055 FR-015
    const fuenteDel17 = (elegido: string) => textos(montarMes(elegido)).find(t => t.texto === '17')?.estilo.fontFamily;
    expect(fuenteDel17('2026-11-17')).toBeDefined();
    expect(fuenteDel17('2026-11-17')).toBe(fuenteDel17('2026-11-10'));
  });

  it('en la fila de la semana tampoco cambia la letra al elegir un día', () => { // spec 055 FR-011
    const fuenteDel16 = (elegido: string) => {
      let r!: ReactTestRenderer;
      act(() => {
        r = TestRenderer.create(
          React.createElement(SemanaDeCirculos, {
            fechas: ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
            elegido, hoy: '2026-11-17', diaUno: '2026-09-01', colorDe: () => null, onElegir: () => undefined,
          }),
        );
      });
      return textos(r).find(t => t.texto === '16')?.estilo.fontFamily;
    };
    expect(fuenteDel16('2026-11-16')).toBe(fuenteDel16('2026-11-17'));
  });
});
