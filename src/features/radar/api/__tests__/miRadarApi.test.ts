import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Mi Radar contra el contrato (spec 019, `plan.md` del backend): el GET y el PUT, y la tolerancia de los campos nuevos
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

/** Lo que responde el backend con la spec 019: un día con todo lo que el servidor resolvió. */
const diaDelServidor = (dia: number, cambios: Record<string, unknown> = {}) => ({
  dia, fecha: `2026-10-${25 + dia}`, modo: 'AUTOMATICO', veces: 17, maximo: 17, sinRadar: false, editable: dia > 4,
  despertar: '05:30', dormir: '22:30', horas: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], motivo: null, ...cambios,
});
const semanaDelServidor = (encendido = true, cambios: Record<number, Record<string, unknown>> = {}) => ({
  encendido, hoy: '2026-10-29', dias: [1, 2, 3, 4, 5, 6, 7].map(d => diaDelServidor(d, cambios[d])),
});

describe('GET y PUT /api/v1/radar/mi-radar (spec 019)', () => {
  it('lee la semana: encendido, hoy y los siete días con modo, veces, máximo, editable, horario y horas', async () => {
    mockApiFetch.mockResolvedValueOnce(semanaDelServidor());
    const config = await obtenerMiRadar();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', undefined);
    expect(config.encendido).toBe(true);
    expect(config.hoy).toBe('2026-10-29');
    expect(config.dias).toHaveLength(7);
    expect(config.dias[0]).toEqual({
      dia: 1, fecha: '2026-10-26', modo: 'AUTOMATICO', veces: 17, maximo: 17, sinRadar: false, editable: false,
      despertar: '05:30', dormir: '22:30', horas: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], motivo: null,
    });
    expect(config.dias[5].editable).toBe(true);
  });

  it('un día sin Despertar llega sin horas y con su motivo', async () => {
    mockApiFetch.mockResolvedValueOnce(semanaDelServidor(true, { 6: { despertar: null, horas: [], veces: 0, maximo: 0, motivo: 'SIN_DESPERTAR' } }));
    const dia = (await obtenerMiRadar()).dias[5];
    expect(dia).toMatchObject({ despertar: null, horas: [], veces: 0, maximo: 0, motivo: 'SIN_DESPERTAR' });
  });

  it('las horas fuera de 3 a 23, repetidas o no enteras se descartan y quedan ordenadas; las HH:mm se leen sin segundos', async () => {
    mockApiFetch.mockResolvedValueOnce(semanaDelServidor(true, { 1: { horas: [20, 9, 9, 25, -1, 14.5, 2, 3], despertar: '05:30:00' } }));
    const dia = (await obtenerMiRadar()).dias[0];
    expect(dia.horas).toEqual([3, 9, 20]);
    expect(dia.despertar).toBe('05:30');
  });

  it('«Sin Radar» deja las veces en 0 y un modo desconocido se lee como Automático', async () => {
    mockApiFetch.mockResolvedValueOnce(semanaDelServidor(true, { 2: { sinRadar: true, horas: [], veces: 9, modo: 'RARO' } }));
    expect((await obtenerMiRadar()).dias[1]).toMatchObject({ sinRadar: true, veces: 0, modo: 'AUTOMATICO' });
  });

  it('un día roto se pierde SOLO él; los repetidos o fuera de 1 a 7 también, y salen ordenados', async () => {
    mockApiFetch.mockResolvedValueOnce({
      encendido: true,
      hoy: null,
      dias: [diaDelServidor(7), { dia: 3 }, diaDelServidor(8), diaDelServidor(0), 'basura', null, diaDelServidor(1), diaDelServidor(1, { veces: 3 })],
    });
    const config = await obtenerMiRadar();
    expect(config.dias.map(d => d.dia)).toEqual([1, 7]);
    expect(config.dias[0].veces).toBe(17);
  });

  it('una respuesta de un backend anterior a la 019 (con `horas` y sin días resueltos) es un ERROR, no un Mi Radar apagado', async () => {
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9, 14, 20], dias: [{ dia: 6, horas: [11] }] });
    await expect(obtenerMiRadar()).rejects.toThrow(/GET \/api\/v1\/radar\/mi-radar/);
    mockApiFetch.mockResolvedValueOnce({ encendido: true, horas: [9] });
    await expect(obtenerMiRadar()).rejects.toThrow(/GET \/api\/v1\/radar\/mi-radar/);
  });

  it('una respuesta sin `encendido` es un error (no se inventa un estado)', async () => {
    mockApiFetch.mockResolvedValueOnce({ dias: [diaDelServidor(1)] });
    await expect(obtenerMiRadar()).rejects.toThrow(/GET \/api\/v1\/radar\/mi-radar/);
  });

  it('un 404 (backend anterior) llega como ApiError para que quien llama lo lea como «no hay Mi Radar»', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'no encontrado'));
    await expect(obtenerMiRadar()).rejects.toMatchObject({ status: 404 });
  });

  it('guarda con PUT, el cuerpo crudo (apiFetch ya lo serializa) y SOLO los días tocados; devuelve la semana', async () => {
    mockApiFetch.mockResolvedValueOnce(semanaDelServidor());
    const pedido = { encendido: true, dias: [{ dia: 6, modo: 'PERSONALIZADO' as const, veces: 3, sinRadar: false }] };
    const guardada = await guardarMiRadar(pedido);
    expect(guardada.dias).toHaveLength(7);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', { method: 'PUT', body: pedido });
  });

  it('encender o apagar manda solo `encendido`', async () => {
    mockApiFetch.mockResolvedValueOnce(semanaDelServidor(false));
    await guardarMiRadar({ encendido: false });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar/mi-radar', { method: 'PUT', body: { encendido: false } });
  });

  it('un 400 (veces fuera de las reglas) y un 409 (hoy o un día pasado) llegan con su mensaje', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(400, 'Las veces por día van de 1 a 21'));
    await expect(guardarMiRadar({ encendido: true, dias: [{ dia: 6, veces: 0 }] })).rejects.toMatchObject({ status: 400 });
    mockApiFetch.mockRejectedValueOnce(new ApiError(409, 'Hoy y los días que pasaron no se pueden cambiar'));
    await expect(guardarMiRadar({ encendido: true, dias: [{ dia: 5, sinRadar: true }] })).rejects.toMatchObject({ status: 409 });
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
      miRadar: { encendido: true, hoy: '2026-10-29', dias: [diaDelServidor(4)] },
    });
    const pagina = await obtenerHistorial();
    expect(pagina.entries.map(e => e.horaPrevista)).toEqual([14, null]);
    expect(pagina.miRadar?.dias).toHaveLength(1);
    expect(pagina.miRadar?.dias[0]).toMatchObject({ dia: 4, despertar: '05:30', dormir: '22:30', veces: 17 });
    expect(pagina.nextCursor).toBe('2026-10-29T18:00:00Z');
  });

  it('un `miRadar` con la forma de un backend anterior (horas a mano) se pierde SOLO él', async () => {
    mockApiFetch.mockResolvedValueOnce({ entries: [registro], nextCursor: null, miRadar: { encendido: true, horas: [9, 14, 20] } });
    const pagina = await obtenerHistorial();
    expect(pagina.entries).toHaveLength(1);
    expect(pagina.miRadar).toBeNull();
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
