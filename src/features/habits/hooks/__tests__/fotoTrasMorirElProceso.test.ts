/**
 * #49: en Android, si el sistema mata la app con la cámara abierta, la foto se perdía. Android se la entrega a la actividad
 * nueva antes de que React esté listo y React la descarta («Tried to access onActivityResult while context is not ready»);
 * `ImagePicker.getPendingResultAsync()` no tiene nada que devolver porque Expo solo guarda ese resultado EN MEMORIA (sirve
 * cuando muere la actividad y el proceso sigue, no cuando muere el proceso). Lo que queda es el archivo que la cámara escribió
 * en la caché de la app.
 *
 * Se prueba el hook entero con un teléfono de mentira: la cámara, el selector, el servidor y la carpeta de la caché
 * (`expo-file-system`) están reemplazados. Lo que importa es qué se abre al volver.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { ArchivoEvidencia } from '../../utils/capturarEvidencia';
import type { TrackDelDiaApi } from '../../types/habits.types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockRecuperada = jest.fn<(foto: { uri: string; nombre: string; modificadaEnMs: number }) => Promise<ArchivoEvidencia | null>>();
const mockDeCamara = jest.fn<(r: unknown) => Promise<ArchivoEvidencia | null>>();
jest.mock('../../utils/capturarEvidencia', () => ({
  tomarFotoConCamara: jest.fn(),
  elegirFotoDeGaleria: jest.fn(),
  archivoDeResultadoDeCamara: (r: unknown) => mockDeCamara(r),
  archivoDeFotoRecuperada: (foto: { uri: string; nombre: string; modificadaEnMs: number }) => mockRecuperada(foto),
}));
const mockPendiente = jest.fn<() => Promise<unknown>>();
jest.mock('expo-image-picker', () => ({ getPendingResultAsync: () => mockPendiente() }));

// La carpeta `cache/ImagePicker` del teléfono, en memoria.
const mockCarpeta = {
  existe: true,
  archivos: [] as { nombre: string; tamano: number; modificadaEnMs: number }[],
  borrados: [] as string[],
  listados: 0,
};
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    name: string;
    size: number;
    modificationTime: number;
    constructor(uri: string, datos?: { nombre: string; tamano: number; modificadaEnMs: number }) {
      this.uri = uri;
      this.name = datos?.nombre ?? uri.split('/').pop() ?? '';
      this.size = datos?.tamano ?? 0;
      this.modificationTime = datos?.modificadaEnMs ?? 0;
    }
    delete() {
      mockCarpeta.borrados.push(this.uri);
    }
  }
  class Directory {
    get exists() {
      return mockCarpeta.existe;
    }
    list() {
      mockCarpeta.listados += 1;
      return mockCarpeta.archivos.map(a => new File(`file:///cache/ImagePicker/${a.nombre}`, a));
    }
  }
  return { File, Directory, Paths: { cache: 'file:///cache' } };
});

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
import { fotoPendiente, VIGENCIA_FOTO_PENDIENTE_MS } from '../../storage/fotoPendiente';
import { useRegistroConFoto } from '../useRegistroConFoto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alerta = Alert.alert as unknown as jest.Mock<(...args: unknown[]) => void>;
/** El instante en que se abrió la cámara (el que anota `fotoPendiente.guardar`). */
const AL_ABRIR_LA_CAMARA = 1_761_900_000_000;
/** Cuánto después, al volver, se monta la pantalla. */
const AL_VOLVER_MS = 120_000;
let reloj = AL_ABRIR_LA_CAMARA;

function foto(uri: string): ArchivoEvidencia {
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

function Sonda() {
  api = useRegistroConFoto({ onCompletado: async () => undefined });
  return null;
}

const montar = () =>
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });

