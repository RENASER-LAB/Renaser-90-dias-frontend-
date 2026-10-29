import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El hook de la pantalla Mi Radar (spec 012): guardar valida igual que el servidor antes de pedirle nada, registrar usa el
 * envío de siempre y vuelve a leer el historial, y lo derivado (hoy, esta hora ya registrada, dentro del horario).
 */

const mockObtenerHistorial = jest.fn<(cursor?: string | null) => Promise<unknown>>();
jest.mock('../../api/radarApi', () => ({ obtenerHistorial: (c?: string | null) => mockObtenerHistorial(c) }));
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

type Config = { encendido: boolean; horas: number[]; dias?: Array<{ dia: number; horas: number[] }> };
const mockGuardar = jest.fn<(c: Config) => Promise<Config>>();
const mockRecargarConfig = jest.fn();
const mockEnviar = jest.fn<(c: unknown) => Promise<boolean>>();
const mockRadar = {
  actual: undefined as unknown as {
    miRadar: { lectura: unknown; guardar: typeof mockGuardar; recargar: typeof mockRecargarConfig };
    enviar: typeof mockEnviar;
    enviando: boolean;
    error: string | null;
    limpiarError: () => void;
  },
};
jest.mock('../../RadarContext', () => ({ useRadar: () => mockRadar.actual }));

import { ApiError } from '../../../../services/http/apiClient';
import type { RegistroRadarApi } from '../../types/radar.types';
import { useMiRadar } from '../useMiRadar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registro = (id: string, hora: number, extra: Partial<RegistroRadarApi> = {}, dia = 29): RegistroRadarApi => ({
  id,
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 5,
  whatAmIAvoiding: 'd',
  createdAt: new Date(2026, 9, dia, hora, 6).toISOString(),
  ...extra,
});

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

/** Llama a algo del hook que cambia su estado, dentro de `act`. */
async function llamar<T>(f: () => Promise<T>): Promise<T> {
  let resultado!: T;
  await act(async () => {
    resultado = await f();
  });
  return resultado;
}

let raiz: ReactTestRenderer | null = null;
const visto = { actual: undefined as unknown as ReturnType<typeof useMiRadar> };
function Sonda() {
  visto.actual = useMiRadar();
  return null;
}

async function montar(config: Config, hora = 15, minuto = 30, dia = 29) {
  jest.setSystemTime(new Date(2026, 9, dia, hora, minuto));
  mockRadar.actual = {
    miRadar: { lectura: { estado: 'lista', config }, guardar: mockGuardar, recargar: mockRecargarConfig },
    enviar: mockEnviar,
    enviando: false,
    error: null,
    limpiarError: () => undefined,
  };
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  await vaciar();
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'], now: new Date(2026, 9, 29, 15, 30) });
  for (const m of [mockObtenerHistorial, mockGuardar, mockRecargarConfig, mockEnviar]) m.mockReset();
  mockObtenerHistorial.mockResolvedValue({ entries: [], nextCursor: null });
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('guardar', () => {
  it('al entrar relee lo guardado', async () => {
    await montar({ encendido: false, horas: [] });
    expect(mockRecargarConfig).toHaveBeenCalledTimes(1);
  });

  it('encendido sin horas, o con horas que no valen, no le pide nada al servidor', async () => {
    await montar({ encendido: false, horas: [] });
    let r = await llamar(() => visto.actual.guardarConfig(true, []));
    expect(r).toEqual({ ok: false, error: 'Elige al menos una hora' });
    r = await llamar(() => visto.actual.guardarConfig(true, [2, 9]));
    expect(r.ok).toBe(false);
    r = await llamar(() => visto.actual.guardarConfig(true, Array.from({ length: 13 }, (_, i) => 3 + i)));
    expect(r).toEqual({ ok: false, error: 'Puedes elegir hasta 12' });
    expect(mockGuardar).not.toHaveBeenCalled();
  });

  it('encender manda las horas ordenadas; apagar manda sin horas', async () => {
    await montar({ encendido: false, horas: [] });
    mockGuardar.mockResolvedValueOnce({ encendido: true, horas: [9, 14, 20] });
    expect(await llamar(() => visto.actual.guardarConfig(true, [20, 9, 14]))).toEqual({ ok: true, config: { encendido: true, horas: [9, 14, 20] } });
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: true, horas: [9, 14, 20] });
    mockGuardar.mockResolvedValueOnce({ encendido: false, horas: [] });
    await llamar(() => visto.actual.guardarConfig(false, [9, 14]));
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: false, horas: [] });
  });

  it('si el servidor lo rechaza, devuelve su motivo en vez de lanzar', async () => {
    await montar({ encendido: false, horas: [] });
    mockGuardar.mockRejectedValueOnce(new ApiError(400, 'Las horas van de 3 a 23'));
    expect(await llamar(() => visto.actual.guardarConfig(true, [9]))).toEqual({ ok: false, error: 'Las horas van de 3 a 23' });
    expect(visto.actual.guardando).toBe(false);
  });

  it('sin red dice algo que se entiende', async () => {
    await montar({ encendido: false, horas: [] });
    mockGuardar.mockRejectedValueOnce(new Error('boom'));
    const r = await llamar(() => visto.actual.guardarConfig(true, [9]));
    expect(r).toEqual({ ok: false, error: 'No pudimos guardar tu Mi Radar. Intenta de nuevo.' });
  });
});

