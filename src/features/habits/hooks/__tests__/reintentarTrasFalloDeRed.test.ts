/**
 * #51: en el registro con foto, «Reintentar» tiene que subir la foto en cuanto la conexión vuelve, sin cerrar la pantalla ni
 * perder la foto ni la respuesta. Se prueba el hook entero con la cámara y el servidor reemplazados (la subida real a S3 está
 * en `api/__tests__/subidaDeEvidencia.test.ts`).
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
jest.mock('../../utils/capturarEvidencia', () => ({
  tomarFotoConCamara: () => mockCamara(),
  elegirFotoDeGaleria: jest.fn(),
  archivoDeResultadoDeCamara: jest.fn(),
  archivoDeFotoRecuperada: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({ getPendingResultAsync: jest.fn() }));

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

import { useRegistroConFoto } from '../useRegistroConFoto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MENSAJE_GENERICO = 'No se pudo registrar. Tu foto y tu respuesta siguen acá: intenta de nuevo.';
const SIN_RED = new TypeError('Network request failed');

function foto(uri = 'file:///a.jpg'): ArchivoEvidencia {
  return { uri, mimeType: 'image/jpeg', tipo: 'FOTO', etiqueta: uri, tomadaEn: null };
}

function track(extra: Partial<TrackDelDiaApi> = {}): TrackDelDiaApi {
  return {
    id: 'reg-1',
    habitoId: 'hab-1',
    fechaEjecucion: '2026-10-31',
    diaPrograma: 20,
    tipoDia: 'NORMAL',
    esOpcional: false,
    estado: 'PENDIENTE',
    puntosOtorgados: 0,
    respuestaTexto: null,
    calificacionProductividad: null,
    completadoEn: null,
    tituloHabito: 'RITUAL DE LA MAÑANA',
    tipoHabito: 'EVIDENCIA',
    guia: null,
    horaDisparo: null,
    horaLimite: null,
    ...extra,
  };
}

type Api = ReturnType<typeof useRegistroConFoto>;
let api!: Api;
let raiz: ReactTestRenderer | null = null;
const alCompletar = jest.fn<(...args: unknown[]) => void>();

function Sonda() {
  api = useRegistroConFoto({ onCompletado: async (...args) => alCompletar(...args) });
  return null;
}

const vaciar = () =>
  act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });

async function abrirElRitual() {
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  await act(async () => {
    await api.iniciar({ registroId: 'reg-1', titulo: 'Ritual de la mañana', conPregunta: true });
  });
  await act(async () => {
    api.modal.onCambiarRespuesta('Bien');
  });
}

/** Un toque en TERMINAR / REINTENTAR, como el botón de la pantalla partida. */
async function tocarTerminar() {
  await act(async () => {
    api.modal.onTerminar();
  });
  await vaciar();
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockCamara.mockReset().mockResolvedValue(foto());
  mockTracks.mockReset().mockResolvedValue([track()]);
  mockSubir.mockReset().mockResolvedValue({});
  mockCompletar.mockReset().mockResolvedValue({ puntosOtorgados: 5 });
  alCompletar.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined); // el paso que falló queda en el registro (#51)
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('«Reintentar» después de un fallo de red', () => {
  it('el fallo deja la pantalla abierta con la foto y la respuesta, y el botón en «Reintentar»', async () => {
    await abrirElRitual();
    mockSubir.mockRejectedValueOnce(SIN_RED);
    await tocarTerminar();
    expect(api.modal.error).toBe(MENSAJE_GENERICO);
    expect(api.modal.enviando).toBe(false);
    expect(api.modal.registro?.archivo?.uri).toBe('file:///a.jpg');
    expect(api.modal.respuesta).toBe('Bien');
    expect(alCompletar).not.toHaveBeenCalled();
  });

  it('con la conexión de vuelta, el siguiente toque vuelve a subir la foto y cierra el registro', async () => {
    await abrirElRitual();
    mockSubir.mockRejectedValueOnce(SIN_RED);
    await tocarTerminar();
    await tocarTerminar();
    expect(mockSubir).toHaveBeenCalledTimes(2);
    expect(mockSubir.mock.calls[1]).toEqual(mockSubir.mock.calls[0]); // la misma foto al mismo registro
    expect(mockCompletar).toHaveBeenCalledTimes(1);
    expect(mockCompletar.mock.calls[0][1]).toBe('Bien');
    expect(api.modal.registro).toBeNull();
    expect(api.modal.error).toBeNull();
    expect(alCompletar).toHaveBeenCalledTimes(1);
  });

  it('varios fallos seguidos no cierran ni gastan nada: el que sale después de todos funciona', async () => {
    await abrirElRitual();
    mockSubir.mockRejectedValueOnce(SIN_RED).mockRejectedValueOnce(SIN_RED).mockRejectedValueOnce(SIN_RED);
    await tocarTerminar();
    await tocarTerminar();
    await tocarTerminar();
    expect(api.modal.error).toBe(MENSAJE_GENERICO);
    expect(api.modal.registro).not.toBeNull();
    await tocarTerminar();
    expect(mockSubir).toHaveBeenCalledTimes(4);
    expect(alCompletar).toHaveBeenCalledTimes(1);
  });

  it('si la foto ya quedó subida y falló el cierre, reintentar solo cierra (no duplica la evidencia)', async () => {
    mockSubir.mockImplementation(async () => ({}));
    await abrirElRitual();
    // `registrarConFoto` avisa que la evidencia se confirmó antes de cerrar: se simula con el cierre fallando.
    mockCompletar.mockRejectedValueOnce(new ApiError(0, 'No se pudo conectar con el servidor.'));
    await tocarTerminar();
    expect(api.modal.error).toBe('No se pudo conectar con el servidor.');
    expect(api.modal.registro?.evidenciaYaSubida).toBe(true);
    await tocarTerminar();
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockCompletar).toHaveBeenCalledTimes(2);
    expect(alCompletar).toHaveBeenCalledTimes(1);
  });

  it('un toque mientras todavía se envía no manda un segundo envío', async () => {
    await abrirElRitual();
    let soltar!: () => void;
    mockSubir.mockImplementationOnce(() => new Promise(resolver => (soltar = () => resolver({}))));
    await act(async () => {
      api.modal.onTerminar();
      api.modal.onTerminar();
    });
    expect(mockSubir).toHaveBeenCalledTimes(1);
    await act(async () => {
      soltar();
    });
    await vaciar();
    expect(alCompletar).toHaveBeenCalledTimes(1);
  });
});
