import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Mi Radar contra el contrato (spec 012, `contracts/api.md`): el GET y el PUT, y la tolerancia de los campos nuevos
 * (`horaPrevista`, `miRadar`) para que ni un backend anterior ni un valor roto tumben lo que ya funcionaba.
 */

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import { ApiError } from '../../../../services/http/apiClient';
import { guardarMiRadar, obtenerHistorial, obtenerMiRadar, registrarCheckIn } from '../radarApi';

beforeEach(() => {
  mockApiFetch.mockReset();
});

const registro = {
  id: 'r1',
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 6,
  whatAmIAvoiding: 'd',
  createdAt: '2026-10-29T19:06:00Z',
};

describe('GET y PUT /api/v1/radar/mi-radar', () => {
  it('lee encendido con sus horas', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9, 14, 20] });
    expect(await obtenerMiRadar()).toEqual({ encendido: true, horas: [9, 14, 20], dias: [] });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', undefined);
  });

  it('lee los días con horas propias y los sin Radar (`horas: []`), ordenados por día', async () => {
    mockApiFetch.mockResolvedValueOnce({
      encendido: true,
      horas: [9, 14, 20],
      dias: [{ dia: 7, horas: [] }, { dia: 6, horas: [14, 11] }],
    });
    expect(await obtenerMiRadar()).toEqual({
      encendido: true,
      horas: [9, 14, 20],
      dias: [{ dia: 6, horas: [11, 14] }, { dia: 7, horas: [] }],
    });
  });

  it('sin `dias` (un backend anterior, o nadie tiene horas propias) ningún día tiene horas propias', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9] });
    expect(await obtenerMiRadar()).toEqual({ encendido: true, horas: [9], dias: [] });
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9], dias: null });
    expect(await obtenerMiRadar()).toEqual({ encendido: true, horas: [9], dias: [] });
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9], dias: 'sábado' });
    expect(await obtenerMiRadar()).toEqual({ encendido: true, horas: [9], dias: [] });
  });

  it('un día roto se pierde SOLO él (ese día sigue a todos); no se lee como «Sin Radar»', async () => {
    mockApiFetch.mockResolvedValueOnce({
      encendido: true,
      horas: [9],
      dias: [
        { dia: 6, horas: [11] },
        { dia: 7 },
        { dia: 'lunes', horas: [8] },
        { horas: [8] },
        'basura',
        null,
        { dia: 8, horas: [8] },
        { dia: 0, horas: [8] },
        { dia: 6, horas: [12] },
        { dia: 3, horas: [20, 20, 24, 9.5] },
      ],
    });
    // 6 gana el primero; 3 conserva solo las horas que valen; 7 sin la lista de horas no es «sin Radar».
    expect(await obtenerMiRadar()).toEqual({
      encendido: true,
      horas: [9],
      dias: [{ dia: 3, horas: [20] }, { dia: 6, horas: [11] }],
    });
  });

  it('apagado: sin horas, aunque el servidor mande alguna', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: false, horas: [], dias: [] });
    expect(await obtenerMiRadar()).toEqual({ encendido: false, horas: [], dias: [] });
    mockApiFetch.mockResolvedValueOnce({ encendido: false, horas: [9], dias: [{ dia: 6, horas: [11] }] });
    expect(await obtenerMiRadar()).toEqual({ encendido: false, horas: [], dias: [] });
  });

  it('`horas` ausente, repetidas o fuera de un día se leen como lo que sirve (ordenadas, sin repetir)', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: true });
    expect(await obtenerMiRadar()).toEqual({ encendido: true, horas: [], dias: [] });
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [20, 9, 9, 25, -1, 14.5] });
    expect(await obtenerMiRadar()).toEqual({ encendido: true, horas: [9, 20], dias: [] });
  });

  it('una respuesta sin `encendido` es un error (no se inventa un estado)', async () => {
    mockApiFetch.mockResolvedValueOnce({ horas: [9] });
    await expect(obtenerMiRadar()).rejects.toThrow(/GET \/api\/v1\/radar\/mi-radar/);
  });

  it('un 404 (backend anterior) llega como ApiError para que quien llama lo lea como «no hay Mi Radar»', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'no encontrado'));
    await expect(obtenerMiRadar()).rejects.toMatchObject({ status: 404 });
  });

  it('guarda con PUT y el cuerpo crudo (apiFetch ya lo serializa), y devuelve lo guardado', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9, 14, 20] });
    const guardada = await guardarMiRadar({ encendido: true, horas: [9, 14, 20] });
    expect(guardada).toEqual({ encendido: true, horas: [9, 14, 20], dias: [] });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', {
      method: 'PUT',
      body: { encendido: true, horas: [9, 14, 20] },
    });
  });

  it('guarda también los días con horas propias (`dias`), con lunes = 1', async () => {
    const config = { encendido: true, horas: [9, 14, 20], dias: [{ dia: 6, horas: [11] }, { dia: 7, horas: [] }] };
    mockApiFetch.mockResolvedValueOnce(config);
    expect(await guardarMiRadar(config)).toEqual(config);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', { method: 'PUT', body: config });
  });

  it('apagar manda `encendido: false` sin horas', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: false, horas: [], dias: [] });
    await guardarMiRadar({ encendido: false, horas: [] });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', {
      method: 'PUT',
      body: { encendido: false, horas: [] },
    });
  });

  it('un 400 del servidor (una hora fuera de las reglas) llega con su mensaje', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(400, 'Las horas van de 3 a 23'));
    await expect(guardarMiRadar({ encendido: true, horas: [2] })).rejects.toMatchObject({ status: 400 });
  });
});

