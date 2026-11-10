/** Spec 048 (FR-012): la foto y la respuesta escrita hechas sin señal esperan en la cola y salen en orden antes del cierre. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockPedidos: Array<{ ruta: string; body: Record<string, unknown> }> = [];
const mockRed = { hay: false };
jest.mock('../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, m: string) {
      super(m);
      this.status = status;
    }
    get esDeRed() {
      return this.status === 0;
    }
  }
  return {
    ApiError,
    apiFetch: jest.fn(async (ruta: string, op?: { body?: Record<string, unknown> }) => {
      if (!mockRed.hay) throw new ApiError(0, 'sin red');
      mockPedidos.push({ ruta, body: op?.body ?? {} });
      if (ruta.endsWith('/upload-url')) return { uploadUrl: 'https://s3.test/subida', bucket: 'b', ruta: 'habitos/x/r1/1' };
      if (ruta.endsWith('/evidence')) return { id: 'e1', estadoValidacion: 'PENDIENTE' };
      return { id: 'r1', estado: 'COMPLETADO', puntosOtorgados: 10, respuestaTexto: null, completadoEn: null };
    }),
  };
});
jest.mock('../../habits/api/registroVigente', () => {
  const real = jest.requireActual('../../habits/api/registroVigente') as Record<string, unknown>;
  return { ...real, ejecutarEnRegistroVigente: jest.fn(async (_id: string, escribir: (t: unknown) => Promise<unknown>) =>
    escribir({ id: 'r1', habitoId: 'h-foto', fechaEjecucion: '2026-11-09', estado: 'PENDIENTE' })) };
});
jest.mock('../horaReal', () => ({ horaReal: jest.fn(() => ({ instante: new Date(2026, 10, 9, 18, 0), origen: 'RELOJ_DEL_SISTEMA' })) }));
const mockCopias: string[] = [];
jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    exists = true;
    constructor(_base: unknown, nombre: string) {
      this.uri = `file:///docs/${nombre}`;
    }
    create() {}
  }
  class File {
    uri: string;
    exists = true;
    constructor(a: unknown, b?: string) {
      this.uri = typeof a === 'string' ? a : `${(a as Directory).uri}/${b}`;
    }
    copy(destino: File) {
      mockCopias.push(destino.uri);
    }
    delete() {}
  }
  return { Directory, File, Paths: { document: 'docs' } };
});

import { completarRegistro, confirmarEvidencia, subirEvidenciaDeArchivo } from '../../habits/api/evidenciaHabitoApi';
import { leerCola, ponerCuentaActual, procesarCola } from '../colaSinRed';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockCopias.length = 0;
  mockRed.hay = false;
  ponerCuentaActual('ana');
  globalThis.fetch = jest.fn<typeof fetch>(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Response));
});

describe('evidencia sin señal (spec 048)', () => {
  it('la foto se copia a una carpeta permanente y espera en la cola', async () => { // spec 048 FR-012
    await subirEvidenciaDeArchivo('r1', { uri: 'file:///cache/camara.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' });

    expect(mockCopias[0]).toMatch(/^file:\/\/\/docs\/renaser-sin-red\/.+\.jpeg$/);
    const [envio] = await leerCola('ana');
    expect(envio.tipo).toBe('subirEvidencia');
    expect(envio.datos).toMatchObject({ registroId: 'r1', uri: mockCopias[0], mimeType: 'image/jpeg' });
  });

  it('al volver la señal sale la foto, después el texto y al final el cierre, en ese orden y marcados como hechos sin red', async () => { // spec 048 FR-012 FR-007
    await subirEvidenciaDeArchivo('r1', { uri: 'file:///cache/camara.jpg', mimeType: 'image/jpeg', tipo: 'FOTO' });
    await confirmarEvidencia('r1', { tipo: 'TEXTO', contenidoTexto: 'Me sentí bien' });
    await completarRegistro('r1', 'Me sentí bien');
    mockRed.hay = true;

    expect(await procesarCola('ana')).toBe(0);

    expect(mockPedidos.map(p => p.ruta)).toEqual([
      '/api/v1/habit-tracks/r1/evidence/upload-url',
      '/api/v1/habit-tracks/r1/evidence',
      '/api/v1/habit-tracks/r1/evidence',
      '/api/v1/habit-tracks/r1/complete',
    ]);
    expect(mockPedidos[0].body).toMatchObject({ hechoSinRed: true });
    expect(mockPedidos[2].body).toMatchObject({ tipo: 'TEXTO', contenidoTexto: 'Me sentí bien', hechoSinRed: true });
    expect(mockPedidos[3].body).toMatchObject({ hechoEn: expect.any(String), idCliente: expect.any(String) });
  });
});
