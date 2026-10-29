/**
 * #42: el hábito de kilómetros SIEMPRE muestra el campo de km y nunca se envía sin el número, venga de Training,
 * de Yo, del chat o el orbe de SER, o de una foto pendiente de Android.
 *
 * El bug: el campo solo salía si el registro fresco (`GET /habit-tracks/today`) decía que el hábito mide algo. El
 * chat y el orbe no traen esa pista y la foto pendiente no la guardaba, así que si esa consulta fallaba la pantalla se
 * abría SIN el campo y se enviaba sola; el servidor respondía 400 «Escribe cuántos km recorriste hoy…» y «Reintentar»
 * repetía el mismo envío, en bucle, hasta cerrar y volver a tocar el hábito.
 *
 * Se prueba el hook entero (la cámara y el servidor reemplazados): lo que importa es qué se abre y qué se envía.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import type { ArchivoEvidencia } from '../../utils/capturarEvidencia';
import type { TrackDelDiaApi } from '../../types/habits.types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockCamara = jest.fn<() => Promise<ArchivoEvidencia | null>>();
const mockDeCamara = jest.fn<(r: unknown) => Promise<ArchivoEvidencia | null>>();
jest.mock('../../utils/capturarEvidencia', () => ({
  tomarFotoConCamara: () => mockCamara(),
  elegirFotoDeGaleria: jest.fn(),
  archivoDeResultadoDeCamara: (r: unknown) => mockDeCamara(r),
}));
const mockPendiente = jest.fn<() => Promise<unknown>>();
jest.mock('expo-image-picker', () => ({ getPendingResultAsync: () => mockPendiente() }));

const mockTracks = jest.fn<() => Promise<TrackDelDiaApi[]>>();
jest.mock('../../api/habitsApi', () => ({ obtenerTracksDeHoy: () => mockTracks() }));
const mockSubir = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCompletar = jest.fn<(...args: unknown[]) => Promise<{ puntosOtorgados: number }>>();
jest.mock('../../api/evidenciaHabitoApi', () => ({
  AlmacenamientoSinConfigurarError: class extends Error {},
  completarRegistro: (...args: unknown[]) => mockCompletar(...args),
  subirEvidenciaDeArchivo: (...args: unknown[]) => mockSubir(...args),
}));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));

import { Alert } from '../../../../components/Alerta';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fotoPendiente } from '../../storage/fotoPendiente';
import { MENSAJE_SIN_CONEXION_PARA_REGISTRAR } from '../../api/registroVigente';
import { medicionQueSeSabe, pideLosKm } from '../../utils/registroConFoto';
import { useRegistroConFoto } from '../useRegistroConFoto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alerta = Alert.alert as unknown as jest.Mock<(...args: unknown[]) => void>;
const PIDE_KM = 'Escribe cuántos km recorriste hoy para registrar este hábito. Si no ves dónde, actualiza la app.';

function foto(uri = 'file:///a.jpg'): ArchivoEvidencia {
  return { uri, mimeType: 'image/jpeg', tipo: 'FOTO', etiqueta: uri, tomadaEn: null };
}

function track(extra: Partial<TrackDelDiaApi> = {}): TrackDelDiaApi {
  return {
    id: 'reg-1',
    habitoId: 'hab-1',
    fechaEjecucion: '2026-10-29',
    diaPrograma: 20,
    tipoDia: 'NORMAL',
    esOpcional: false,
    estado: 'PENDIENTE',
    puntosOtorgados: 0,
    respuestaTexto: null,
    calificacionProductividad: null,
    completadoEn: null,
    tituloHabito: 'KILÓMETROS DIARIOS',
    tipoHabito: 'EVIDENCIA',
    guia: null,
    horaDisparo: null,
    horaLimite: null,
    ...extra,
  };
}
const DE_KM = track({ medicion: { unidad: 'KILOMETROS', valorDelDia: null, total: 12.5 } });
const SIN_RED = new ApiError(0, 'No se pudo conectar con el servidor.');

type Api = ReturnType<typeof useRegistroConFoto>;
let api!: Api;
let raiz: ReactTestRenderer | null = null;

function Sonda() {
  api = useRegistroConFoto({ onCompletado: async () => undefined });
  return null;
}

const montar = () =>
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });

/** Deja correr lo que queda pendiente: el envío automático de la pantalla, los reintentos. */
async function vaciar() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

