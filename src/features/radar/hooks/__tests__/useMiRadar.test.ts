import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El hook de la pantalla Mi Radar (spec 012, rehecha por la 019): guardar manda solo lo tocado, registrar usa el
 * envío de siempre y vuelve a leer el historial, y lo derivado (hoy, esta hora ya registrada, dentro del horario).
 */

const mockObtenerHistorial = jest.fn<(cursor?: string | null) => Promise<unknown>>();
jest.mock('../../api/radarApi', () => ({ obtenerHistorial: (c?: string | null) => mockObtenerHistorial(c) }));
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

type Config = MiRadarApi;
const mockGuardar = jest.fn<(pedido: unknown) => Promise<Config>>();
const mockRecargarConfig = jest.fn();
const mockReiniciarConfig = jest.fn();
const mockEnviar = jest.fn<(c: unknown) => Promise<boolean>>();
const mockRadar = {
  actual: undefined as unknown as {
    miRadar: { lectura: unknown; guardar: typeof mockGuardar; recargar: typeof mockRecargarConfig; reiniciar: typeof mockReiniciarConfig };
    enviar: typeof mockEnviar;
    enviando: boolean;
    error: string | null;
    limpiarError: () => void;
  },
};
jest.mock('../../RadarContext', () => ({ useRadar: () => mockRadar.actual }));

import { ApiError } from '../../../../services/http/apiClient';
import { miRadarConHoras } from '../../__tests__/fixturasDeMiRadar';
import type { MiRadarApi, RegistroRadarApi } from '../../types/radar.types';
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
    miRadar: { lectura: { estado: 'lista', config }, guardar: mockGuardar, recargar: mockRecargarConfig, reiniciar: mockReiniciarConfig },
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
  for (const m of [mockObtenerHistorial, mockGuardar, mockRecargarConfig, mockReiniciarConfig, mockEnviar]) m.mockReset();
  mockObtenerHistorial.mockResolvedValue({ entries: [], nextCursor: null });
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.useRealTimers();
});

describe('guardar', () => {
  it('al entrar relee lo guardado', async () => {
    await montar(miRadarConHoras([], false));
    expect(mockRecargarConfig).toHaveBeenCalledTimes(1);
  });

  it('encender o apagar manda solo `encendido`; sin días no manda `dias`', async () => {
    await montar(miRadarConHoras([], false));
    mockGuardar.mockResolvedValueOnce(miRadarConHoras([9]));
    expect(await llamar(() => visto.actual.guardarConfig(true))).toEqual({ ok: true, config: miRadarConHoras([9]) });
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: true });
    mockGuardar.mockResolvedValueOnce(miRadarConHoras([], false));
    await llamar(() => visto.actual.guardarConfig(false, []));
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: false });
  });

  it('manda SOLO los días tocados, con su modo, sus veces y «sin Radar»', async () => {
    await montar(miRadarConHoras([9]));
    mockGuardar.mockImplementation(async () => miRadarConHoras([9]));
    const dias = [
      { dia: 6, modo: 'PERSONALIZADO' as const, veces: 3, sinRadar: false },
      { dia: 7, modo: 'AUTOMATICO' as const, sinRadar: true },
    ];
    await llamar(() => visto.actual.guardarConfig(true, dias));
    expect(mockGuardar).toHaveBeenLastCalledWith({ encendido: true, dias });
  });

  it('si el servidor lo rechaza (400 o 409 de hoy), devuelve su motivo en vez de lanzar', async () => {
    await montar(miRadarConHoras([], false));
    mockGuardar.mockRejectedValueOnce(new ApiError(409, 'Hoy y los días que pasaron no se pueden cambiar'));
    expect(await llamar(() => visto.actual.guardarConfig(true, [{ dia: 5, sinRadar: true }]))).toEqual({
      ok: false,
      error: 'Hoy y los días que pasaron no se pueden cambiar',
    });
    expect(visto.actual.guardando).toBe(false);
  });

  it('sin red dice algo que se entiende', async () => {
    await montar(miRadarConHoras([], false));
    mockGuardar.mockRejectedValueOnce(new Error('boom'));
    const r = await llamar(() => visto.actual.guardarConfig(true));
    expect(r).toEqual({ ok: false, error: 'No pudimos guardar tu Mi Radar. Intenta de nuevo.' });
  });
});

