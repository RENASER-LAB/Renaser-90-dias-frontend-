/**
 * #41: KILÓMETROS DIARIOS pide «la captura de tu app de actividad», y una captura de pantalla del mismo
 * teléfono no se puede sacar con su cámara. Solo ese registro (el que pide los km) ofrece «Tomar foto» o
 * «Elegir de la galería»; todos los demás hábitos con evidencia obligatoria siguen abriendo la cámara
 * directo (decisión del 2026-09-26), y una acción del día (`'roca'`) también: exige el EXIF de una foto
 * tomada ahora.
 *
 * El hook se prueba entero (con la cámara, la galería y el servidor reemplazados), porque lo que importa es
 * qué se abre y en qué orden, no una función suelta.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { ArchivoEvidencia } from '../../utils/capturarEvidencia';
import type { ReglasDelDestino } from '../../utils/destinoDeFoto';
import { seOfreceGaleria, type MedicionPedida } from '../../utils/registroConFoto';
import type { TrackDelDiaApi } from '../../types/habits.types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockCamara = jest.fn<() => Promise<ArchivoEvidencia | null>>();
const mockGaleria = jest.fn<() => Promise<ArchivoEvidencia | null>>();
jest.mock('../../utils/capturarEvidencia', () => ({
  tomarFotoConCamara: () => mockCamara(),
  elegirFotoDeGaleria: () => mockGaleria(),
  archivoDeResultadoDeCamara: jest.fn(),
}));

const mockTracks = jest.fn<() => Promise<TrackDelDiaApi[]>>();
jest.mock('../../api/habitsApi', () => ({ obtenerTracksDeHoy: () => mockTracks() }));
jest.mock('../../api/evidenciaHabitoApi', () => ({
  AlmacenamientoSinConfigurarError: class extends Error {},
  completarRegistro: jest.fn(),
  subirEvidenciaDeArchivo: jest.fn(),
}));
jest.mock('../../../../components/Alerta', () => ({ Alert: { alert: jest.fn() } }));

import { useRegistroConFoto } from '../useRegistroConFoto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KM: MedicionPedida = { unidad: 'KILOMETROS', totalPrevio: 12.5 };

function foto(uri: string): ArchivoEvidencia {
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

type Api = ReturnType<typeof useRegistroConFoto>;
let api!: Api;
let raiz: ReactTestRenderer | null = null;

function Sonda({ destinos }: { destinos?: { roca?: ReglasDelDestino } }) {
  api = useRegistroConFoto({ onCompletado: async () => undefined, destinos });
  return null;
}

function montar(destinos?: { roca?: ReglasDelDestino }) {
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda, { destinos }));
  });
}

/**
 * Empieza el toque y deja que llegue hasta donde se detiene (la hoja, o la foto ya sacada). Devuelve el
 * resultado como PROMESA SIN ESPERAR: con la hoja abierta no resuelve hasta que se elige o se cierra.
 */
async function empezar(...args: Parameters<Api['iniciar']>): Promise<{ resultado: ReturnType<Api['iniciar']> }> {
  let resultado!: ReturnType<Api['iniciar']>;
  await act(async () => {
    resultado = api.iniciar(...args);
    await Promise.resolve();
  });
  // En un objeto: devolver la promesa tal cual haría que `await` la espere.
  return { resultado };
}

/** El toque entero, para los casos que no abren la hoja y terminan solos. */
async function iniciar(...args: Parameters<Api['iniciar']>) {
  let resultado!: Awaited<ReturnType<Api['iniciar']>>;
  await act(async () => {
    resultado = await api.iniciar(...args);
  });
  return resultado;
}

async function elegir(origen: 'camara' | 'galeria') {
  await act(async () => {
    api.modal.origen!.onElegir(origen);
  });
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockCamara.mockReset().mockResolvedValue(foto('file:///camara.jpg'));
  mockGaleria.mockReset().mockResolvedValue(foto('file:///captura.jpg'));
  mockTracks.mockReset().mockResolvedValue([track()]);
});

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  jest.restoreAllMocks();
});