async function iniciar(...args: Parameters<Api['iniciar']>) {
  let promesa!: ReturnType<Api['iniciar']>;
  await act(async () => {
    promesa = api.iniciar(...args);
    await Promise.resolve();
    await Promise.resolve();
  });
  await elegirCamaraSiHayHoja();
  let resultado!: Awaited<ReturnType<Api['iniciar']>>;
  await act(async () => {
    resultado = await promesa;
  });
  await vaciar();
  return resultado;
}

/** Con #41, el hábito de km pregunta de dónde sale la foto: estas pruebas son de lo que sigue, así que eligen la cámara. */
async function elegirCamaraSiHayHoja() {
  await vaciar();
  if (!api.modal.origen) return;
  await act(async () => {
    api.modal.origen!.onElegir('camara');
  });
  await vaciar();
}

const SOLICITUD = { registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false };

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockCamara.mockReset().mockResolvedValue(foto());
  mockDeCamara.mockReset().mockResolvedValue(foto('file:///pendiente.jpg'));
  mockPendiente.mockReset().mockResolvedValue(null);
  mockTracks.mockReset().mockResolvedValue([DE_KM]);
  mockSubir.mockReset().mockResolvedValue({});
  mockCompletar.mockReset().mockResolvedValue({ puntosOtorgados: 5 });
  alerta.mockReset();
  await fotoPendiente.borrar();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('si el registro se puede leer, el campo sale siempre que el hábito mide km', () => {
  it('desde el chat o el orbe (sin pista): el servidor dice que mide km → campo y nada se envía solo', async () => {
    montar();
    expect(await iniciar(SOLICITUD)).toBe('abierto');
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
    expect(mockSubir).not.toHaveBeenCalled();
    expect(mockCompletar).not.toHaveBeenCalled();
  });

  it('un hábito que no mide nada se sigue registrando solo, como siempre', async () => {
    mockTracks.mockResolvedValue([track()]);
    montar();
    expect(await iniciar({ ...SOLICITUD, titulo: 'Ducha fría' })).toBe('abierto');
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockCompletar.mock.calls[0][2]).toBeNull();
  });
});

describe('si no se puede leer el registro (sin red)', () => {
  beforeEach(() => {
    mockTracks.mockReset().mockRejectedValue(SIN_RED);
  });

  it('el chat y el orbe NO abren la cámara a ciegas: avisan con el mensaje de conexión y ofrecen reintentar', async () => {
    montar();
    expect(await iniciar(SOLICITUD)).toBe('sin-conexion');
    expect(mockCamara).not.toHaveBeenCalled();
    // Con #41: sin saber si pide los km tampoco se abre la hoja «de dónde sale la foto» (no hay nada que elegir aún).
    expect(api.modal.origen).toBeNull();
    expect(api.modal.registro).toBeNull();
    expect(mockSubir).not.toHaveBeenCalled();
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensaje, botones] = alerta.mock.calls[0] as [string, string, { text: string; onPress?: () => void }[]];
    expect(titulo).toBe('Sin conexión');
    expect(mensaje).toBe(MENSAJE_SIN_CONEXION_PARA_REGISTRAR);
    expect(botones.map(b => b.text)).toEqual(['Ahora no', 'Reintentar']);
  });

  it('«Reintentar» repite el toque desde cero y, con la red de vuelta, abre con el campo de km', async () => {
    montar();
    await iniciar(SOLICITUD);
    const reintentar = (alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[])[1];
    mockTracks.mockReset().mockResolvedValue([DE_KM]);
    await act(async () => {
      reintentar.onPress?.();
    });
    await elegirCamaraSiHayHoja();
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
    expect(mockCompletar).not.toHaveBeenCalled();
  });

  it('Training y Yo traen la pista del track: con km se abre con el campo aunque no haya red', async () => {
    montar();
    const resultado = await iniciar({ ...SOLICITUD, medicion: { unidad: 'KILOMETROS', totalPrevio: 40 } });
    expect(resultado).toBe('abierto');
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 40 });
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('Training y Yo SABEN que otro hábito no mide nada (pista `null`): se abre como siempre aunque no haya red', async () => {
    montar();
    expect(await iniciar({ ...SOLICITUD, titulo: 'Ducha fría', medicion: null })).toBe('abierto');
    expect(alerta).not.toHaveBeenCalled();
    // Sin km que pedir, se registra sola apenas hay foto (D-172), sin número.
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockCompletar.mock.calls[0][2]).toBeNull();
  });

  it('en web (no se lee antes de la cámara) tampoco se envía a ciegas: tras la foto, si no se sabe, avisa', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    montar();
    expect(await iniciar(SOLICITUD)).toBe('sin-conexion');
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(api.modal.registro).toBeNull();
    expect(mockSubir).not.toHaveBeenCalled();
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledTimes(1);
  });

  it('con la foto ya subida de un intento anterior, tampoco se abre sin saber', async () => {
    expect(await (async () => { montar(); return iniciar(SOLICITUD, true); })()).toBe('sin-conexion');
    expect(api.modal.registro).toBeNull();
  });
});

