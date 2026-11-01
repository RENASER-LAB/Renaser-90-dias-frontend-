import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import type { OfertaDeRepetirApi, ResultadoDeRepetirApi } from '../../../habits/types/habits.types';
import { ApiError } from '../../../../services/http/apiClient';

/**
 * Spec 028: la tarjeta «Repetir tu semana» de «Tus prácticas», montada de verdad con el hook y el servidor simulado.
 * Repetir en un toque, repetir reemplazando (resumen + segundo toque + 409), «Ahora no», deshacer y que no dibuje nada mientras no sabe.
 */

const mockOferta = jest.fn<() => Promise<OfertaDeRepetirApi | null>>();
const mockRepetir = jest.fn<(modelo: string, siguiente: string, replace: boolean) => Promise<ResultadoDeRepetirApi>>();
const mockDeshacer = jest.fn<(semana: string) => Promise<number>>();
const mockAlerta = jest.fn<(titulo: string, mensaje?: string, botones?: { text: string; onPress?: () => void }[]) => void>();
const mockLogro = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, error: () => undefined, logro: () => mockLogro() } }));
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string, botones?: { text: string; onPress?: () => void }[]) => mockAlerta(titulo, mensaje, botones) },
}));
jest.mock('../../../habits/api/habitsApi', () => ({
  obtenerOfertaDeRepetir: () => mockOferta(),
  repetirLaSemana: (modelo: string, siguiente: string, replace: boolean) => mockRepetir(modelo, siguiente, replace),
  deshacerLaSemana: (semana: string) => mockDeshacer(semana),
}));
/** La hoja es otra pieza: acá solo importa cuándo está abierta y lo que lleva. */
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    HojaDesdeAbajo: (props: { visible: boolean; titulo: string; pie?: React.ReactNode; children: React.ReactNode }) =>
      props.visible ? R.createElement('Hoja', { testID: 'hoja' }, R.createElement('Text', null, props.titulo), props.children, props.pie) : null,
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOfertaDeRepetirSemana } from '../../hooks/useOfertaDeRepetirSemana';
import { OfertaDeRepetirSemana } from '../OfertaDeRepetirSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const oferta = (extra: Partial<OfertaDeRepetirApi> = {}): OfertaDeRepetirApi => ({
  sourceWeekStart: '2026-10-26',
  targetWeekStart: '2026-11-02',
  fingerprint: 'huella-1',
  replacesOwnChanges: false,
  habits: [
    {
      habitId: 'h1',
      title: 'Despertar',
      days: [{ date: '2026-11-07', weekday: 'SATURDAY', active: true, triggerTime: '09:00:00', customTime: true }],
    },
  ],
  excluded: [{ habitId: 'h9', title: 'Meditar', reason: 'NOT_AVAILABLE' }],
  ...extra,
});
const resultado: ResultadoDeRepetirApi = { targetWeekStart: '2026-11-02', copiedDays: 1, removedDays: 0, habits: 1, excluded: [] };

const alCambiar = jest.fn<() => Promise<unknown>>();
function Arnes() {
  const uso = useOfertaDeRepetirSemana('u-1', true, alCambiar);
  return React.createElement(OfertaDeRepetirSemana, { uso });
}