describe('guardar con días propios', () => {
  const sabado = { dia: 6, horas: [11] };

  it('manda las horas de todos los días y los días propios, ordenados por día; sin días no manda `dias`', async () => {
    await montar({ encendido: false, horas: [] });
    mockGuardar.mockImplementation(async c => c);
    await llamar(() => visto.actual.guardarConfig(true, [9, 14], [{ dia: 7, horas: [] }, sabado]));
    expect(mockGuardar).toHaveBeenLastCalledWith({
      encendido: true,
      horas: [9, 14],
      dias: [sabado, { dia: 7, horas: [] }],
    });
    await llamar(() => visto.actual.guardarConfig(true, [9, 14], []));
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: true, horas: [9, 14] });
    await llamar(() => visto.actual.guardarConfig(true, [9, 14]));
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: true, horas: [9, 14] });
  });

  it('apagar no manda ni horas ni días, aunque se los den', async () => {
    await montar({ encendido: true, horas: [9], dias: [sabado] });
    mockGuardar.mockImplementation(async c => c);
    await llamar(() => visto.actual.guardarConfig(false, [9], [sabado]));
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: false, horas: [] });
  });

  it('valida los días como el servidor antes de pedirle nada', async () => {
    await montar({ encendido: false, horas: [] });
    expect(await llamar(() => visto.actual.guardarConfig(true, [9], [{ dia: 8, horas: [9] }]))).toEqual({
      ok: false,
      error: 'Hay un día que no existe',
    });
    expect(await llamar(() => visto.actual.guardarConfig(true, [9], [sabado, sabado]))).toEqual({
      ok: false,
      error: 'Hay un día repetido',
    });
    expect(await llamar(() => visto.actual.guardarConfig(true, [9], [{ dia: 6, horas: [2] }]))).toMatchObject({ ok: false });
    expect(await llamar(() => visto.actual.guardarConfig(true, [9], [{ dia: 6, horas: [9, 9] }]))).toEqual({
      ok: false,
      error: 'Hay una hora repetida',
    });
    expect(mockGuardar).not.toHaveBeenCalled();
  });
});

describe('registrar', () => {
  it('usa el envío de siempre y, si quedó, vuelve a leer el historial', async () => {
    await montar({ encendido: true, horas: [9, 14] });
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
    mockEnviar.mockResolvedValueOnce(true);
    const checkIn = { whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 5, whatAmIAvoiding: 'd' };
    expect(await llamar(() => visto.actual.registrar(checkIn))).toBe(true);
    expect(mockEnviar).toHaveBeenCalledWith(checkIn);
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(2);
  });

  it('si no quedó (error, 409 sin confirmar), no vuelve a leer', async () => {
    await montar({ encendido: true, horas: [9, 14] });
    mockEnviar.mockResolvedValueOnce(false);
    expect(await llamar(() => visto.actual.registrar({} as never))).toBe(false);
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
  });
});