describe('una foto pendiente de Android recuerda si el hábito pide los km (#42)', () => {
  const PENDIENTE = { canceled: false, assets: [{ uri: 'file:///pendiente.jpg' }] };

  it('al abrir la cámara se anota lo que se sabe de los km: lo que dice el servidor, o la pista si no hay red', async () => {
    let guardada: unknown;
    mockCamara.mockImplementation(async () => {
      guardada = (await fotoPendiente.tomar(Date.now()))?.medicion;
      return null;
    });
    montar();
    // Con el registro leído manda el servidor (12,5), no la pista.
    await iniciar({ ...SOLICITUD, medicion: { unidad: 'KILOMETROS', totalPrevio: 40 } });
    expect(guardada).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
    // Sin red vale la pista de quien llamó.
    mockTracks.mockReset().mockRejectedValue(SIN_RED);
    await iniciar({ ...SOLICITUD, medicion: { unidad: 'KILOMETROS', totalPrevio: 40 } });
    expect(guardada).toEqual({ unidad: 'KILOMETROS', totalPrevio: 40 });
    // Y si se sabe que no pide nada, también se anota (`null`), distinto de «no se sabe».
    await iniciar({ ...SOLICITUD, medicion: null });
    expect(guardada).toBeNull();
  });

  it('sin red al volver, abre con el campo de km con la pista guardada', async () => {
    await fotoPendiente.guardar({
      ...SOLICITUD,
      medicion: { unidad: 'KILOMETROS', totalPrevio: 40 },
    });
    mockPendiente.mockResolvedValue(PENDIENTE);
    mockTracks.mockReset().mockRejectedValue(SIN_RED);
    montar();
    await act(async () => {
      await api.reanudarPendiente();
    });
    await vaciar();
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 40 });
    expect(mockCompletar).not.toHaveBeenCalled();
  });

  it('con la pista guardada en `null` (el hábito no mide nada) abre como siempre', async () => {
    await fotoPendiente.guardar({ ...SOLICITUD, titulo: 'Ducha fría', medicion: null });
    mockPendiente.mockResolvedValue(PENDIENTE);
    mockTracks.mockReset().mockRejectedValue(SIN_RED);
    montar();
    await act(async () => {
      await api.reanudarPendiente();
    });
    await vaciar();
    // Sin km que pedir, se registra sola apenas hay foto, sin número.
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockCompletar.mock.calls[0][2]).toBeNull();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('sin red y sin ninguna pista guardada, no se abre a ciegas: avisa', async () => {
    await fotoPendiente.guardar({ ...SOLICITUD });
    mockPendiente.mockResolvedValue(PENDIENTE);
    mockTracks.mockReset().mockRejectedValue(SIN_RED);
    montar();
    await act(async () => {
      await api.reanudarPendiente();
    });
    await vaciar();
    expect(api.modal.registro).toBeNull();
    expect(mockCompletar).not.toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledTimes(1);
    // La foto pendiente se ofrece una sola vez: no hay a qué volver, así que sin «Reintentar».
    expect((alerta.mock.calls[0][2] as { text: string }[]).map(b => b.text)).toEqual(['Ahora no']);
  });

  it('una pista rota o de una versión anterior se lee como «no se sabe», sin perder la foto pendiente', async () => {
    const base = { registroId: 'reg-1', titulo: 'K', conPregunta: false, destino: 'habito', guardadaEnMs: Date.now() };
    for (const medicion of [{ unidad: 'PASOS', totalPrevio: 3 }, { unidad: 'KILOMETROS', totalPrevio: 'x' }, 7, 'km']) {
      await AsyncStorage.setItem('renaser:registro-con-foto:pendiente', JSON.stringify({ ...base, medicion }));
      const leida = await fotoPendiente.tomar(Date.now());
      expect(leida?.registroId).toBe('reg-1');
      expect(leida && 'medicion' in leida).toBe(false);
    }
    await AsyncStorage.setItem('renaser:registro-con-foto:pendiente', JSON.stringify(base));
    expect((await fotoPendiente.tomar(Date.now()))?.medicion).toBeUndefined();
  });

  it('con red, manda lo que dice el servidor', async () => {
    await fotoPendiente.guardar({ ...SOLICITUD });
    mockPendiente.mockResolvedValue(PENDIENTE);
    montar();
    await act(async () => {
      await api.reanudarPendiente();
    });
    await vaciar();
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
  });
});