let raiz: ReactTestRenderer | null = null;
const esperar = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
async function montar() {
  await act(async () => { raiz = TestRenderer.create(React.createElement(Arnes)); });
  await esperar();
}
const textoDe = (n: ReactTestInstance) => React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join('');
const textos = () => raiz!.root.findAll(n => (n.type as unknown) === 'Text').map(textoDe).join(' | ');
/** Lo que se toca y dice algo por su `label` (GoldButton) o por un texto adentro (Presionable). */
function boton(nombre: string): ReactTestInstance {
  const candidatos = raiz!.root.findAll(n => typeof n.props.onPress === 'function'
    && (n.props.label === nombre || n.props.accessibilityLabel === nombre
      || n.findAll(h => (h.type as unknown) === 'Text' && textoDe(h) === nombre).length > 0));
  expect(candidatos.length).toBeGreaterThan(0);
  return candidatos[candidatos.length - 1];
}
const tocar = async (nombre: string) => { await act(async () => { boton(nombre).props.onPress(); }); await esperar(); };
const hayBoton = (nombre: string) => raiz!.root.findAll(n => typeof n.props.onPress === 'function'
  && (n.props.label === nombre || n.props.accessibilityLabel === nombre
    || n.findAll(h => (h.type as unknown) === 'Text' && textoDe(h) === nombre).length > 0)).length > 0;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockOferta.mockReset();
  mockRepetir.mockReset();
  mockDeshacer.mockReset();
  mockAlerta.mockReset();
  mockLogro.mockReset();
  alCambiar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la tarjeta', () => {
  it('no dibuja nada mientras no sabe, ni si no hay oferta', async () => {
    let responder!: (o: OfertaDeRepetirApi | null) => void;
    mockOferta.mockImplementation(() => new Promise(r => { responder = r; }));
    await montar();
    expect(raiz!.root.findAll(n => n.props.testID === 'oferta-de-repetir-semana')).toHaveLength(0);
    expect(textos()).toBe('');
    await act(async () => { responder(null); });
    expect(textos()).toBe('');
  });

  it('con oferta dice qué semana se repite y en cuál, con «Repetir», «Ahora no» y «Ver qué se repite»', async () => {
    mockOferta.mockResolvedValue(oferta());
    await montar();
    const todo = textos();
    expect(todo).toContain('Repetir tu semana');
    expect(todo).toContain('Tu semana del 26 oct al 1 nov, en la del 2 al 8 nov');
    expect(todo).toContain('1 hábito · 1 día');
    expect(hayBoton('Repetir')).toBe(true);
    expect(hayBoton('Ahora no')).toBe(true);
    expect(hayBoton('Ver qué se repite')).toBe(true);
  });
});

describe('repetir en un toque (sin nada que reemplazar)', () => {
  it('manda replace:false, vibra, dice cómo quedó la semana con «Deshacer» y pone al día las alarmas', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockResolvedValue(resultado);
    await montar();
    await tocar('Repetir');

    expect(mockRepetir).toHaveBeenCalledWith('2026-10-26', '2026-11-02', false);
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(alCambiar).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Tu semana del 2 al 8 nov quedó como esta');
    expect(hayBoton('Deshacer: volver al plan de siempre')).toBe(true);
    expect(raiz!.root.findAll(n => n.props.testID === 'oferta-de-repetir-semana')).toHaveLength(0);
  });

  it('«Deshacer» devuelve la semana al plan de siempre y lo dice', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockResolvedValue(resultado);
    mockDeshacer.mockResolvedValue(1);
    await montar();
    await tocar('Repetir');
    mockOferta.mockResolvedValue(null);
    await tocar('Deshacer: volver al plan de siempre');

    expect(mockDeshacer).toHaveBeenCalledWith('2026-11-02');
    expect(textos()).toContain('Tu semana del 2 al 8 nov volvió al plan de siempre');
    expect(hayBoton('Deshacer: volver al plan de siempre')).toBe(false);
  });

  it('un error se dice en un diálogo con «Reintentar», y reintentar lo vuelve a mandar', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockRejectedValueOnce(new ApiError(500, 'se cayó')).mockResolvedValueOnce(resultado);
    await montar();
    await tocar('Repetir');
    expect(mockAlerta).toHaveBeenCalledTimes(1);
    expect(mockAlerta.mock.calls[0][0]).toBe('No pudimos repetir tu semana');
    const reintentar = mockAlerta.mock.calls[0][2]!.find(b => b.text === 'Reintentar')!;
    await act(async () => { reintentar.onPress!(); });
    await esperar();
    expect(mockRepetir).toHaveBeenCalledTimes(2);
    expect(textos()).toContain('quedó como esta');
  });
});

