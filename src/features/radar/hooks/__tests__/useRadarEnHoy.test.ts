import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El hook de la mitad del Radar de Hoy (spec 016), lo que no se ve en la tarjeta: no pide más de lo que ya pide Mi Radar
 * (los días 1 a 7 no lee el historial hasta que se abre una hoja; apagado o sin backend tampoco), no dice nada mientras no
 * sabe qué hora está respondida (sin parpadeo), registra con el envío de siempre y vuelve a leer, y relee al volver a Hoy.
 */

const mockObtenerHistorial = jest.fn<(cursor?: string | null) => Promise<unknown>>();
jest.mock('../../api/radarApi', () => ({ obtenerHistorial: (c?: string | null) => mockObtenerHistorial(c) }));
jest.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('../../../../hooks/useMinutoActual', () => ({ useMinutoActual: () => mockAhora.actual }));
const mockAhora = { actual: new Date(2026, 9, 29, 14, 10) };

/* `useFocusEffect` de verdad necesita un navegador: aquí corre su función una vez al montar (la primera vez el hook la ignora)
   y la prueba puede volver a llamarla para simular «volver a Hoy». */
const mockFoco: Array<() => void> = [];
jest.mock('@react-navigation/native', () => {
  const R = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (cb: () => void) => {
      R.useEffect(() => {
        cb();
        mockFoco.push(cb);
      }, [cb]);
    },
  };
});

type Lectura = { estado: string; config?: unknown };
const mockEnviar = jest.fn<(c: unknown) => Promise<boolean>>();
const mockRecargarMiRadar = jest.fn();
const mockRadar = {
  actual: undefined as unknown as {
    estado: unknown;
    obligatorio: boolean;
    minutosParaAbrir: number;
    abrir: () => void;
    enviar: typeof mockEnviar;
    enviando: boolean;
    error: string | null;
    limpiarError: () => void;
    miRadar: { lectura: Lectura; recargar: typeof mockRecargarMiRadar };
  },
};
jest.mock('../../RadarContext', () => ({ useRadar: () => mockRadar.actual }));

import type { RegistroRadarApi } from '../../types/radar.types';
import { useRadarEnHoy } from '../useRadarEnHoy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registro = (id: string, hora: number, extra: Partial<RegistroRadarApi> = {}): RegistroRadarApi => ({
  id, whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 5, whatAmIAvoiding: 'd',
  createdAt: new Date(2026, 9, 29, hora, 6).toISOString(), ...extra,
});
const pagina = (entries: RegistroRadarApi[]) => ({ entries, nextCursor: null, miRadar: null });

const ENCENDIDO = { encendido: true, horas: [9, 14, 20], dias: [] };

function configurar(lectura: Lectura, estado: unknown = { tipo: 'apagado', motivo: 'etapa-terminada' }) {
  mockRadar.actual = {
    estado, obligatorio: false, minutosParaAbrir: 0, abrir: jest.fn(), enviar: mockEnviar, enviando: false, error: null,
    limpiarError: () => undefined, miRadar: { lectura, recargar: mockRecargarMiRadar },
  };
}

let raiz: ReactTestRenderer | null = null;
const visto = { actual: undefined as unknown as ReturnType<typeof useRadarEnHoy> };
const historia: Array<ReturnType<typeof useRadarEnHoy>> = [];
function Sonda({ dia, hoja }: { dia: number; hoja: boolean }) {
  visto.actual = useRadarEnHoy({ diaPrograma: dia, inscrito: true, hojaAbierta: hoja });
  historia.push(visto.actual);
  return null;
}
function montar(dia: number, hoja = false) {
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda, { dia, hoja }));
  });
}
const actualizar = (dia: number, hoja: boolean) =>
  act(() => {
    raiz!.update(React.createElement(Sonda, { dia, hoja }));
  });
async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

beforeEach(() => {
  mockAhora.actual = new Date(2026, 9, 29, 14, 10);
  mockObtenerHistorial.mockResolvedValue(pagina([]));
  mockEnviar.mockResolvedValue(true);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  historia.length = 0;
  mockFoco.length = 0;
  mockObtenerHistorial.mockReset();
  mockEnviar.mockReset();
  mockRecargarMiRadar.mockReset();
});

