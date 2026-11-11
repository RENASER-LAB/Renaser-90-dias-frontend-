import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Agendar mis acciones» y lo que se agendó sin señal (spec 048 fase 3, #183): una acción que espera señal cuenta para el tope de tres
 * por eje («Cuerpo · 1/3»), se ve en la hoja del día con «Se guardará al volver la señal», no se ofrece de nuevo, y al guardar viaja con
 * las nuevas (agendar un día lo reemplaza: sin ella el plan nuevo la borraría). Tocar una acción de otro día abre la hoja en ese día.
 * Contra el código anterior falla: la hoja decía «Cuerpo · 0/3» y no la mostraba.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
type PropsDeHoja = { visible?: boolean; children?: React.ReactNode; pie?: React.ReactNode };
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const R = jest.requireActual<typeof import('react')>('react');
  return { HojaDesdeAbajo: (p: PropsDeHoja) => (p.visible ? R.createElement(View, null, p.children, p.pie) : null) };
});
jest.mock('../../../habits/components/RuedaHoraPicker', () => ({ RuedaHoraPicker: () => null }));
jest.mock('../../../habits/components/FilaDeDiasDelPlan', () => ({ FilaDeDiasDelPlan: () => null }));
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: jest.fn(), logro: jest.fn(), error: jest.fn() } }));
// La semana que se dibuja es la del 9 al 15 de noviembre de 2026, sin depender del reloj.
jest.mock('../../../habits/utils/semanaDelPlan', () => ({
  ...jest.requireActual<typeof import('../../../habits/utils/semanaDelPlan')>('../../../habits/utils/semanaDelPlan'),
  fechasIsoDeLaSemana: () => ({ LUN: '2026-11-09', MAR: '2026-11-10', 'MIÉ': '2026-11-11', JUE: '2026-11-12', VIE: '2026-11-13', 'SÁB': '2026-11-14', DOM: '2026-11-15' }),
}));

import { AgendarAccionesModal } from '../AgendarAccionesModal';
import type { EjeObjetivo, RocaDiariaApi } from '../../types/objetivos.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const semanalCon = (...ejes: EjeObjetivo[]) => ({ deEje: (eje: EjeObjetivo) => (ejes.includes(eje) ? { id: `s-${eje}`, titulo: `Objetivo de ${eje}` } : null) });
let n = 0;
const enEspera = (extra: Partial<RocaDiariaApi> = {}): RocaDiariaApi => {
  n += 1;
  return {
    id: `pendiente:c${n}:CUERPO:${n}`, fecha: '2026-11-11', posicion: n, titulo: `Acción en espera ${n}`, descripcion: null, color: 'VERDE', puntajeImpacto: 5,
    esDelegable: false, eje: 'CUERPO', rocaSemanalId: null, horaInicio: null, horaFin: null, completada: false, completadaEn: null, puntosOtorgados: 0,
    bloqueada: false, acciones: [], pendienteDeEnvio: true, ...extra,
  };
};

