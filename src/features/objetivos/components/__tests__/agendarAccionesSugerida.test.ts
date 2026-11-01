import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Agendar mis acciones» con la primera acción del diagnóstico (spec 026): en el eje de la prioridad principal se OFRECE como
 * «Sugerida por tu diagnóstico», sin agendarse sola; se elige tocándola. Sin diagnóstico no aparece nada (ni error ni hueco).
 * Contra el código anterior falla: se ofrecían las acciones del Mapa y se marcaban solas las que tocaban hoy.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
type PropsDeHoja = { visible?: boolean; titulo?: string; children?: React.ReactNode; pie?: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: (p: PropsDeHoja) => (p.visible ? R.createElement(View, null, p.children, p.pie) : null) };
});
jest.mock('../../../habits/components/RuedaHoraPicker', () => ({ RuedaHoraPicker: () => null }));
jest.mock('../../../habits/components/FilaDeDiasDelPlan', () => ({ FilaDeDiasDelPlan: () => null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));

import { AgendarAccionesModal } from '../AgendarAccionesModal';
import type { EjeObjetivo } from '../../types/objetivos.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Semana armada solo en estos ejes; el resto devuelve `null` y no se ofrece. */
function semanalCon(...ejes: EjeObjetivo[]) {
  return { deEje: (eje: EjeObjetivo) => (ejes.includes(eje) ? { id: `s-${eje}`, titulo: `Objetivo de la semana de ${eje}` } : null) };
}

const onGuardar = jest.fn();
let raiz: ReactTestRenderer | null = null;
function montar(sugerida: { eje: EjeObjetivo; texto: string } | null | undefined, ejes: EjeObjetivo[] = ['CUERPO', 'TRABAJO']) {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(AgendarAccionesModal, {
        visible: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        semanal: semanalCon(...ejes) as any,
        fecha: '2026-11-02',
        sugerida,
        guardando: false,
        onGuardar,
        onCerrar: jest.fn(),
      }),
    );
  });
}
const textos = (): string[] =>
  raiz!.root
    .findAll(x => (x.type as unknown) === 'Text')
    .map(x => React.Children.toArray(x.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''));
const filaCon = (texto: string): ReactTestInstance | undefined =>
  raiz!.root
    .findAll(x => typeof x.props.onPress === 'function' && x.findAll(h => (h.type as unknown) === 'Text' && h.props.children === texto).length > 0)
    .sort((a, b) => a.findAll(() => true).length - b.findAll(() => true).length)[0];

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  onGuardar.mockReset();
});

describe('la primera acción del diagnóstico al agendar', () => {
  const sugerencia = { eje: 'TRABAJO' as const, texto: 'El lunes revisaré mis ventas' };

  it('se ofrece en el eje de la prioridad principal, con «Sugerida por tu diagnóstico» (texto, no solo color)', () => {
    montar(sugerencia);
    expect(textos()).toContain('El lunes revisaré mis ventas');
    expect(textos()).toContain('Sugerida por tu diagnóstico');
  });

  it('no se agenda sola: nada viene marcado y el botón sigue apagado hasta tocarla', () => {
    montar(sugerencia);
    expect(textos().some(t => t.startsWith('Agendar ('))).toBe(false);
    expect(textos()).toContain('Agendar');
    expect(textos()).toContain('Negocio y dinero  ·  0/3');
    expect(textos()).toContain('Cuerpo  ·  0/3');
  });

  it('se elige tocándola, y entonces cuenta como una acción más', () => {
    montar(sugerencia);
    const fila = filaCon('El lunes revisaré mis ventas');
    expect(fila).toBeDefined();
    act(() => fila!.props.onPress());
    expect(textos()).toContain('Negocio y dinero  ·  1/3');
    expect(textos()).toContain('Agendar (1)');
  });

  it('solo aparece en SU eje: el otro eje con semana armada no ofrece nada sugerido', () => {
    montar(sugerencia, ['CUERPO', 'TRABAJO']);
    expect(textos().filter(t => t === 'Sugerida por tu diagnóstico')).toHaveLength(1);
    expect(textos().filter(t => t === 'El lunes revisaré mis ventas')).toHaveLength(1);
  });

  it('si su eje no tiene objetivo de la semana, no se ofrece (como todo lo de ese eje)', () => {
    montar(sugerencia, ['CUERPO']);
    expect(textos()).not.toContain('El lunes revisaré mis ventas');
  });

  it('sin diagnóstico (o sin sugerencia) no aparece ninguna sugerida y nada viene elegido', () => {
    for (const sinSugerencia of [null, undefined]) {
      montar(sinSugerencia);
      expect(textos().some(t => t.includes('Sugerida'))).toBe(false);
      expect(textos()).not.toContain('Cuerpo  ·  1/3');
      act(() => raiz?.unmount());
    }
  });
});