describe('lo que se deriva', () => {
  it('Hoy: solo con Mi Radar encendido, y trae las horas elegidas que ya pasaron sin respuesta', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 9, { horaPrevista: 9 })], nextCursor: null });
    await montar({ encendido: true, horas: [9, 14, 20] });
    // En orden de hora, del más temprano al más tarde.
    expect(visto.actual.hoy.map(e => (e.tipo === 'registro' ? e.registro.id : `sin-${e.hora}`))).toEqual(['a', 'sin-14']);
  });

  // 29/10/2026 es jueves; el 31 es sábado y el 1/11 domingo.
  it('«Hoy» usa las horas de HOY: un día con horas propias no usa las de todos', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [], nextCursor: null });
    // Jueves 29 a las 15:30: las de todos los días (9, 14, 20) → pasaron 9 y 14.
    await montar({ encendido: true, horas: [9, 14, 20], dias: [{ dia: 6, horas: [11] }] });
    expect(visto.actual.hoy).toEqual([{ tipo: 'sin-registro', hora: 9 }, { tipo: 'sin-registro', hora: 14 }]);
    act(() => raiz?.unmount());
    // Sábado 31 a las 15:30: solo las 11:00 de ese día.
    await montar({ encendido: true, horas: [9, 14, 20], dias: [{ dia: 6, horas: [11] }] }, 15, 30, 31);
    expect(visto.actual.hoy).toEqual([{ tipo: 'sin-registro', hora: 11 }]);
    expect(visto.actual.hoyTieneRadar).toBe(true);
  });

  it('un día «Sin Radar»: no hay Radar hoy, «Hoy» solo trae lo que ya se registró y nada espera respuesta', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 9, {}, 31)], nextCursor: null });
    // Sábado 31 a las 15:30, sábado sin Radar.
    await montar({ encendido: true, horas: [9, 14, 15], dias: [{ dia: 6, horas: [] }] }, 15, 30, 31);
    expect(visto.actual.hoyTieneRadar).toBe(false);
    expect(visto.actual.hoy.map(e => (e.tipo === 'registro' ? e.registro.id : `sin-${e.hora}`))).toEqual(['a']);
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
  });

  it('con Mi Radar encendido y un día con Radar, hoy hay Radar; apagado, no', async () => {
    await montar({ encendido: true, horas: [9, 14, 20] });
    expect(visto.actual.hoyTieneRadar).toBe(true);
    act(() => raiz?.unmount());
    await montar({ encendido: false, horas: [] });
    expect(visto.actual.hoyTieneRadar).toBe(false);
  });

  it('la hora en curso espera respuesta con las horas de HOY, no con las de todos', async () => {
    // Sábado 31 a las 15:xx: todos los días tienen 15, pero el sábado solo las 11.
    await montar({ encendido: true, horas: [15], dias: [{ dia: 6, horas: [11] }] }, 15, 30, 31);
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
    act(() => raiz?.unmount());
    await montar({ encendido: true, horas: [9], dias: [{ dia: 6, horas: [15] }] }, 15, 30, 31);
    expect(visto.actual.horaEnCursoPendiente).toBe(true);
  });

  it('apagado, «Hoy» queda vacío aunque haya registros', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 9)], nextCursor: null });
    await montar({ encendido: false, horas: [] });
    expect(visto.actual.hoy).toEqual([]);
    expect(visto.actual.historial.registros).toHaveLength(1);
  });

  it('esta hora ya registrada, y si la hora en curso espera respuesta (elegida y sin registro)', async () => {
    await montar({ encendido: true, horas: [15] });
    expect(visto.actual.yaRegistroEstaHora).toBe(false);
    expect(visto.actual.horaEnCursoPendiente).toBe(true);
    act(() => raiz?.unmount());
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 15)], nextCursor: null });
    await montar({ encendido: true, horas: [15] });
    expect(visto.actual.yaRegistroEstaHora).toBe(true);
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
  });

  it('una hora en curso que no es una de las elegidas no espera nada', async () => {
    await montar({ encendido: true, horas: [9, 20] });
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
  });

  it('de madrugada (antes de las 03:00) queda fuera del horario; desde las 03:00, dentro', async () => {
    await montar({ encendido: true, horas: [9] }, 2, 30);
    expect(visto.actual.dentroDelHorario).toBe(false);
    act(() => raiz?.unmount());
    await montar({ encendido: true, horas: [9] }, 3, 0);
    expect(visto.actual.dentroDelHorario).toBe(true);
    act(() => raiz?.unmount());
    await montar({ encendido: true, horas: [9] }, 23, 59);
    expect(visto.actual.dentroDelHorario).toBe(true);
  });
});
