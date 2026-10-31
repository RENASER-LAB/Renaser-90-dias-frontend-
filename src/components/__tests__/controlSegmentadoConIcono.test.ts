import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/** El selector de eje de Plan (2026-10-31): un ícono de 16 delante de la etiqueta, opcional; sin él el segmento es el de siempre. */

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('../../utils/tacto', () => ({ tacto: { seleccion: jest.fn() } }));

import { ControlSegmentado } from '../ControlSegmentado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

const OPCIONES = [
  { valor: 'CUERPO', etiqueta: 'Cuerpo', icono: 'activity' as const },
  { valor: 'TRABAJO', etiqueta: 'Negocio', icono: 'briefcase' as const },
  { valor: 'RELACIONES', etiqueta: 'Relaciones', icono: 'heartHandshake' as const },
];
const montar = (opciones: readonly { valor: string; etiqueta: string; icono?: 'activity' | 'briefcase' | 'heartHandshake' }[]) =>
  act(() => {
    raiz = TestRenderer.create(React.createElement(ControlSegmentado, { opciones, valor: 'CUERPO', onCambiar: () => undefined, achicarTexto: true }));
  });
const iconos = () => raiz!.root.findAll(x => typeof x.props.name === 'string' && x.props.size === 16).map(x => x.props.name);

describe('ControlSegmentado con ícono', () => {
  it('cada segmento lleva el ícono de su eje a 16, además de su etiqueta', () => {
    montar(OPCIONES);
    expect(iconos()).toEqual(['activity', 'briefcase', 'heartHandshake']);
    const etiquetas = raiz!.root.findAll(x => (x.type as unknown) === 'Text').map(x => x.props.children);
    expect(etiquetas).toEqual(['Cuerpo', 'Negocio', 'Relaciones']);
  });

  it('sin ícono el segmento es el de siempre', () => {
    montar(OPCIONES.map(({ valor, etiqueta }) => ({ valor, etiqueta })));
    expect(iconos()).toEqual([]);
  });

  it('el nombre accesible sigue siendo la etiqueta (el ícono se ignora)', () => {
    montar(OPCIONES);
    const botones = raiz!.root.findAll(x => x.props.accessibilityRole && typeof x.props.onPress === 'function' && (x.type as unknown) !== 'View');
    expect(botones.map(b => b.props.accessibilityLabel)).toEqual(['Cuerpo', 'Negocio', 'Relaciones']);
  });
});
