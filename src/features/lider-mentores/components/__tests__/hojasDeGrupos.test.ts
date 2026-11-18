import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import { montar, tocables, tocar, todoElTexto } from '../../../mentor/__tests__/ayudasDeLasPantallas';
import type { PadronApi } from '../../api/liderMentoresSchemas';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../../../../utils/tacto', () => ({ tacto: { seleccion: () => undefined, logro: () => undefined, error: () => undefined } }));
jest.mock('../../../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    HojaDesdeAbajo: ({ visible, titulo, subtitulo, children }: { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) =>
      visible ? R.createElement(View, { testID: 'hoja' }, R.createElement(Text, null, `HOJA: ${titulo}`), subtitulo ? R.createElement(Text, null, subtitulo) : null, children) : null,
  };
});
const mockAlerta = jest.fn();
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: (...a: unknown[]) => mockAlerta(...a) } }));

let mockPadron: () => Promise<PadronApi>;
jest.mock('../../api/liderMentoresApi', () => ({ obtenerPadron: () => mockPadron() }));
const mockAsignar = jest.fn<(g: unknown, m: unknown) => Promise<string>>();
const mockSumar = jest.fn<(id: string, ids: string[]) => Promise<{ sumados: number; fallo: unknown | null }>>();
jest.mock('../../api/gruposDelLiderApi', () => ({
  asignarMentorDelLider: (g: unknown, m: unknown) => mockAsignar(g, m),
  sumarAprendicesAlGrupo: (id: string, ids: string[]) => mockSumar(id, ids),
}));
let mockAprendices: () => Promise<Array<{ userId: string; fullName: string | null; avatarUrl: string | null; cellId: string | null }>>;
jest.mock('../../../admin/api/adminApi', () => ({ aprendicesDisponibles: () => mockAprendices() }));

import { HojaElegirMentor } from '../HojaElegirMentor';
import { HojaSumarAprendices } from '../HojaSumarAprendices';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mentor = (id: string, nombre: string, acompanados: number, maximo: number, grupos: string[], extra: Record<string, unknown> = {}) => ({
  userId: id,
  fullName: nombre,
  avatarUrl: null,
  groups: { source: 'OK', items: grupos.map(g => ({ id: g, name: g, trainees: 1, semaforo: null })) },
  traineeCount: acompanados,
  semaforo: { source: 'OK', summary: null },
  attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null },
  evaluation: { source: 'OK', month: '2026-11', percentage: null, delivered: null, expected: null, traineesEvaluated: null, state: null },
  cupo: { acompanados, maximo },
  porColor: null,
  ...extra,
});
const exacto = (r: Awaited<ReturnType<typeof montar>>, etiqueta: string) => {
  const nodo = tocables(r).find(n => n.props.accessibilityLabel === etiqueta);
  if (!nodo) throw new Error(`No hay «${etiqueta}». Hay: ${tocables(r).map(n => n.props.accessibilityLabel).join(' | ')}`);
  return nodo;
};

beforeEach(() => {
  mockPadron = () =>
    Promise.resolve({
      month: '2026-11',
      timezone: 'x',
      cutoffAt: '2026-11-18T14:00:00Z',
      semaforoFrom: null,
      semaforoTo: null,
      mentors: [mentor('m-1', 'Ricardo Palomino', 5, 10, ['g-7']), mentor('m-2', 'Mentor Dos', 0, 0, []), mentor('m-3', 'E2E Mentor', 10, 10, ['g-1']), mentor('m-4', 'Suspendida', 0, 10, [], { accountActive: false })],
    } as unknown as PadronApi);
  mockAprendices = () =>
    Promise.resolve([
      { userId: 'a-1', fullName: 'Ajustado Tiempo E2E', avatarUrl: null, cellId: null },
      { userId: 'a-2', fullName: 'Activación Uno E2E', avatarUrl: null, cellId: null },
      { userId: 'a-3', fullName: 'Ya tiene grupo', avatarUrl: null, cellId: 'g-otro' },
    ]);
  mockAsignar.mockReset().mockResolvedValue('asignado');
  mockSumar.mockReset().mockResolvedValue({ sumados: 2, fallo: null });
  mockAlerta.mockReset();
});