describe('cuando todavía no hay Mi Radar', () => {
  const motivos = [
    { estado: 'pendiente' },
    { estado: 'sin-programa' },
    { estado: 'bloqueada', motivo: 'suspendida' },
    { estado: 'bloqueada', motivo: 'sin-permiso' },
    { estado: 'no-disponible' },
    { estado: 'fallo' },
  ];

  it.each(motivos)('«$estado»: expone lo leído, sin configuración, y NO pide el historial (no hay nada que contar y daría otro 403)', async lectura => {
    mockRadar.actual = {
      miRadar: { lectura, guardar: mockGuardar, recargar: mockRecargarConfig, reiniciar: mockReiniciarConfig },
      enviar: mockEnviar,
      enviando: false,
      error: null,
      limpiarError: () => undefined,
    };
    act(() => {
      raiz = TestRenderer.create(React.createElement(Sonda));
    });
    await vaciar();
    expect(visto.actual.lectura).toEqual(lectura);
    expect(visto.actual.config).toBeNull();
    expect(mockObtenerHistorial).not.toHaveBeenCalled();
    expect(visto.actual.historial.registros).toEqual([]);
    // «Reintentar» y volver de elegir el Día 1 usan la lectura que olvida el motivo; la de entrar es la silenciosa.
    expect(visto.actual.reiniciarConfig).toBe(mockReiniciarConfig);
    expect(mockRecargarConfig).toHaveBeenCalledTimes(1);
    expect(mockReiniciarConfig).not.toHaveBeenCalled();
  });

  it('cuando llega la lectura buena, recién ahí lee el historial', async () => {
    mockRadar.actual = {
      miRadar: { lectura: { estado: 'sin-programa' }, guardar: mockGuardar, recargar: mockRecargarConfig, reiniciar: mockReiniciarConfig },
      enviar: mockEnviar,
      enviando: false,
      error: null,
      limpiarError: () => undefined,
    };
    act(() => {
      raiz = TestRenderer.create(React.createElement(Sonda));
    });
    await vaciar();
    expect(mockObtenerHistorial).not.toHaveBeenCalled();
    mockRadar.actual = {
      ...mockRadar.actual,
      miRadar: { ...mockRadar.actual.miRadar, lectura: { estado: 'lista', config: miRadarConHoras([9], true) } },
    };
    act(() => raiz?.update(React.createElement(Sonda)));
    await vaciar();
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
  });
});

describe('registrar', () => {
  it('usa el envío de siempre y, si quedó, vuelve a leer el historial', async () => {
    await montar(miRadarConHoras([9, 14]));
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
    mockEnviar.mockResolvedValueOnce(true);
    const checkIn = { whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 5, whatAmIAvoiding: 'd' };
    expect(await llamar(() => visto.actual.registrar(checkIn))).toBe(true);
    expect(mockEnviar).toHaveBeenCalledWith(checkIn);
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(2);
  });

  it('si no quedó (error, 409 sin confirmar), no vuelve a leer', async () => {
    await montar(miRadarConHoras([9, 14]));
    mockEnviar.mockResolvedValueOnce(false);
    expect(await llamar(() => visto.actual.registrar({} as never))).toBe(false);
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
  });
});

