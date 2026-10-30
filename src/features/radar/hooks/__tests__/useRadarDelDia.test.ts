import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El Código Renaser de la hora, sin la pantalla (2026-10-19).
 *
 * Dos fallos vistos en el emulador y en el backend:
 *
 *  1. Hasta que llegaba `GET /radar/latest` el estado era `abierto`: el formulario se montaba y ~300 ms
 *     después, al saberse que la hora ya estaba respondida, se cerraba. En Android eso dejaba una
 *     ventana del Modal vacía y oscura encima de Hoy. Ahora «todavía no sé» es `cargando`.
 *  2. El backend ya no acepta dos registros en la misma hora (índice `radar_un_registro_por_hora`) y
 *     responde 409. La app mostraba el texto genérico del servidor y el formulario quedaba trabado.
 */

const mockObtenerUltimo = jest.fn<() => Promise<string | null>>();
const mockRegistrar = jest.fn<(checkIn: unknown) => Promise<{ createdAt: string }>>();
jest.mock('../../api/radarApi', () => ({
  obtenerUltimoCheckIn: () => mockObtenerUltimo(),
  registrarCheckIn: (checkIn: unknown) => mockRegistrar(checkIn),
}));

import { ApiError } from '../../../../services/http/apiClient';
import type { CheckInRadarApi } from '../../types/radar.types';
import { MENSAJE_HORA_YA_REGISTRADA, useRadarDelDia, type EstadoRadarDelDia } from '../useRadarDelDia';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Lunes 19/10/2026 a la hora local indicada (la zona de las pruebas es America/Lima). */
const enHora = (hora: number, minuto = 0) => new Date(2026, 9, 19, hora, minuto, 0, 0);

const checkIn: CheckInRadarApi = {
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 5,
  whatAmIAvoiding: 'd',
};

/** Una promesa que se resuelve o rechaza cuando la prueba lo decide: el «mientras carga». */
function diferida<T>() {
  let resolver!: (v: T) => void;
  let rechazar!: (e: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

async function vaciar() {
  await act(async () => {
    await new Promise<void>(r => setImmediate(r));
  });
}

function montar(dia: number | null, usuarioId: string | null = 'u1') {
  const visto = { actual: undefined as unknown as EstadoRadarDelDia, tipos: [] as string[] };
  function Sonda(props: { dia: number | null; usuario: string | null }) {
    const radar = useRadarDelDia(props.dia, props.usuario);
    visto.actual = radar;
    visto.tipos.push(radar.estado.tipo);
    return null;
  }
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda, { dia, usuario: usuarioId }));
  });
  const cambiar = (nuevoDia: number | null, nuevoUsuario: string | null = usuarioId) =>
    act(() => raiz.update(React.createElement(Sonda, { dia: nuevoDia, usuario: nuevoUsuario })));
  return { visto, cambiar, tipo: () => visto.actual.estado.tipo };
}