describe('repetir reemplazando lo que la persona ya cambió (FR-007)', () => {
  it('«Repetir» abre el resumen, avisa y NO manda nada hasta el segundo toque explícito', async () => {
    mockOferta.mockResolvedValue(oferta({ replacesOwnChanges: true }));
    mockRepetir.mockResolvedValue(resultado);
    await montar();
    await tocar('Repetir');

    expect(mockRepetir).not.toHaveBeenCalled();
    expect(raiz!.root.findAll(n => n.props.testID === 'hoja')).toHaveLength(1);
    const todo = textos();
    expect(todo).toContain('Qué se repite');
    expect(todo).toContain('Reemplaza lo que ya cambiaste esa semana');
    expect(todo).toContain('Despertar');
    expect(todo).toContain('09:00');
    expect(todo).toContain('Meditar: ya no está en tu plan');

    // Primer toque en la hoja: pide confirmar.
    await tocar('Repetir');
    expect(mockRepetir).not.toHaveBeenCalled();
    expect(textos()).toContain('¿Lo reemplazamos?');

    // Segundo toque, explícito: ahora sí, con replace:true.
    await tocar('Sí, reemplazar y repetir');
    expect(mockRepetir).toHaveBeenCalledTimes(1);
    expect(mockRepetir).toHaveBeenCalledWith('2026-10-26', '2026-11-02', true);
    expect(textos()).toContain('quedó como esta');
  });

  it('«No reemplazar» vuelve al resumen sin mandar nada', async () => {
    mockOferta.mockResolvedValue(oferta({ replacesOwnChanges: true }));
    await montar();
    await tocar('Repetir');
    await tocar('Repetir');
    await tocar('No reemplazar');
    expect(mockRepetir).not.toHaveBeenCalled();
    expect(textos()).not.toContain('¿Lo reemplazamos?');
  });

  it('si la oferta no lo avisaba y el servidor responde 409, la hoja se abre directo en la confirmación y reintenta con replace:true', async () => {
    mockOferta.mockResolvedValue(oferta({ replacesOwnChanges: false }));
    mockRepetir.mockRejectedValueOnce(new ApiError(409, 'reemplazaría')).mockResolvedValueOnce(resultado);
    await montar();
    await tocar('Repetir');

    expect(mockRepetir).toHaveBeenCalledTimes(1);
    expect(mockRepetir).toHaveBeenLastCalledWith('2026-10-26', '2026-11-02', false);
    expect(raiz!.root.findAll(n => n.props.testID === 'hoja')).toHaveLength(1);
    expect(textos()).toContain('¿Lo reemplazamos?');

    await tocar('Sí, reemplazar y repetir');
    expect(mockRepetir).toHaveBeenLastCalledWith('2026-10-26', '2026-11-02', true);
  });

  it('«Ver qué se repite» abre el resumen sin enviar nada, también sin cambios propios', async () => {
    mockOferta.mockResolvedValue(oferta());
    await montar();
    await tocar('Ver qué se repite');
    expect(raiz!.root.findAll(n => n.props.testID === 'hoja')).toHaveLength(1);
    expect(mockRepetir).not.toHaveBeenCalled();
    expect(textos()).not.toContain('¿Lo reemplazamos?');
  });
});

describe('«Ahora no»', () => {
  it('quita la tarjeta, no manda nada y al volver con la misma oferta no reaparece', async () => {
    mockOferta.mockResolvedValue(oferta());
    await montar();
    await tocar('Ahora no repetir la semana');
    expect(mockRepetir).not.toHaveBeenCalled();
    expect(raiz!.root.findAll(n => n.props.testID === 'oferta-de-repetir-semana')).toHaveLength(0);

    act(() => raiz?.unmount());
    await montar();
    expect(raiz!.root.findAll(n => n.props.testID === 'oferta-de-repetir-semana')).toHaveLength(0);
  });
});