describe('los campos nuevos del historial son opcionales y tolerantes', () => {
  it('un backend anterior: sin `horaPrevista` ni `miRadar`', async () => {
    mockApiFetch.mockResolvedValueOnce({ entries: [registro], nextCursor: null });
    const pagina = await obtenerHistorial();
    expect(pagina.entries[0].horaPrevista).toBeUndefined();
    expect(pagina.miRadar).toBeNull();
    expect(pagina.nextCursor).toBeNull();
  });

  it('el backend nuevo: la hora prevista de cada registro y el Mi Radar de la persona', async () => {
    mockApiFetch.mockResolvedValueOnce({
      entries: [{ ...registro, horaPrevista: 14 }, { ...registro, id: 'r2', horaPrevista: null }],
      nextCursor: '2026-10-29T18:00:00Z',
      miRadar: { encendido: true, horas: [9, 14, 20], dias: [{ dia: 7, horas: [] }] },
    });
    const pagina = await obtenerHistorial();
    expect(pagina.entries.map(e => e.horaPrevista)).toEqual([14, null]);
    expect(pagina.miRadar).toEqual({ encendido: true, horas: [9, 14, 20], dias: [{ dia: 7, horas: [] }] });
    expect(pagina.nextCursor).toBe('2026-10-29T18:00:00Z');
  });

  it('un `horaPrevista` o un `miRadar` rotos se pierden SOLOS: los registros siguen', async () => {
    mockApiFetch.mockResolvedValueOnce({
      entries: [{ ...registro, horaPrevista: 'catorce' }],
      nextCursor: null,
      miRadar: { encendido: 'sí' },
    });
    const pagina = await obtenerHistorial();
    expect(pagina.entries).toHaveLength(1);
    expect(pagina.entries[0].horaPrevista).toBeNull();
    expect(pagina.entries[0].whatAmIFeeling).toBe('c');
    expect(pagina.miRadar).toBeNull();
  });

  it('el POST devuelve también la hora prevista, y sin ella sigue siendo válido', async () => {
    mockApiFetch.mockResolvedValueOnce({ ...registro, horaPrevista: 14 });
    expect((await registrarCheckIn({ whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 6, whatAmIAvoiding: 'd' })).horaPrevista).toBe(14);
    mockApiFetch.mockResolvedValueOnce(registro);
    expect((await registrarCheckIn({ whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 6, whatAmIAvoiding: 'd' })).horaPrevista).toBeUndefined();
  });
});