describe('la hoja de elegir mentor (Asignar y Cambiar mentor)', () => {
  const hoja = (extra: object = {}) => {
    const alCerrar = jest.fn();
    const alAsignar = jest.fn();
    const el = React.createElement(HojaElegirMentor, { grupo: { id: 'g-1', nombre: 'Cupo 1314', mentorId: null }, alCerrar, onAsignado: alAsignar, ...extra } as never);
    return { el, alCerrar, alAsignar };
  };

  it('cerrada no dibuja nada ni pide el padrón', async () => { // spec 056 FR-009
    const { el } = hoja({ grupo: null });
    const r = await montar(el);
    expect(todoElTexto(r)).toBe('');
  });

  it('lista a los mentores con su cupo: el de cupo lleno y el suspendido, apagados; quien ya tiene el grupo, marcado y sin poder elegirse', async () => { // spec 056 FR-009
    const { el } = hoja();
    const r = await montar(el);
    expect(todoElTexto(r)).toContain('HOJA: Cambiar mentor'); // E2E Mentor ya lista este grupo en el padrón: el grupo tiene mentor
    const por = (nombre: string) => tocables(r).find(n => (n.props.accessibilityLabel as string).startsWith(nombre));
    expect(por('E2E Mentor')?.props.accessibilityLabel).toContain('Es su mentor ahora');
    expect(por('E2E Mentor')?.props.disabled).toBe(true);
    expect(por('Ricardo Palomino')?.props.disabled).toBeFalsy();
    expect(por('Mentor Dos')?.props.disabled).toBeFalsy();
    expect(por('Suspendida')?.props.disabled).toBe(true);
  });

  it('un grupo sin mentor dice «Asignar mentor»', async () => { // spec 056 FR-009
    const { el } = hoja({ grupo: { id: 'g-2', nombre: 'Sin dueño', mentorId: null } });
    const r = await montar(el);
    expect(todoElTexto(r)).toContain('HOJA: Asignar mentor');
  });

  it('el botón dice el cambio que se va a guardar y no se puede tocar sin elegir', async () => { // spec 056 FR-009
    const { el } = hoja({ grupo: { id: 'g-2', nombre: 'Sin dueño', mentorId: null } });
    const r = await montar(el);
    expect(exacto(r, 'Asignar').props.disabled).toBe(true);
    await tocar(r, 'Ricardo Palomino');
    expect(exacto(r, 'Asignar a Ricardo Palomino').props.disabled).toBeFalsy();
  });

  it('al confirmar asigna con la regla de Administración (con los grupos que ya lleva), avisa y cierra', async () => { // spec 056 FR-009
    const { el, alCerrar, alAsignar } = hoja({ grupo: { id: 'g-2', nombre: 'Sin dueño', mentorId: null } });
    const r = await montar(el);
    await tocar(r, 'Ricardo Palomino');
    await act(async () => exacto(r, 'Asignar a Ricardo Palomino').props.onPress());
    expect(mockAsignar).toHaveBeenCalledWith({ id: 'g-2', nombre: 'Sin dueño', mentorId: null }, { userId: 'm-1', fullName: 'Ricardo Palomino', grupos: ['g-7'] });
    expect(alAsignar).toHaveBeenCalledTimes(1);
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('un toque, un pedido: dos toques seguidos asignan una sola vez', async () => { // spec 056 FR-009
    let soltar!: () => void;
    mockAsignar.mockImplementation(() => new Promise(res => { soltar = () => res('asignado'); }));
    const { el } = hoja({ grupo: { id: 'g-2', nombre: 'Sin dueño', mentorId: null } });
    const r = await montar(el);
    await tocar(r, 'Mentor Dos');
    await act(async () => {
      exacto(r, 'Asignar a Mentor Dos').props.onPress();
      exacto(r, 'Asignar a Mentor Dos').props.onPress();
    });
    expect(mockAsignar).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('si el servidor lo rechaza (otro líder asignó antes) dice su motivo, relee los mentores y no cierra', async () => { // spec 056 FR-042
    mockAsignar.mockRejectedValueOnce(new ApiError(409, 'Ese grupo ya tiene mentor.', { codigo: 'YA_TIENE_MENTOR' }));
    let lecturas = 0;
    const original = mockPadron;
    mockPadron = () => {
      lecturas += 1;
      return original();
    };
    const { el, alCerrar, alAsignar } = hoja({ grupo: { id: 'g-2', nombre: 'Sin dueño', mentorId: null } });
    const r = await montar(el);
    await tocar(r, 'Mentor Dos');
    await act(async () => exacto(r, 'Asignar a Mentor Dos').props.onPress());
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo asignar', 'Ese grupo ya tiene mentor.');
    expect(alCerrar).not.toHaveBeenCalled();
    expect(alAsignar).not.toHaveBeenCalled();
    expect(lecturas).toBeGreaterThanOrEqual(2);
  });

  it('si el grupo quedó sin mentor tras quitar al anterior, dice ese mensaje tal cual', async () => { // spec 056 FR-009
    mockAsignar.mockRejectedValueOnce(new Error('Sin dueño quedó sin mentor: no se pudo sumar a Mentor Dos. Vuelve a elegirlo.'));
    const { el } = hoja({ grupo: { id: 'g-2', nombre: 'Sin dueño', mentorId: null } });
    const r = await montar(el);
    await tocar(r, 'Mentor Dos');
    await act(async () => exacto(r, 'Asignar a Mentor Dos').props.onPress());
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo asignar', 'Sin dueño quedó sin mentor: no se pudo sumar a Mentor Dos. Vuelve a elegirlo.');
  });
});

describe('la hoja de sumar aprendices', () => {
  const hoja = (extra: object = {}) => {
    const alCerrar = jest.fn();
    const alSumar = jest.fn();
    const el = React.createElement(HojaSumarAprendices, { grupo: { id: 'g-1', nombre: 'Cupo 1314' }, alCerrar, onSumados: alSumar, ...extra } as never);
    return { el, alCerrar, alSumar };
  };

  it('lista solo a los que no tienen grupo, con la cantidad, y el botón apagado hasta marcar a alguien', async () => { // spec 056 FR-009
    const { el } = hoja();
    const r = await montar(el);
    const texto = todoElTexto(r);
    expect(texto).toContain('HOJA: Sumar aprendices');
    expect(texto).toContain('2 sin grupo');
    expect(texto).toContain('Ajustado Tiempo E2E');
    expect(texto).not.toContain('Ya tiene grupo');
    expect(exacto(r, 'Sumar').props.disabled).toBe(true);
  });

  it('el botón dice cuántos suma y, al confirmar, los suma al grupo, avisa y cierra', async () => { // spec 056 FR-009
    const { el, alCerrar, alSumar } = hoja();
    const r = await montar(el);
    await tocar(r, 'Ajustado Tiempo E2E');
    await tocar(r, 'Activación Uno E2E');
    await act(async () => exacto(r, 'Sumar 2 aprendices').props.onPress());
    expect(mockSumar).toHaveBeenCalledWith('g-1', ['a-1', 'a-2']);
    expect(alSumar).toHaveBeenCalledTimes(1);
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it('un toque, un pedido: dos toques seguidos suman una sola vez', async () => { // spec 056 FR-009
    let soltar!: () => void;
    mockSumar.mockImplementation(() => new Promise(res => { soltar = () => res({ sumados: 1, fallo: null }); }));
    const { el } = hoja();
    const r = await montar(el);
    await tocar(r, 'Ajustado Tiempo E2E');
    await act(async () => {
      exacto(r, 'Sumar 1 aprendiz').props.onPress();
      exacto(r, 'Sumar 1 aprendiz').props.onPress();
    });
    expect(mockSumar).toHaveBeenCalledTimes(1);
    await act(async () => soltar());
  });

  it('si el cupo se llena a la mitad dice cuántos entraron y el motivo, avisa al grupo de lo que sí entró y no cierra', async () => { // spec 056 FR-009
    mockSumar.mockResolvedValue({ sumados: 1, fallo: new ApiError(409, 'El grupo ya está lleno.', { codigo: 'CUPO_LLENO' }) });
    const { el, alCerrar, alSumar } = hoja();
    const r = await montar(el);
    await tocar(r, 'Ajustado Tiempo E2E');
    await tocar(r, 'Activación Uno E2E');
    await act(async () => exacto(r, 'Sumar 2 aprendices').props.onPress());
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo sumar a todos', 'Entraron 1 de 2. El grupo ya está lleno.');
    expect(alSumar).toHaveBeenCalledTimes(1);
    expect(alCerrar).not.toHaveBeenCalled();
  });

  it('si no entró ninguno dice el motivo, sin avisar de cambios', async () => { // spec 056 FR-042
    mockSumar.mockResolvedValue({ sumados: 0, fallo: new ApiError(403, 'Ese aprendiz no es de tus formaciones.', { codigo: 'FUERA_DE_SU_ALCANCE' }) });
    const { el, alSumar } = hoja();
    const r = await montar(el);
    await tocar(r, 'Ajustado Tiempo E2E');
    await act(async () => exacto(r, 'Sumar 1 aprendiz').props.onPress());
    expect(mockAlerta).toHaveBeenCalledWith('No se pudo sumar a todos', 'Ese aprendiz no es de tus formaciones.');
    expect(alSumar).not.toHaveBeenCalled();
  });
});
