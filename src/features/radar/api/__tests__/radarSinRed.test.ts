/**
 * Spec 048, fase 3 (FR-019, D13, D14, P4, P5): el Código Renaser y Mi Radar sin señal. Se guardan con la hora real, la hora queda
 * respondida al instante y, si el servidor se queda con lo suyo, el aviso muestra lo que la persona escribió.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockPedidos: Array<{ ruta: string; metodo?: string; body?: unknown; cabeceras?: Record<string, string> }> = [];
const mockRed: { hay: boolean; rechazo: { status: number; mensaje: string; codigo?: string } | null } = { hay: false, rechazo: null };
jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, m: string, body?: unknown) {
      super(m);
      this.status = status;
      this.body = body;
    }
    get esDeRed() {
      return this.status === 0;
    }
    get codigo() {
      return (this.body as { codigo?: string } | null)?.codigo ?? null;
    }
  }
  return {
    ApiError,
    apiFetch: jest.fn(async (ruta: string, op?: { method?: string; body?: unknown; cabeceras?: Record<string, string> }) => {
      if (!mockRed.hay) throw new ApiError(0, 'sin red');
      mockPedidos.push({ ruta, metodo: op?.method, body: op?.body, cabeceras: op?.cabeceras });
      if (mockRed.rechazo) throw new ApiError(mockRed.rechazo.status, mockRed.rechazo.mensaje, { codigo: mockRed.rechazo.codigo });
      return { id: 'r-servidor', createdAt: '2026-11-10T15:10:00Z', whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', energyLevel: 7, whatAmIAvoiding: 'd' };
    }),
  };
});
jest.mock('../../../sinRed/horaReal', () => ({
  horaReal: jest.fn(() => ({ instante: new Date(2026, 10, 10, 10, 20), origen: 'RELOJ_DEL_SISTEMA' })),
}));

import { leerAvisos } from '../../../sinRed/avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola } from '../../../sinRed/colaSinRed';
import { aplicarAjustesDeLectura, esLecturaGuardable } from '../../../sinRed/lecturasGuardadas';
import type { CheckInRadarApi, HistorialRadarApi, MiRadarApi } from '../../types/radar.types';
import { guardarMiRadar, registrarCheckIn } from '../radarApi';
import { resumenDelCodigo } from '../radarSinRed';

const CHECK_IN: CheckInRadarApi = {
  whatAmIDoing: 'En mi oficina',
  whatAmIThinking: 'En la propuesta',
  whatAmIFeeling: 'Tranquilo',
  energyLevel: 7,
  whatAmIAvoiding: 'Una llamada',
};
const MI_RADAR: MiRadarApi = {
  encendido: false,
  hoy: '2026-11-10',
  dias: [{ dia: 3, fecha: '2026-11-11', modo: 'AUTOMATICO', veces: 8, maximo: 8, sinRadar: false, editable: true, despertar: '06:00', dormir: '22:00', horas: [7, 8], motivo: null }],
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockRed.hay = false;
  mockRed.rechazo = null;
  ponerCuentaActual('ana');
});

describe('Código Renaser sin señal (spec 048 fase 3)', () => {
  it('se encola con la hora real y la hora queda respondida al instante (últimos y historia)', async () => { // spec 048 FR-019
    const r = await registrarCheckIn(CHECK_IN);
    const [envio] = await leerCola('ana');

    expect(envio.datos).toMatchObject({ area: 'radar', metodo: 'POST', ruta: '/api/v1/radar', cuerpo: CHECK_IN, etiqueta: 'Código Renaser de las 10:00' });
    expect(r.createdAt).toBe(envio.hechoEn);
    expect(r.id.startsWith('pendiente:')).toBe(true);

    expect(await aplicarAjustesDeLectura('/api/v1/radar/latest', { createdAt: null })).toEqual({ createdAt: envio.hechoEn });
    // Lo que el servidor ya tenía, si es más nuevo, no se pisa.
    const masNuevo = '2026-11-10T23:00:00.000Z';
    expect(await aplicarAjustesDeLectura('/api/v1/radar/latest', { createdAt: masNuevo })).toEqual({ createdAt: masNuevo });
    const historia = (await aplicarAjustesDeLectura('/api/v1/radar/history', { entries: [], nextCursor: null })) as HistorialRadarApi;
    expect(historia.entries).toHaveLength(1);
    expect(historia.entries[0]).toMatchObject({ whatAmIDoing: 'En mi oficina', createdAt: envio.hechoEn });
    // La segunda página no se toca.
    const pagina2 = { entries: [], nextCursor: null };
    expect(await aplicarAjustesDeLectura('/api/v1/radar/history?cursor=2026-11-09T10:00:00Z', pagina2)).toBe(pagina2);
  });

  it('con señal sale como siempre', async () => { // spec 048 FR-019
    mockRed.hay = true;
    const r = await registrarCheckIn(CHECK_IN);
    expect(r.id).toBe('r-servidor');
    expect(mockPedidos[0].cabeceras).toBeUndefined();
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('si esa hora ya estaba respondida en el servidor, gana la del servidor y el aviso muestra lo que escribiste (P4)', async () => { // spec 048 FR-019
    await registrarCheckIn(CHECK_IN);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto ya estaba hecho en tu cuenta. Se quedó lo que ya había.', codigo: 'YA_ESTABA_HECHO' };

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-aplicado', etiqueta: 'Código Renaser de las 10:00', codigo: 'YA_ESTABA_HECHO' });
    expect(aviso.texto).toContain('En mi oficina');
    expect(aviso.texto).toContain('Una llamada');
  });

  it('si ya no corresponde (Mi Radar no tenía esa hora), no se aplica y el aviso trae el texto (P5)', async () => { // spec 048 FR-019
    await registrarCheckIn(CHECK_IN);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Mi Radar no tenía esa hora para ti, así que no se guardó ese Código Renaser.', codigo: 'MI_RADAR_NO_APLICA' };

    await procesarCola('ana', Date.now(), { adelantar: true });
    const [aviso] = await leerAvisos('ana');
    expect(aviso.codigo).toBe('MI_RADAR_NO_APLICA');
    expect(aviso.texto).toContain('En la propuesta');
  });

  it('las preguntas van con lo escrito en el resumen del aviso', () => { // spec 048 FR-019
    const resumen = resumenDelCodigo(CHECK_IN);
    expect(resumen).toContain('¿Qué estoy pensando? En la propuesta');
    expect(resumen).toContain('7');
  });

  it('Mi Radar: lo pedido se ve al instante; sin la semana a la vista, falla como siempre', async () => { // spec 048 FR-019
    const r = await guardarMiRadar({ encendido: true, dias: [{ dia: 3, modo: 'PERSONALIZADO', veces: 3 }] }, MI_RADAR);
    expect(r.encendido).toBe(true);
    expect(r.dias[0]).toMatchObject({ modo: 'PERSONALIZADO', veces: 3 });
    const leido = (await aplicarAjustesDeLectura('/api/v1/radar/mi-radar', MI_RADAR)) as MiRadarApi;
    expect(leido.encendido).toBe(true);
    expect(leido.dias[0].veces).toBe(3);

    await expect(guardarMiRadar({ encendido: false }, null)).rejects.toMatchObject({ status: 0 });
  });

  it('las lecturas de Radar se guardan para verse sin señal, y la historia solo en su primera página', () => { // spec 048 FR-004
    expect(esLecturaGuardable('/api/v1/radar/mi-radar')).toBe(true);
    expect(esLecturaGuardable('/api/v1/radar/latest')).toBe(true);
    expect(esLecturaGuardable('/api/v1/radar/history')).toBe(true);
    expect(esLecturaGuardable('/api/v1/radar/history?cursor=2026-11-09T10:00:00Z')).toBe(false);
  });
});
