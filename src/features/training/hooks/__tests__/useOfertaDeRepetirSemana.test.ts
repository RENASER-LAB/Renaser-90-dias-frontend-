import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { OfertaDeRepetirApi, ResultadoDeRepetirApi } from '../../../habits/types/habits.types';
import { ApiError } from '../../../../services/http/apiClient';

/**
 * Spec 028: el hook de la oferta de repetir la semana. Se prueba con el servidor y el almacenamiento simulados:
 * sin parpadeo (nada hasta saber), un solo pedido en vuelo, «Ahora no» por cuenta y por huella, repetir con y sin `replace`
 * (409 → confirmación → reintento), el doble toque y deshacer.
 */

const mockOferta = jest.fn<() => Promise<OfertaDeRepetirApi | null>>();
const mockRepetir = jest.fn<(modelo: string, siguiente: string, replace: boolean) => Promise<ResultadoDeRepetirApi>>();
const mockDeshacer = jest.fn<(semana: string) => Promise<number>>();
jest.mock('../../../habits/api/habitsApi', () => ({
  obtenerOfertaDeRepetir: () => mockOferta(),
  repetirLaSemana: (modelo: string, siguiente: string, replace: boolean) => mockRepetir(modelo, siguiente, replace),
  deshacerLaSemana: (semana: string) => mockDeshacer(semana),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { clavesDeRepetirSemana, useOfertaDeRepetirSemana, type UsoDeLaOferta } from '../useOfertaDeRepetirSemana';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const oferta = (extra: Partial<OfertaDeRepetirApi> = {}): OfertaDeRepetirApi => ({
  sourceWeekStart: '2026-10-26',
  targetWeekStart: '2026-11-02',
  fingerprint: 'huella-1',
  replacesOwnChanges: false,
  habits: [],
  excluded: [],
  ...extra,
});
const resultado: ResultadoDeRepetirApi = { targetWeekStart: '2026-11-02', copiedDays: 3, removedDays: 0, habits: 2, excluded: [] };

let uso!: UsoDeLaOferta;
let raiz: ReactTestRenderer | null = null;
const alCambiar = jest.fn<() => Promise<unknown>>();

function Sonda({ usuario = 'u-1', activo = true }: { usuario?: string; activo?: boolean }) {
  uso = useOfertaDeRepetirSemana(usuario, activo, alCambiar);
  return null;
}
async function montar(props: { usuario?: string; activo?: boolean } = {}) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, props));
  });
}
const esperar = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

beforeEach(async () => {
  await AsyncStorage.clear();
  mockOferta.mockReset();
  mockRepetir.mockReset();
  mockDeshacer.mockReset();
  alCambiar.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la lectura: sin parpadeo', () => {
  it('hasta saber no hay oferta ni nada que dibujar', async () => {
    let responder!: (o: OfertaDeRepetirApi | null) => void;
    mockOferta.mockImplementation(() => new Promise(r => { responder = r; }));
    await montar();
    expect(uso.lectura).toBe('cargando');
    expect(uso.oferta).toBeNull();
    await act(async () => { responder(oferta()); });
    expect(uso.lectura).toBe('lista');
    expect(uso.oferta).toEqual(oferta());
  });

  it('el servidor no tiene oferta (204): lista y sin oferta', async () => {
    mockOferta.mockResolvedValue(null);
    await montar();
    expect(uso.lectura).toBe('lista');
    expect(uso.oferta).toBeNull();
  });

  it('un error de red o un servidor anterior no es un error en pantalla: simplemente no hay oferta', async () => {
    mockOferta.mockRejectedValue(new ApiError(404, 'no existe'));
    await montar();
    expect(uso.lectura).toBe('lista');
    expect(uso.oferta).toBeNull();
  });

  it('inactivo (sin programa): no lee nada', async () => {
    mockOferta.mockResolvedValue(oferta());
    await montar({ activo: false });
    expect(mockOferta).not.toHaveBeenCalled();
    expect(uso.oferta).toBeNull();
  });

  it('dos recargas seguidas comparten UN pedido', async () => {
    let responder!: (o: OfertaDeRepetirApi | null) => void;
    mockOferta.mockImplementation(() => new Promise(r => { responder = r; }));
    await montar();
    await act(async () => { void uso.recargar(); void uso.recargar(); });
    expect(mockOferta).toHaveBeenCalledTimes(1);
    await act(async () => { responder(null); });
  });
});