const onGuardar = jest.fn();
let raiz: ReactTestRenderer | null = null;
function montar(props: { fecha?: string; enEspera?: RocaDiariaApi[]; abrirEnFecha?: string | null; sugerida?: { eje: EjeObjetivo; texto: string } | null } = {}) {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(AgendarAccionesModal, {
        visible: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        semanal: semanalCon('CUERPO', 'TRABAJO') as any,
        fecha: props.fecha ?? '2026-11-11',
        sugerida: props.sugerida ?? null,
        guardando: false,
        onGuardar,
        onCerrar: jest.fn(),
        enEspera: props.enEspera,
        abrirEnFecha: props.abrirEnFecha,
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
const botonAgendar = () => raiz!.root.findAll(x => typeof x.props.label === 'string' && x.props.label.startsWith('Agendar') && typeof x.props.onPress === 'function')[0];

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  onGuardar.mockReset();
});

describe('«Agendar mis acciones» con acciones que esperan señal (#183)', () => {
  it('la acción en espera del día cuenta para el tope («Cuerpo · 1/3») y se ve con «Se guardará al volver la señal»', () => { // spec 048 FR-019
    montar({ enEspera: [enEspera({ titulo: 'Caminar 30 minutos', horaInicio: '07:00:00' })] });
    expect(textos()).toContain('Cuerpo  ·  1/3');
    expect(textos()).toContain('Caminar 30 minutos');
    expect(textos()).toContain('A las 07:00 · Se guardará al volver la señal');
    expect(textos()).toContain('Negocio y dinero  ·  0/3');
  });

  it('lo que espera para OTRO día no cuenta en este', () => { // spec 048 FR-019
    montar({ fecha: '2026-11-12', enEspera: [enEspera({ titulo: 'Caminar 30 minutos' })] });
    expect(textos()).toContain('Cuerpo  ·  0/3');
    expect(textos()).not.toContain('Caminar 30 minutos');
  });

  it('tocar la acción en espera de otro día abre la hoja en SU día, donde se ve (abrirEnFecha)', () => { // spec 048 FR-019
    montar({ fecha: '2026-11-12', abrirEnFecha: '2026-11-11', enEspera: [enEspera({ titulo: 'Caminar 30 minutos' })] });
    expect(textos()).toContain('Cuerpo  ·  1/3');
    expect(textos()).toContain('Caminar 30 minutos');
  });

  it('con tres en espera el eje está lleno: no se puede elegir otra ni escribir otra', () => { // spec 048 FR-019
    montar({
      enEspera: [enEspera({ posicion: 1 }), enEspera({ posicion: 2 }), enEspera({ posicion: 3 })],
      sugerida: { eje: 'CUERPO', texto: 'Una cuarta' },
    });
    expect(textos()).toContain('Cuerpo  ·  3/3');
    const cuarta = filaCon('Una cuarta');
    expect(cuarta?.props.disabled).toBe(true);
    act(() => cuarta!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  3/3');
    expect(raiz!.root.findAll(x => (x.type as unknown) === 'TextInput' && x.props.placeholder === 'Escribe otra acción tuya')).toHaveLength(1); // solo el de Negocio y dinero
  });

  it('no se ofrece de nuevo lo que ya espera (no se agenda dos veces)', () => { // spec 048 FR-019
    montar({ enEspera: [enEspera({ titulo: 'El lunes revisaré mis ventas', eje: 'TRABAJO' })], sugerida: { eje: 'TRABAJO', texto: 'El lunes revisaré mis ventas' } });
    expect(textos().filter(t => t === 'El lunes revisaré mis ventas')).toHaveLength(1);
    expect(textos()).not.toContain('Sugerida por tu diagnóstico');
  });

  it('al guardar viaja el plan del día entero: primero lo que esperaba (con su hora) y después lo nuevo, con las posiciones seguidas', () => { // spec 048 FR-019
    montar({ enEspera: [enEspera({ titulo: 'Caminar 30 minutos', horaInicio: '07:00:00', posicion: 1 })], sugerida: { eje: 'CUERPO', texto: 'Estirar' } });
    act(() => filaCon('Estirar')!.props.onPress());
    expect(textos()).toContain('Cuerpo  ·  2/3');
    act(() => botonAgendar().props.onPress());
    expect(onGuardar).toHaveBeenCalledTimes(1);
    const [items, fecha] = onGuardar.mock.calls[0] as [Array<{ eje: string; posicion: number; titulo: string; horaInicio?: string }>, string];
    expect(fecha).toBe('2026-11-11');
    expect(items.map(i => [i.eje, i.posicion, i.titulo])).toEqual([['CUERPO', 1, 'Caminar 30 minutos'], ['CUERPO', 2, 'Estirar']]);
    expect(items[0].horaInicio).toBe('07:00');
  });

  it('sin nada en espera todo sigue como siempre (0/3, nada que mostrar)', () => { // spec 048 FR-019
    montar();
    expect(textos()).toContain('Cuerpo  ·  0/3');
    expect(textos().some(t => t.includes('Se guardará al volver la señal'))).toBe(false);
  });
});