describe('useRadarDelDia: no se abre sin saber si ya se respondió', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'], now: enHora(10, 30) });
    mockObtenerUltimo.mockReset();
    mockRegistrar.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('mientras /radar/latest no responde, el estado es cargando y no abierto', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);

    const { tipo } = montar(3);
    await vaciar();

    expect(mockObtenerUltimo).toHaveBeenCalledTimes(1);
    expect(tipo()).toBe('cargando');
  });

  it('si esa hora NO estaba respondida, pasa de cargando a abierto y nunca estuvo abierto antes', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    const { visto, tipo } = montar(3);
    await vaciar();

    await act(async () => lectura.resolver(null));

    expect(tipo()).toBe('abierto');
    expect(visto.tipos).toEqual(expect.arrayContaining(['cargando', 'abierto']));
    expect(visto.tipos.indexOf('cargando')).toBeLessThan(visto.tipos.indexOf('abierto'));
  });

  it('con /radar/latest en la hora en curso, nunca pasa por abierto: de cargando a respondido', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    const { visto, tipo } = montar(3);
    await vaciar();

    await act(async () => lectura.resolver(enHora(10, 5).toISOString()));

    expect(tipo()).toBe('respondido');
    expect(visto.tipos).not.toContain('abierto');
  });

  it('con el último registro de una hora anterior, la hora en curso sí se abre', async () => {
    mockObtenerUltimo.mockResolvedValueOnce(enHora(9, 40).toISOString());
    const { tipo } = montar(3);
    await vaciar();

    expect(tipo()).toBe('abierto');
  });

  it('si la lectura falla por la red, abre igual: no puede quedarse sin pedirse, y tampoco parpadea', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { visto, tipo } = montar(3);
    await vaciar();

    await act(async () => lectura.rechazar(new ApiError(0, 'Sin conexión')));

    expect(tipo()).toBe('abierto');
    expect(visto.tipos.filter((t, i, todos) => t !== todos[i - 1])).toEqual(['cargando', 'abierto']);
    aviso.mockRestore();
  });

  it('si la lectura falla con un 500, abre igual', async () => {
    mockObtenerUltimo.mockRejectedValueOnce(new ApiError(500, 'Error interno'));
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { tipo } = montar(3);
    await vaciar();

    expect(tipo()).toBe('abierto');
    aviso.mockRestore();
  });

  it('un 403 apaga el radar y no lo abre en ningún momento', async () => {
    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    const { visto, tipo } = montar(3);
    await vaciar();

    await act(async () => lectura.rechazar(new ApiError(403, 'Prohibido')));

    expect(tipo()).toBe('apagado');
    expect(visto.tipos).not.toContain('abierto');
  });

  it('al cambiar la hora vuelve a esperar la lectura nueva antes de abrir', async () => {
    mockObtenerUltimo.mockResolvedValueOnce(null);
    const { tipo, visto } = montar(3);
    await vaciar();
    expect(tipo()).toBe('abierto');

    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    await act(async () => {
      jest.advanceTimersByTime(31 * 60_000); // 10:30 -> 11:01
    });
    await vaciar();

    expect(mockObtenerUltimo).toHaveBeenCalledTimes(2);
    expect(tipo()).toBe('cargando');
    expect(visto.actual.estado.tipo === 'cargando' && visto.actual.estado.slot.hora).toBe(11);

    // Y si en esa hora ya se había respondido desde otro teléfono, no llega a abrirse.
    await act(async () => lectura.resolver(enHora(11, 0).toISOString()));
    expect(tipo()).toBe('respondido');
  });

  it('con otra cuenta no se hereda lo de la anterior: espera su propia lectura', async () => {
    mockObtenerUltimo.mockResolvedValueOnce(null);
    const { tipo, cambiar } = montar(3, 'u1');
    await vaciar();
    expect(tipo()).toBe('abierto');

    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    cambiar(3, 'u2');
    await vaciar();

    expect(mockObtenerUltimo).toHaveBeenCalledTimes(2);
    expect(tipo()).toBe('cargando');

    await act(async () => lectura.resolver(enHora(10, 2).toISOString()));
    expect(tipo()).toBe('respondido');
  });

  it('si el radar se apaga un rato (el Mapa abierto) y vuelve en la misma hora, relee antes de abrir', async () => {
    mockObtenerUltimo.mockResolvedValueOnce(null);
    const { tipo, visto, cambiar } = montar(3);
    await vaciar();
    expect(tipo()).toBe('abierto');

    cambiar(null);
    expect(tipo()).toBe('apagado');

    const lectura = diferida<string | null>();
    mockObtenerUltimo.mockReturnValueOnce(lectura.promesa);
    visto.tipos.length = 0;
    cambiar(3);
    await vaciar();

    expect(tipo()).toBe('cargando');
    expect(visto.tipos).not.toContain('abierto');

    await act(async () => lectura.resolver(enHora(10, 20).toISOString()));
    expect(tipo()).toBe('respondido');
    expect(visto.tipos).not.toContain('abierto');
  });
});