describe('«Ahora no» (FR-012)', () => {
  it('se guarda por cuenta con el par de semanas y la huella, y la oferta se va', async () => {
    mockOferta.mockResolvedValue(oferta());
    await montar();
    await act(async () => { await uso.descartar(); });
    expect(uso.oferta).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem(clavesDeRepetirSemana.descartada('u-1')))!)).toEqual({
      modelo: '2026-10-26', siguiente: '2026-11-02', huella: 'huella-1',
    });
  });

  it('al volver con la misma huella no reaparece; con otra huella (la modelo cambió) sí', async () => {
    mockOferta.mockResolvedValue(oferta());
    await montar();
    await act(async () => { await uso.descartar(); });
    act(() => raiz?.unmount());

    await montar();
    expect(uso.lectura).toBe('lista');
    expect(uso.oferta).toBeNull();
    act(() => raiz?.unmount());

    mockOferta.mockResolvedValue(oferta({ fingerprint: 'huella-2' }));
    await montar();
    expect(uso.oferta?.fingerprint).toBe('huella-2');
  });

  it('es por cuenta: lo descartado por otra cuenta no esconde la oferta', async () => {
    await AsyncStorage.setItem(clavesDeRepetirSemana.descartada('u-2'), JSON.stringify({ modelo: '2026-10-26', siguiente: '2026-11-02', huella: 'huella-1' }));
    mockOferta.mockResolvedValue(oferta());
    await montar({ usuario: 'u-1' });
    expect(uso.oferta).not.toBeNull();
  });

  it('un almacenamiento roto no tumba nada', async () => {
    // El doble de AsyncStorage ya es un `jest.fn`: se le encadena un rechazo por llamada en vez de espiarlo (restaurar un espía
    // sobre un `jest.fn` le borraría la implementación al resto del archivo).
    const leer = AsyncStorage.getItem as unknown as jest.Mock<(clave: string) => Promise<string | null>>;
    const escribir = AsyncStorage.setItem as unknown as jest.Mock<(clave: string, valor: string) => Promise<void>>;
    leer.mockRejectedValueOnce(new Error('disco')).mockRejectedValueOnce(new Error('disco'));
    escribir.mockRejectedValueOnce(new Error('disco'));
    mockOferta.mockResolvedValue(oferta());
    await montar();
    expect(uso.oferta).not.toBeNull();
    await act(async () => { await uso.descartar(); });
    expect(uso.oferta).toBeNull();
  });
});