describe('KILÓMETROS DIARIOS ofrece la galería', () => {
  it('al tocar el hábito abre la hoja y NO abre ninguna cámara ni galería hasta que se elige', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    montar();
    await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    expect(api.modal.origen).not.toBeNull();
    expect(api.modal.origen?.titulo).toBe('Kilómetros diarios');
    expect(mockCamara).not.toHaveBeenCalled();
    expect(mockGaleria).not.toHaveBeenCalled();
    expect(api.modal.registro).toBeNull();
  });

  it('«Elegir de la galería» usa la galería (nunca la cámara) y sigue la pantalla partida con el campo de km', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    montar();
    const { resultado } = await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    await elegir('galeria');
    expect(await resultado).toBe('abierto');
    expect(mockGaleria).toHaveBeenCalledTimes(1);
    expect(mockCamara).not.toHaveBeenCalled();
    expect(api.modal.origen).toBeNull();
    expect(api.modal.registro?.archivo?.uri).toBe('file:///captura.jpg');
    // Misma pantalla partida de siempre, con la pregunta de los km (y no un envío solo).
    expect(api.modal.registro?.medicion).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
  });

  it('«Tomar foto» sigue siendo la cámara', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    montar();
    const { resultado } = await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    await elegir('camara');
    expect(await resultado).toBe('abierto');
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(mockGaleria).not.toHaveBeenCalled();
    expect(api.modal.registro?.archivo?.uri).toBe('file:///camara.jpg');
  });

  it('cerrar la hoja sin elegir no saca ninguna foto y deja volver a tocar', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    montar();
    const { resultado } = await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    await act(async () => {
      api.modal.origen!.onCancelar();
    });
    expect(await resultado).toBe('cancelado');
    expect(api.modal.origen).toBeNull();
    expect(mockCamara).not.toHaveBeenCalled();
    expect(mockGaleria).not.toHaveBeenCalled();

    // Nada quedó «ocupado»: el siguiente toque vuelve a abrir la hoja.
    await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    expect(api.modal.origen).not.toBeNull();
  });

  it('desde el chat o el orbe (sin pista) lo sabe por el registro fresco del servidor', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    montar();
    await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false });
    expect(api.modal.origen).not.toBeNull();
  });

  it('con la foto ya subida de un intento anterior no hay foto que elegir: no abre la hoja', async () => {
    mockTracks.mockResolvedValue([{ ...DE_KM, tieneEvidencia: true }]);
    montar();
    const resultado = await iniciar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    expect(resultado).toBe('abierto');
    expect(api.modal.origen).toBeNull();
    expect(api.modal.registro?.archivo).toBeNull();
  });

  it('«Cambiar foto» en la pantalla partida también deja elegir la galería', async () => {
    mockTracks.mockResolvedValue([DE_KM]);
    montar();
    const { resultado: primero } = await empezar({ registroId: 'reg-1', titulo: 'Kilómetros diarios', conPregunta: false, medicion: KM });
    await elegir('camara');
    await primero;
    expect(api.modal.registro?.archivo?.uri).toBe('file:///camara.jpg');

    await act(async () => {
      api.modal.onRetomarFoto();
      await Promise.resolve();
    });
    expect(api.modal.origen).not.toBeNull();
    await elegir('galeria');
    expect(mockGaleria).toHaveBeenCalledTimes(1);
    expect(api.modal.registro?.archivo?.uri).toBe('file:///captura.jpg');
    // Lo que se escribió no se pierde y la pregunta sigue siendo la de los km.
    expect(api.modal.registro?.medicion).not.toBeNull();
  });
});

describe('los demás hábitos no cambian', () => {
  it('un hábito con evidencia obligatoria que no mide nada abre la cámara directo, sin hoja', async () => {
    montar();
    const resultado = await iniciar({ registroId: 'reg-1', titulo: 'Ducha fría', conPregunta: false, medicion: null });
    expect(resultado).toBe('abierto');
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(mockGaleria).not.toHaveBeenCalled();
    expect(api.modal.origen).toBeNull();
  });

  it('tampoco los rituales (con «¿Qué sentiste?»)', async () => {
    montar();
    await iniciar({ registroId: 'reg-1', titulo: 'Ritual de la mañana', conPregunta: true });
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(mockGaleria).not.toHaveBeenCalled();
    expect(api.modal.origen).toBeNull();
  });

  it('«Tomar otra» de un hábito sin km sigue siendo la cámara directo', async () => {
    montar();
    await iniciar({ registroId: 'reg-1', titulo: 'Ducha fría', conPregunta: true });
    mockCamara.mockResolvedValue(foto('file:///otra.jpg'));
    await act(async () => {
      api.modal.onRetomarFoto();
      await Promise.resolve();
    });
    expect(api.modal.origen).toBeNull();
    expect(mockCamara).toHaveBeenCalledTimes(2);
    expect(mockGaleria).not.toHaveBeenCalled();
    expect(api.modal.registro?.archivo?.uri).toBe('file:///otra.jpg');
  });

  it('una acción del día (roca) nunca ofrece la galería, ni con una pista de km: pide el EXIF de una foto de ahora', async () => {
    const deRoca: ReglasDelDestino = {
      estadoFresco: async () => ({ tipo: 'disponible', evidenciaYaSubida: false }),
      registrar: async () => ({ puntosOtorgados: 0, yaEstabaCompletado: false }),
    };
    montar({ roca: deRoca });
    await iniciar({ registroId: 'roca-1', titulo: 'Mi acción', conPregunta: false, destino: 'roca', medicion: KM });
    expect(api.modal.origen).toBeNull();
    expect(mockCamara).toHaveBeenCalledTimes(1);
    expect(mockGaleria).not.toHaveBeenCalled();
  });
});

describe('seOfreceGaleria (la regla, sin cámara ni React)', () => {
  it('solo un hábito que pide los km', () => {
    expect(seOfreceGaleria(KM)).toBe(true);
    expect(seOfreceGaleria(KM, 'habito')).toBe(true);
  });

  it('un hábito que no mide nada, o que no se sabe si mide, no la ofrece', () => {
    expect(seOfreceGaleria(null)).toBe(false);
    expect(seOfreceGaleria(undefined)).toBe(false);
  });

  it('una acción del día no la ofrece nunca', () => {
    expect(seOfreceGaleria(KM, 'roca')).toBe(false);
  });
});