describe('useRadarDelDia: enviar', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'], now: enHora(10, 30) });
    mockObtenerUltimo.mockReset();
    mockRegistrar.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  /** Monta con la hora sin responder y el formulario abierto, listo para enviar. */
  async function montarAbierto() {
    mockObtenerUltimo.mockResolvedValueOnce(null);
    const montado = montar(3);
    await vaciar();
    expect(montado.tipo()).toBe('abierto');
    return montado;
  }

  async function enviar(visto: { actual: EstadoRadarDelDia }): Promise<boolean> {
    let ok = false;
    await act(async () => {
      ok = await visto.actual.enviar(checkIn);
    });
    return ok;
  }

  it('un envío normal queda registrado y cierra la hora', async () => {
    const { visto, tipo } = await montarAbierto();
    mockRegistrar.mockResolvedValueOnce({ createdAt: enHora(10, 30).toISOString() });

    expect(await enviar(visto)).toBe(true);

    expect(tipo()).toBe('respondido');
    expect(visto.actual.error).toBeNull();
  });

  it('un 409 seguido de /radar/latest en la hora en curso se toma como registrado', async () => {
    const { visto, tipo } = await montarAbierto();
    mockRegistrar.mockRejectedValueOnce(new ApiError(409, 'La operacion entra en conflicto con datos que ya existen'));
    mockObtenerUltimo.mockResolvedValueOnce(enHora(10, 12).toISOString());

    const ok = await enviar(visto);

    expect(ok).toBe(true);
    expect(mockRegistrar).toHaveBeenCalledTimes(1);
    expect(mockObtenerUltimo).toHaveBeenCalledTimes(2);
    expect(tipo()).toBe('respondido');
    expect(visto.actual.error).toBeNull();
    expect(visto.actual.enviando).toBe(false);
  });

  it('un 409 que /radar/latest no confirma dice algo claro y propio, no el texto del servidor, y no cierra', async () => {
    const { visto, tipo } = await montarAbierto();
    mockRegistrar.mockRejectedValueOnce(new ApiError(409, 'La operacion entra en conflicto con datos que ya existen'));
    mockObtenerUltimo.mockResolvedValueOnce(enHora(9, 50).toISOString());

    const ok = await enviar(visto);

    expect(ok).toBe(false);
    expect(visto.actual.error).toBe(MENSAJE_HORA_YA_REGISTRADA);
    expect(visto.actual.error).not.toContain('conflicto');
    expect(tipo()).toBe('abierto');
  });

  it('un 409 cuando tampoco se puede releer deja el mismo mensaje', async () => {
    const { visto, tipo } = await montarAbierto();
    mockRegistrar.mockRejectedValueOnce(new ApiError(409, 'La operacion entra en conflicto con datos que ya existen'));
    mockObtenerUltimo.mockRejectedValueOnce(new ApiError(0, 'Sin conexión'));

    const ok = await enviar(visto);

    expect(ok).toBe(false);
    expect(visto.actual.error).toBe(MENSAJE_HORA_YA_REGISTRADA);
    expect(tipo()).toBe('abierto');
  });

  it('spec 012: un 409 de una regla de Mi Radar (apagado, o fuera de 03:00–23:59) dice el motivo del servidor', async () => {
    const { visto, tipo } = await montarAbierto();
    mockRegistrar.mockRejectedValueOnce(new ApiError(409, 'Mi Radar funciona de 03:00 a 23:59'));
    mockObtenerUltimo.mockResolvedValueOnce(enHora(9, 50).toISOString());

    const ok = await enviar(visto);

    expect(ok).toBe(false);
    expect(visto.actual.error).toBe('Mi Radar funciona de 03:00 a 23:59');
    expect(tipo()).toBe('abierto');
  });

  it('el mensaje del 409 va en tuteo y es corto', () => {
    expect(MENSAJE_HORA_YA_REGISTRADA.length).toBeLessThan(100);
    expect(MENSAJE_HORA_YA_REGISTRADA).not.toMatch(/\b(tenés|intentá|probá|podés|volvé)\b/i);
  });

  it('otro error del servidor sigue mostrando su propio texto y no relee nada', async () => {
    const { visto } = await montarAbierto();
    mockRegistrar.mockRejectedValueOnce(new ApiError(422, 'whatAmIDoing: no puede estar vacío'));

    const ok = await enviar(visto);

    expect(ok).toBe(false);
    expect(mockObtenerUltimo).toHaveBeenCalledTimes(1);
    expect(visto.actual.error).toBe('whatAmIDoing: no puede estar vacío');
  });

  it('un 403 al enviar apaga el radar', async () => {
    const { visto, tipo } = await montarAbierto();
    mockRegistrar.mockRejectedValueOnce(new ApiError(403, 'Prohibido'));

    expect(await enviar(visto)).toBe(false);
    expect(tipo()).toBe('apagado');
  });
});