describe('si el servidor aun así pide los km, la pantalla muestra el campo en vez de repetir el envío', () => {
  // El registro se abrió sin campo (Training dijo `null`, o el servidor aún no lo informaba) y el servidor lo exige.
  it('un 400 «Escribe cuántos km…» muestra el campo, no repite el envío y deja escribirlos', async () => {
    mockTracks.mockResolvedValue([track()]);
    mockCompletar.mockRejectedValueOnce(new ApiError(400, PIDE_KM));
    montar();
    await iniciar({ ...SOLICITUD, medicion: null });

    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockSubir).toHaveBeenCalledTimes(1);
    // Ahora está el campo, sin el error rojo y sin un segundo envío por cuenta propia.
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 0 });
    expect(api.modal.error).toBeNull();
    await vaciar();
    expect(mockCompletar).toHaveBeenCalledTimes(1);

    // La persona escribe los km y registra: solo se cierra (la evidencia ya estaba subida) y va el número.
    act(() => api.modal.onCambiarRespuesta('5,2'));
    await act(async () => {
      api.modal.onTerminar();
    });
    await vaciar();
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(2);
    expect(mockCompletar.mock.calls[1][2]).toBe(5.2);
    expect(api.modal.registro).toBeNull();
  });

  it('el campo trae el total recorrido si el registro se puede leer', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    mockCompletar.mockRejectedValueOnce(new ApiError(400, PIDE_KM));
    montar();
    // El servidor aún no informaba `medicion` al abrir (Training lo dio por `null`), pero ahora sí.
    await iniciar({ ...SOLICITUD, medicion: null });
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
  });

  it('otro 400, o un error de red, sigue siendo el error de siempre con «Reintentar»', async () => {
    mockTracks.mockResolvedValue([track()]);
    mockCompletar.mockRejectedValueOnce(new ApiError(400, 'La respuesta es obligatoria.'));
    montar();
    await iniciar({ ...SOLICITUD, titulo: 'Ducha fría', medicion: null });
    expect(api.modal.error).toBe('La respuesta es obligatoria.');
    expect(api.modal.registro?.medicion).toBeNull();
  });
});

describe('medicionQueSeSabe: qué se sabe de si el registro pide los km', () => {
  const KM = { unidad: 'KILOMETROS' as const, totalPrevio: 3 };
  const OTRA = { unidad: 'KILOMETROS' as const, totalPrevio: 9 };

  it('el registro leído del servidor manda sobre la pista', () => {
    expect(medicionQueSeSabe({ medicion: KM }, OTRA)).toBe(KM);
    expect(medicionQueSeSabe({ medicion: KM }, undefined)).toBe(KM);
  });

  it('leído y sin `medicion`: no pide nada, salvo que quien llamó traiga la pista', () => {
    expect(medicionQueSeSabe({}, undefined)).toBeNull();
    expect(medicionQueSeSabe({}, null)).toBeNull();
    expect(medicionQueSeSabe({}, KM)).toBe(KM);
  });

  it('sin lectura, vale lo que sabía quien llamó: un objeto, `null`, o nada (`undefined` = NO se sabe)', () => {
    expect(medicionQueSeSabe({ sinLectura: true }, KM)).toBe(KM);
    expect(medicionQueSeSabe({ sinLectura: true }, null)).toBeNull();
    expect(medicionQueSeSabe({ sinLectura: true }, undefined)).toBeUndefined();
  });
});

describe('pideLosKm: el 400 de «escribe cuántos km»', () => {
  it('reconoce el mensaje del servidor', () => {
    expect(pideLosKm(new ApiError(400, PIDE_KM))).toBe(true);
    expect(pideLosKm(new ApiError(400, 'Los km recorridos tienen que ser más que cero.'))).toBe(true);
  });

  it('no confunde otros errores', () => {
    expect(pideLosKm(new ApiError(400, 'La respuesta es obligatoria.'))).toBe(false);
    expect(pideLosKm(new ApiError(500, PIDE_KM))).toBe(false);
    expect(pideLosKm(new ApiError(0, 'sin red'))).toBe(false);
    expect(pideLosKm(new Error(PIDE_KM))).toBe(false);
    expect(pideLosKm(null)).toBe(false);
  });
});