describe('lo que se deriva', () => {
  it('respondidasHoy: cuántas de las horas de hoy ya tienen su respuesta', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 9, { horaPrevista: 9 })], nextCursor: null });
    await montar(miRadarConHoras([9, 14, 20]));
    expect(visto.actual.horasDeHoy).toEqual([9, 14, 20]);
    expect(visto.actual.respondidasHoy).toBe(1);
  });

  // 29/10/2026 es jueves; el 31 es sábado y el 1/11 domingo.
  it('usa las horas de HOY: cada día de la semana tiene las suyas', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [], nextCursor: null });
    // Jueves 29: las de todos los días.
    await montar(miRadarConHoras([9, 14, 20], true, { 6: { horas: [11] } }));
    expect(visto.actual.horasDeHoy).toEqual([9, 14, 20]);
    act(() => raiz?.unmount());
    // Sábado 31: solo las 11:00 de ese día.
    await montar(miRadarConHoras([9, 14, 20], true, { 6: { horas: [11] } }), 15, 30, 31);
    expect(visto.actual.horasDeHoy).toEqual([11]);
    expect(visto.actual.hoyTieneRadar).toBe(true);
  });

  it('un día «Sin Radar»: no hay Radar hoy, ninguna hora que contar y nada espera respuesta', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 9, {}, 31)], nextCursor: null });
    await montar(miRadarConHoras([9, 14, 15], true, { 6: { horas: [], sinRadar: true } }), 15, 30, 31);
    expect(visto.actual.hoyTieneRadar).toBe(false);
    expect(visto.actual.horasDeHoy).toEqual([]);
    expect(visto.actual.respondidasHoy).toBe(0);
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
  });

  it('con Mi Radar encendido y un día con Radar, hoy hay Radar; apagado, no', async () => {
    await montar(miRadarConHoras([9, 14, 20]));
    expect(visto.actual.hoyTieneRadar).toBe(true);
    act(() => raiz?.unmount());
    await montar(miRadarConHoras([], false));
    expect(visto.actual.hoyTieneRadar).toBe(false);
  });

  it('la hora en curso espera respuesta con las horas de HOY, no con las de todos', async () => {
    // Sábado 31 a las 15:xx: todos los días tienen 15, pero el sábado solo las 11.
    await montar(miRadarConHoras([15], true, { 6: { horas: [11] } }), 15, 30, 31);
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
    act(() => raiz?.unmount());
    await montar(miRadarConHoras([9], true, { 6: { horas: [15] } }), 15, 30, 31);
    expect(visto.actual.horaEnCursoPendiente).toBe(true);
  });

  it('apagado, no hay nada que contar aunque haya registros (y el historial no se lee sin Mi Radar a la vista)', async () => {
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 9)], nextCursor: null });
    await montar(miRadarConHoras([], false));
    expect(visto.actual.respondidasHoy).toBe(0);
    expect(visto.actual.horasDeHoy).toEqual([]);
  });

  it('esta hora ya registrada, y si la hora en curso espera respuesta (elegida y sin registro)', async () => {
    await montar(miRadarConHoras([15]));
    expect(visto.actual.yaRegistroEstaHora).toBe(false);
    expect(visto.actual.horaEnCursoPendiente).toBe(true);
    act(() => raiz?.unmount());
    mockObtenerHistorial.mockResolvedValue({ entries: [registro('a', 15)], nextCursor: null });
    await montar(miRadarConHoras([15]));
    expect(visto.actual.yaRegistroEstaHora).toBe(true);
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
  });

  it('una hora en curso que no es una de las elegidas no espera nada', async () => {
    await montar(miRadarConHoras([9, 20]));
    expect(visto.actual.horaEnCursoPendiente).toBe(false);
  });

  it('de madrugada (antes de las 03:00) queda fuera del horario; desde las 03:00, dentro', async () => {
    await montar(miRadarConHoras([9]), 2, 30);
    expect(visto.actual.dentroDelHorario).toBe(false);
    act(() => raiz?.unmount());
    await montar(miRadarConHoras([9]), 3, 0);
    expect(visto.actual.dentroDelHorario).toBe(true);
    act(() => raiz?.unmount());
    await montar(miRadarConHoras([9]), 23, 59);
    expect(visto.actual.dentroDelHorario).toBe(true);
  });
});