async function reanudar() {
  reloj = Math.max(reloj, AL_ABRIR_LA_CAMARA + AL_VOLVER_MS);
  await act(async () => {
    await api.reanudarPendiente();
  });
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

/** Lo que `sacarFoto` anota antes de abrir la cámara (un ritual: pregunta «¿Qué sentiste?»). */
async function anotarLaCamaraAbierta(extra: Record<string, unknown> = {}) {
  await fotoPendiente.guardar({ registroId: 'reg-1', titulo: 'Ritual de la mañana', conPregunta: true, ...extra });
}

/** Una foto que la cámara escribió `despuesDeAbrirMs` después de abrirse (negativo: ya estaba en la caché de antes). */
const fotoDeLaCamara = (nombre: string, despuesDeAbrirMs: number, tamano = 3_000_000) => ({
  nombre,
  tamano,
  modificadaEnMs: AL_ABRIR_LA_CAMARA + despuesDeAbrirMs,
});

beforeEach(async () => {
  reloj = AL_ABRIR_LA_CAMARA;
  jest.spyOn(Date, 'now').mockImplementation(() => reloj);
  jest.replaceProperty(Platform, 'OS', 'android');
  mockRecuperada.mockReset().mockImplementation(async f => foto(`file:///procesada/${f.nombre}`));
  mockDeCamara.mockReset().mockResolvedValue(foto('file:///de-expo.jpg'));
  mockPendiente.mockReset().mockResolvedValue(null);
  mockTracks.mockReset().mockResolvedValue([track()]);
  mockSubir.mockReset().mockResolvedValue({});
  mockCompletar.mockReset().mockResolvedValue({ puntosOtorgados: 5 });
  alerta.mockReset();
  mockCarpeta.existe = true;
  mockCarpeta.archivos = [];
  mockCarpeta.borrados = [];
  mockCarpeta.listados = 0;
  await AsyncStorage.clear();
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('Android mató el PROCESO con la cámara abierta: no hay resultado pendiente, queda el archivo de la cámara', () => {
  it('vuelve la pantalla partida con la foto que tomó la persona', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('c69ac7d2-c7c6-4ff8-a7b4-19991399a424.jpeg', 40_000)];
    montar();
    await reanudar();
    expect(api.modal.registro).toMatchObject({
      registroId: 'reg-1',
      titulo: 'Ritual de la mañana',
      conPregunta: true,
      archivo: { uri: 'file:///procesada/c69ac7d2-c7c6-4ff8-a7b4-19991399a424.jpeg' },
      evidenciaYaSubida: false,
    });
    expect(alerta).not.toHaveBeenCalled();
  });

  it('la foto original, a resolución completa, se borra de la caché una vez procesada', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('nueva.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(mockCarpeta.borrados).toEqual(['file:///cache/ImagePicker/nueva.jpeg']);
  });

  it('a la foto se le pone la hora en que la cámara la escribió, no la del arranque', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('nueva.jpeg', 90_000)];
    montar();
    await reanudar();
    expect(mockRecuperada).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'nueva.jpeg', modificadaEnMs: AL_ABRIR_LA_CAMARA + 90_000 }),
    );
  });

  it('de varias, toma la más nueva; ni las anteriores a la cámara ni el archivo vacío que crea Expo', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [
      fotoDeLaCamara('de-ayer.jpeg', -24 * 3_600_000),
      fotoDeLaCamara('vacio.jpeg', 5_000, 0),
      fotoDeLaCamara('nota.txt', 6_000),
      fotoDeLaCamara('la-buena.jpeg', 20_000),
    ];
    montar();
    await reanudar();
    expect(api.modal.registro?.archivo?.uri).toBe('file:///procesada/la-buena.jpeg');
  });

  it('un hábito sin pregunta se registra solo, como con cualquier foto de la cámara', async () => {
    await anotarLaCamaraAbierta({ titulo: 'Gimnasio', conPregunta: false });
    mockCarpeta.archivos = [fotoDeLaCamara('gym.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(mockSubir).toHaveBeenCalledTimes(1);
    expect(mockSubir.mock.calls[0][1]).toMatchObject({ uri: 'file:///procesada/gym.jpeg' });
    expect(mockCompletar).toHaveBeenCalledTimes(1);
  });

  it('kilómetros: vuelve con el campo de km (lo que se sabía al abrir la cámara)', async () => {
    await anotarLaCamaraAbierta({
      titulo: 'Kilómetros diarios',
      conPregunta: false,
      medicion: { unidad: 'KILOMETROS', totalPrevio: 12.5 },
    });
    mockTracks.mockRejectedValue(new Error('sin red'));
    mockCarpeta.archivos = [fotoDeLaCamara('km.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
    expect(mockSubir).not.toHaveBeenCalled();
  });
});

describe('lo que NO hace', () => {
  it('sin foto anotada no mira la caché: una foto vieja de la carpeta no abre nada', async () => {
    mockCarpeta.archivos = [fotoDeLaCamara('suelta.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro).toBeNull();
    expect(mockCarpeta.listados).toBe(0);
  });

  it('con la foto anotada pero la cámara cerrada sin tomar nada (solo el archivo vacío), no abre nada ni avisa', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('vacio.jpeg', 5_000, 0)];
    montar();
    await reanudar();
    expect(api.modal.registro).toBeNull();
    expect(alerta).not.toHaveBeenCalled();
  });

  it('sin carpeta de la cámara, no abre nada', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.existe = false;
    montar();
    await reanudar();
    expect(api.modal.registro).toBeNull();
  });

  it('si la foto no se puede procesar, no abre nada y deja el archivo donde estaba', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('rota.jpeg', 30_000)];
    mockRecuperada.mockResolvedValue(null);
    montar();
    await reanudar();
    expect(api.modal.registro).toBeNull();
    expect(mockCarpeta.borrados).toEqual([]);
  });

  it('una foto anotada hace más de 30 minutos ya no se ofrece, aunque el archivo siga ahí', async () => {
    await anotarLaCamaraAbierta();
    reloj = AL_ABRIR_LA_CAMARA + VIGENCIA_FOTO_PENDIENTE_MS + 1;
    mockCarpeta.archivos = [fotoDeLaCamara('nueva.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro).toBeNull();
  });

  it('se ofrece una sola vez: la segunda vez que se monta la pantalla ya no hay nada', async () => {
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('nueva.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro).not.toBeNull();
    act(() => api.cerrar());
    await reanudar();
    expect(api.modal.registro).toBeNull();
  });

  it('en iOS y en la web no toca la caché', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await anotarLaCamaraAbierta();
    mockCarpeta.archivos = [fotoDeLaCamara('nueva.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro).toBeNull();
    expect(mockCarpeta.listados).toBe(0);
  });
});

describe('solo murió la actividad (el proceso siguió): sigue valiendo el resultado pendiente de Expo', () => {
  it('con resultado pendiente de Expo se usa ese y no se mira la caché', async () => {
    await anotarLaCamaraAbierta();
    mockPendiente.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/ImagePicker/x.jpeg' }] });
    mockCarpeta.archivos = [fotoDeLaCamara('otra.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro?.archivo?.uri).toBe('file:///de-expo.jpg');
    expect(mockCarpeta.listados).toBe(0);
    expect(mockCarpeta.borrados).toEqual([]);
  });

  it('si el resultado de Expo no se puede procesar, se prueba con el archivo de la caché', async () => {
    await anotarLaCamaraAbierta();
    mockPendiente.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/ImagePicker/x.jpeg' }] });
    mockDeCamara.mockResolvedValue(null);
    mockCarpeta.archivos = [fotoDeLaCamara('otra.jpeg', 30_000)];
    montar();
    await reanudar();
    expect(api.modal.registro?.archivo?.uri).toBe('file:///procesada/otra.jpeg');
  });
});
