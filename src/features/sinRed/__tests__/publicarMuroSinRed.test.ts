/** Spec 048 fase 2 (FR-018, FR-020, D17–D19): la publicación del Muro escrita sin señal. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
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
  return { ApiError, apiFetch: jest.fn(async () => ({})) };
});
const mockRed = { hay: false, fallaUnaVez: false };
const mockPublicadas: Array<{ texto: string; media: unknown[]; sinRed: Record<string, string> }> = [];
jest.mock('../../community/api/wallApi', () => ({
  solicitarUrlSubidaMuro: jest.fn(async () => {
    if (!mockRed.hay) throw Object.assign(new Error('sin red'), { status: 0 });
    return { uploadUrl: 'https://s3.test/subida', ruta: 'muro/ana/foto-1.jpg' };
  }),
  almacenamientoSinConfigurar: jest.fn(() => false),
  subirImagenAS3: jest.fn(async () => undefined),
  publicarEnMuro: jest.fn(async (texto: string, media: unknown[], _c: unknown, _f: unknown, sinRed: Record<string, string>) => {
    if (mockRed.fallaUnaVez) {
      mockRed.fallaUnaVez = false;
      throw Object.assign(new Error('caído'), { status: 503 });
    }
    mockPublicadas.push({ texto, media, sinRed });
    return {};
  }),
}));
jest.mock('../../habits/api/habitsApi', () => ({
  obtenerCatalogo: jest.fn(async () => [{ id: 'h-post', systemKey: 'POST_DIARIO_COMUNIDAD' }]),
  obtenerTracksDeHoy: jest.fn(async () => [{ id: 'r-post', habitoId: 'h-post', fechaEjecucion: '2026-11-09', estado: 'PENDIENTE' }]),
}));
jest.mock('../../habits/types/habits.types', () => ({ CLAVE_SISTEMA_POST_DIARIO_COMUNIDAD: 'POST_DIARIO_COMUNIDAD' }));
jest.mock('../horaReal', () => ({ horaReal: jest.fn(() => ({ instante: new Date(2026, 10, 9, 21, 30), origen: 'RELOJ_DEL_SISTEMA' })) }));
const mockBorradas: string[] = [];
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
    copy() {}
    delete() {
      mockBorradas.push(this.uri);
    }
  }
  return { Directory, File, Paths: { document: 'docs' } };
});

import { borrarPublicacionEnEspera, encolarPublicacion, publicacionesEnEspera } from '../../community/api/publicarSinRed';
import { leerCola, ponerCuentaActual, procesarCola } from '../colaSinRed';
import { aplicarAjustesDeLectura } from '../lecturasGuardadas';
// Registra el ajuste de lectura que deja hecho el «Post diario» mientras la publicación espera.
import '../../habits/api/evidenciaHabitoApi';

const FOTO = { uri: 'file:///cache/foto.jpg', mimeType: 'image/jpeg', nombre: 'foto.jpg', width: 1080, height: 1080 };

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPublicadas.length = 0;
  mockBorradas.length = 0;
  mockRed.hay = false;
  mockRed.fallaUnaVez = false;
  ponerCuentaActual('ana');
});

describe('publicar en el Muro sin señal (spec 048 fase 2)', () => {
  it('queda en la cola con sus fotos copiadas y el «Post diario» de ese día sale hecho al instante', async () => { // spec 048 FR-018 FR-011
    await encolarPublicacion('Ana', 'Hoy entrené sin señal', [FOTO], null, null);

    const [espera] = await publicacionesEnEspera('ana');
    expect(espera).toMatchObject({ texto: 'Hoy entrené sin señal', autor: 'Ana', registroPostDiario: 'r-post' });
    expect(espera.fotos[0].uri).toMatch(/^file:\/\/\/docs\/renaser-sin-red\//);
    const hoy = (await aplicarAjustesDeLectura('/api/v1/habit-tracks/today', [{ id: 'r-post', estado: 'PENDIENTE' }])) as Array<{ estado: string }>;
    expect(hoy[0].estado).toBe('COMPLETADO');
  });

  it('al volver la señal sube la foto y publica con la hora real y el id del envío', async () => { // spec 048 FR-018 FR-020
    await encolarPublicacion('Ana', 'Hoy entrené sin señal', [FOTO], null, null);
    const [envio] = await leerCola('ana');
    mockRed.hay = true;

    expect(await procesarCola('ana')).toBe(0);

    expect(mockPublicadas).toHaveLength(1);
    expect(mockPublicadas[0].media).toEqual([{ url: 'muro/ana/foto-1.jpg', mimeType: 'image/jpeg' }]);
    expect(mockPublicadas[0].sinRed).toEqual({ hechoEn: envio.hechoEn, idCliente: envio.idCliente, origenDeLaHora: 'RELOJ_DEL_SISTEMA' });
    expect(mockBorradas).toHaveLength(1); // la copia de la foto ya no hace falta
  });

  it('borrada mientras espera, no se publica nunca y su foto se borra', async () => { // spec 048 FR-018
    const idCliente = await encolarPublicacion('Ana', 'Mejor no', [FOTO], null, null);

    expect(await borrarPublicacionEnEspera(idCliente)).toBe(true);
    mockRed.hay = true;
    await procesarCola('ana');

    expect(mockPublicadas).toHaveLength(0);
    expect(await publicacionesEnEspera('ana')).toEqual([]);
    expect(mockBorradas).toHaveLength(1);
  });

  it('si el servidor falla, el reintento manda el MISMO id del envío (el servidor la guarda una sola vez)', async () => { // spec 048 FR-020
    await encolarPublicacion('Ana', 'Hoy entrené sin señal', [FOTO], null, null);
    const [envio] = await leerCola('ana');
    mockRed.hay = true;
    mockRed.fallaUnaVez = true;

    expect(await procesarCola('ana')).toBe(1);
    expect(await procesarCola('ana', Date.now() + 10 * 60_000, { adelantar: true })).toBe(0);

    expect(mockPublicadas).toHaveLength(1);
    expect(mockPublicadas[0].sinRed.idCliente).toBe(envio.idCliente);
  });
});