describe('lo que lee', () => {
  it('los días 1 a 7 no lee el historial mientras ninguna hoja esté abierta', async () => {
    configurar({ estado: 'pendiente' }, { tipo: 'abierto', slot: { hora: 14, etiqueta: '14:00', cierraA: '15:00' }, minutosParaCerrar: 50 });
    montar(3);
    await vaciar();
    expect(mockObtenerHistorial).not.toHaveBeenCalled();
    expect(visto.actual.mitad?.accion).toBe('formulario');
  });

  it('abrir una hoja los días 1 a 7 lee el historial, una vez', async () => {
    configurar({ estado: 'pendiente' }, { tipo: 'respondido', slot: { hora: 14, etiqueta: '14:00', cierraA: '15:00' }, proximaHora: 15 });
    montar(3);
    actualizar(3, true);
    await vaciar();
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['apagado', { estado: 'lista', config: { encendido: false, horas: [], dias: [] } }],
    ['sin Mi Radar en el backend', { estado: 'no-disponible' }],
    ['leyendo', { estado: 'pendiente' }],
  ])('desde el día 8, con Mi Radar %s, no lee el historial', async (_caso, lectura) => {
    configurar(lectura as Lectura);
    montar(10);
    await vaciar();
    expect(mockObtenerHistorial).not.toHaveBeenCalled();
  });

  it('desde el día 8, con Mi Radar encendido, lo lee y recién ahí dice qué hora toca', async () => {
    configurar({ estado: 'lista', config: ENCENDIDO });
    montar(10);
    // Antes de que llegue lo respondido no se dice nada: «Tu hora» sin saber si ya se respondió es el parpadeo de 2026-10-19.
    expect(historia.every(h => h.mitad === null || h.mitad.estado !== 'Tu hora')).toBe(true);
    expect(visto.actual.mitad).toBeNull();
    expect(visto.actual.leyendoRegistros).toBe(true);
    await vaciar();
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
    expect(visto.actual.leyendoRegistros).toBe(false);
    expect(visto.actual.mitad).toMatchObject({ estado: 'Tu hora', hora: '14:00', accion: 'formulario' });
  });

  it('aunque Mi Radar llegue después (primero se lee, luego se enciende la lectura), no dice «Tu hora» antes de saber', async () => {
    configurar({ estado: 'pendiente' });
    montar(10);
    await vaciar();
    expect(visto.actual.mitad).toBeNull();
    mockObtenerHistorial.mockResolvedValue(pagina([registro('a', 14, { horaPrevista: 14 })]));
    configurar({ estado: 'lista', config: ENCENDIDO });
    actualizar(10, false);
    // En el cuadro en que llega Mi Radar todavía no se leyó lo respondido: nada que decir.
    expect(historia.some(h => h.mitad?.estado === 'Tu hora')).toBe(false);
    expect(visto.actual.leyendoRegistros).toBe(true);
    await vaciar();
    expect(historia.some(h => h.mitad?.estado === 'Tu hora')).toBe(false);
    expect(visto.actual.mitad?.estado).toBe('Registrado');
  });

  it('si esa hora ya estaba respondida nunca pasa por «Tu hora»', async () => {
    mockObtenerHistorial.mockResolvedValue(pagina([registro('a', 14, { horaPrevista: 14 })]));
    configurar({ estado: 'lista', config: ENCENDIDO });
    montar(10);
    await vaciar();
    expect(historia.some(h => h.mitad?.estado === 'Tu hora')).toBe(false);
    expect(visto.actual.mitad).toMatchObject({ estado: 'Registrado', accion: 'resumen' });
  });

  it('si no se pudo leer lo respondido se ofrece igual, como los días 1 a 7', async () => {
    mockObtenerHistorial.mockRejectedValue(new Error('sin red'));
    configurar({ estado: 'lista', config: ENCENDIDO });
    montar(10);
    await vaciar();
    expect(visto.actual.leyendoRegistros).toBe(false);
    expect(visto.actual.falloAlLeerRegistros).toBe(true);
    expect(visto.actual.mitad?.estado).toBe('Tu hora');
  });
});

describe('registrar', () => {
  it('usa el envío de siempre y, si quedó, vuelve a leer lo respondido para que la mitad lo diga', async () => {
    configurar({ estado: 'lista', config: ENCENDIDO });
    montar(10);
    await vaciar();
    expect(visto.actual.mitad?.estado).toBe('Tu hora');
    mockObtenerHistorial.mockResolvedValue(pagina([registro('nuevo', 14, { horaPrevista: 14 })]));
    const checkIn = { whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 6, whatAmIAvoiding: 'd' };
    let ok = false;
    await act(async () => {
      ok = await visto.actual.registrar(checkIn);
    });
    expect(ok).toBe(true);
    expect(mockEnviar).toHaveBeenCalledWith(checkIn);
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(2);
    expect(visto.actual.mitad).toMatchObject({ estado: 'Registrado', accion: 'resumen' });
  });

  it('si el envío no quedó (409 sin confirmar, error) no vuelve a leer', async () => {
    mockEnviar.mockResolvedValue(false);
    configurar({ estado: 'lista', config: ENCENDIDO });
    montar(10);
    await vaciar();
    await act(async () => {
      await visto.actual.registrar({ whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 6, whatAmIAvoiding: 'd' });
    });
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
  });
});

describe('al volver a Hoy', () => {
  it('la primera vez no relee (la lectura de arranque ya está en marcha); las siguientes sí, en silencio', async () => {
    configurar({ estado: 'lista', config: ENCENDIDO });
    montar(10);
    await vaciar();
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(1);
    mockObtenerHistorial.mockResolvedValue(pagina([registro('desde-yo', 14, { horaPrevista: 14 })]));
    await act(async () => {
      mockFoco[mockFoco.length - 1]();
      await new Promise<void>(r => setImmediate(r));
    });
    expect(mockObtenerHistorial).toHaveBeenCalledTimes(2);
    // Se respondió desde Yo: la mitad lo dice sin pasar por «cargando».
    expect(visto.actual.leyendoRegistros).toBe(false);
    expect(visto.actual.mitad?.estado).toBe('Registrado');
  });

  it('si Mi Radar no se había podido leer, lo vuelve a intentar', async () => {
    configurar({ estado: 'fallo' });
    montar(10);
    await vaciar();
    expect(mockRecargarMiRadar).not.toHaveBeenCalled();
    await act(async () => {
      mockFoco[mockFoco.length - 1]();
    });
    expect(mockRecargarMiRadar).toHaveBeenCalledTimes(1);
  });
});