describe('repetir', () => {
  it('sin cambios propios que reemplazar: manda replace:false, recuerda la semana y pone al día las alarmas', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockResolvedValue(resultado);
    await montar();
    let r: Awaited<ReturnType<UsoDeLaOferta['repetir']>> | undefined;
    await act(async () => { r = await uso.repetir(false); });
    expect(r).toEqual({ ok: true, resultado });
    expect(mockRepetir).toHaveBeenCalledWith('2026-10-26', '2026-11-02', false);
    expect(uso.oferta).toBeNull();
    expect(uso.repetida).toEqual({ semana: '2026-11-02' });
    expect(JSON.parse((await AsyncStorage.getItem(clavesDeRepetirSemana.hecha('u-1')))!)).toEqual({ semana: '2026-11-02' });
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it('un 409 pide confirmar; con la confirmación se manda replace:true y nada se perdió antes', async () => {
    mockOferta.mockResolvedValue(oferta({ replacesOwnChanges: true }));
    mockRepetir.mockRejectedValueOnce(new ApiError(409, 'reemplazaría')).mockResolvedValueOnce(resultado);
    await montar();
    let primero: Awaited<ReturnType<UsoDeLaOferta['repetir']>> | undefined;
    await act(async () => { primero = await uso.repetir(false); });
    expect(primero).toEqual({ ok: false, motivo: 'confirmar' });
    expect(uso.oferta).not.toBeNull();
    expect(uso.repetida).toBeNull();
    expect(alCambiar).not.toHaveBeenCalled();

    let segundo: Awaited<ReturnType<UsoDeLaOferta['repetir']>> | undefined;
    await act(async () => { segundo = await uso.repetir(true); });
    expect(segundo?.ok).toBe(true);
    expect(mockRepetir).toHaveBeenLastCalledWith('2026-10-26', '2026-11-02', true);
  });

  it('otro error se dice con su mensaje y deja la oferta para reintentar', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockRejectedValue(new ApiError(500, 'se cayó'));
    await montar();
    let r: Awaited<ReturnType<UsoDeLaOferta['repetir']>> | undefined;
    await act(async () => { r = await uso.repetir(false); });
    expect(r?.ok).toBe(false);
    expect(r && !r.ok && r.motivo).toBe('error');
    expect(uso.oferta).not.toBeNull();
    expect(uso.enviando).toBe(false);
  });

  it('doble toque: se manda UNA sola repetición', async () => {
    mockOferta.mockResolvedValue(oferta());
    let terminar!: () => void;
    mockRepetir.mockImplementation(() => new Promise(r => { terminar = () => r(resultado); }));
    await montar();
    let a: Promise<unknown> | undefined;
    let b: Promise<unknown> | undefined;
    await act(async () => {
      a = uso.repetir(false);
      b = uso.repetir(false);
      await Promise.resolve();
    });
    expect(uso.enviando).toBe(true);
    await act(async () => { terminar(); await a; await b; });
    expect(mockRepetir).toHaveBeenCalledTimes(1);
  });

  it('sin oferta no hay nada que repetir', async () => {
    mockOferta.mockResolvedValue(null);
    await montar();
    let r: Awaited<ReturnType<UsoDeLaOferta['repetir']>> | undefined;
    await act(async () => { r = await uso.repetir(false); });
    expect(r?.ok).toBe(false);
    expect(mockRepetir).not.toHaveBeenCalled();
  });
});

describe('deshacer', () => {
  it('vuelve la semana al plan de siempre, olvida la repetida, pone al día las alarmas y relee la oferta', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockResolvedValue(resultado);
    mockDeshacer.mockResolvedValue(3);
    await montar();
    await act(async () => { await uso.repetir(false); });
    mockOferta.mockClear();
    alCambiar.mockClear();

    let r: Awaited<ReturnType<UsoDeLaOferta['deshacer']>> | undefined;
    await act(async () => { r = await uso.deshacer(); });
    expect(r).toEqual({ ok: true });
    expect(mockDeshacer).toHaveBeenCalledWith('2026-11-02');
    expect(uso.repetida).toBeNull();
    expect(await AsyncStorage.getItem(clavesDeRepetirSemana.hecha('u-1'))).toBeNull();
    expect(alCambiar).toHaveBeenCalledTimes(1);
    expect(mockOferta).toHaveBeenCalledTimes(1);
  });

  it('un fallo se dice y la semana sigue repetida (se puede reintentar)', async () => {
    mockOferta.mockResolvedValue(oferta());
    mockRepetir.mockResolvedValue(resultado);
    mockDeshacer.mockRejectedValue(new ApiError(500, 'no'));
    await montar();
    await act(async () => { await uso.repetir(false); });
    let r: Awaited<ReturnType<UsoDeLaOferta['deshacer']>> | undefined;
    await act(async () => { r = await uso.deshacer(); });
    expect(r?.ok).toBe(false);
    expect(uso.repetida).toEqual({ semana: '2026-11-02' });
  });

  it('una semana repetida de otra visita sigue deshaciéndose mientras no termine', async () => {
    const hoy = new Date();
    const dos = (n: number) => String(n).padStart(2, '0');
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const iso = `${lunes.getFullYear()}-${dos(lunes.getMonth() + 1)}-${dos(lunes.getDate())}`;
    await AsyncStorage.setItem(clavesDeRepetirSemana.hecha('u-1'), JSON.stringify({ semana: iso }));
    mockOferta.mockResolvedValue(null);
    await montar();
    expect(uso.repetida).toEqual({ semana: iso });
  });

  it('una semana repetida que ya terminó se olvida', async () => {
    await AsyncStorage.setItem(clavesDeRepetirSemana.hecha('u-1'), JSON.stringify({ semana: '2020-01-06' }));
    mockOferta.mockResolvedValue(null);
    await montar();
    await esperar();
    expect(uso.repetida).toBeNull();
  });
});
