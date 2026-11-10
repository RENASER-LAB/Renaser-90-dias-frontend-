/**
 * Spec 048, fase 3 (FR-019, D13, D14): planificar hábitos y alarmas sin señal. Se guarda con la hora real, la hoja lo ve al instante
 * (respuesta optimista y ajustes de lectura) y, al llegar, el servidor decide los choques.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
type Pedido = { ruta: string; metodo?: string; body?: unknown; cabeceras?: Record<string, string> };
const mockPedidos: Pedido[] = [];
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
      if (op?.method === 'PATCH' && ruta.startsWith('/api/v1/habit-preferences/')) return { habitId: 'h1', triggerTime: '06:30:00', limitTime: null, deferred: true, deferredEffectiveDate: '2026-11-11' };
      return undefined;
    }),
  };
});
jest.mock('../../../sinRed/horaReal', () => ({
  horaReal: jest.fn(() => ({ instante: new Date(2026, 10, 10, 21, 30), origen: 'RELOJ_DEL_SISTEMA' })),
}));

import { leerAvisos } from '../../../sinRed/avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola } from '../../../sinRed/colaSinRed';
import { _reiniciarConexion, marcarSinConexion } from '../../../sinRed/estadoDeConexion';
import { aplicarAjustesDeLectura, esLecturaGuardable } from '../../../sinRed/lecturasGuardadas';
import type { DiaDeLaSemanaApi, PlanDesbloqueosApi, PreferenciaHabitoApi } from '../../types/habits.types';
import * as habitsApi from '../habitsApi';

const PREFS = [{ habitId: 'h1', title: 'Despertar', triggerTime: '05:00:00', limitTime: null, customized: false }] as PreferenciaHabitoApi[];
const SEMANA = [
  { weekday: 'MONDAY', triggerTime: '05:00:00', limitTime: null, custom: false, active: true },
  { weekday: 'TUESDAY', triggerTime: '05:00:00', limitTime: null, custom: false, active: true },
] as DiaDeLaSemanaApi[];

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockRed.hay = false;
  mockRed.rechazo = null;
  // Lo que hace `apiFetch` de verdad cuando no hay respuesta: marca «sin conexión» (la cola no reintenta a cada escritura).
  _reiniciarConexion();
  marcarSinConexion();
  ponerCuentaActual('ana');
});

describe('planificar hábitos y alarmas sin señal (spec 048 fase 3)', () => {
  it('cambiar la hora se guarda, rige desde mañana (D-91) con la hora real y la lista lo muestra', async () => { // spec 048 FR-019
    const r = await habitsApi.cambiarHorario('h1', '06:30:00', null, { activo: true, minutosAntes: 10 });
    expect(r).toEqual({ deferred: true, deferredEffectiveDate: '2026-11-11' });

    const [envio] = await leerCola('ana');
    expect(envio.datos).toMatchObject({ area: 'habitos', metodo: 'PATCH', ruta: '/api/v1/habit-preferences/h1', resumen: 'Hora: 06:30' });
    expect(envio.datos.cuerpo).toMatchObject({ triggerTime: '06:30:00', reminderEnabled: true, reminderMinutesBefore: 10 });
    const lista = ((await aplicarAjustesDeLectura('/api/v1/habit-preferences', { habits: PREFS })) as { habits: PreferenciaHabitoApi[] }).habits;
    expect(lista[0]).toMatchObject({ triggerTime: '06:30:00', customized: true, reminderEnabled: true });
  });

  it('con señal sale como siempre y la respuesta es la del servidor', async () => { // spec 048 FR-019
    mockRed.hay = true;
    const r = await habitsApi.cambiarHorario('h1', '06:30:00', null, { activo: false, minutosAntes: null });
    expect(r).toMatchObject({ deferred: true, deferredEffectiveDate: '2026-11-11' });
    expect(mockPedidos[0].cabeceras).toBeUndefined();
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('la hora, el aviso y apagar un día de la semana se ven al instante en los siete días', async () => { // spec 048 FR-011
    await habitsApi.fijarHorarioDelDia('h1', 'MONDAY', '06:00:00', null);
    await habitsApi.fijarAvisoDelDia('h1', 'TUESDAY', true, [15, 0]);
    await habitsApi.apagarDiaDeLaSemana('h1', 'TUESDAY');

    const dias = (await aplicarAjustesDeLectura('/api/v1/habit-preferences/h1/weekdays', SEMANA)) as DiaDeLaSemanaApi[];
    expect(dias[0]).toMatchObject({ triggerTime: '06:00:00', custom: true });
    expect(dias[1]).toMatchObject({ reminderEnabled: true, reminderMinutesList: [15, 0], active: false });
    // Los días de otro hábito no se tocan.
    const otro = (await aplicarAjustesDeLectura('/api/v1/habit-preferences/h2/weekdays', SEMANA)) as DiaDeLaSemanaApi[];
    expect(otro[0].triggerTime).toBe('05:00:00');
    expect((await leerCola('ana')).map(e => e.datos.ruta)).toEqual([
      '/api/v1/habit-preferences/h1/weekdays/MONDAY',
      '/api/v1/habit-preferences/h1/weekdays/TUESDAY/reminder',
      '/api/v1/habit-preferences/h1/weekdays/TUESDAY/active',
    ]);
  });

  it('pausar, quitar y sumar un hábito al plan se ven al instante en el plan de desbloqueos', async () => { // spec 048 FR-011
    await habitsApi.cambiarEstadoHabito('h1', false, '2026-11-14');
    await habitsApi.quitarHabitoDelPlan('h2');
    await habitsApi.agregarHabitoAlPlan('h3');
    const plan: PlanDesbloqueosApi = {
      enabled: true,
      items: [
        { habitId: 'h1', unlockDay: 1, chosenAt: null, paused: false, pausedUntil: null },
        { habitId: 'h2', unlockDay: 1, chosenAt: null, paused: false, pausedUntil: null },
      ],
    };
    const leido = (await aplicarAjustesDeLectura('/api/v1/habit-unlocks', plan)) as PlanDesbloqueosApi;
    expect(leido.items.map(i => i.habitId)).toEqual(['h1', 'h3']);
    expect(leido.items[0]).toMatchObject({ paused: true, pausedUntil: '2026-11-14' });
  });

  it('al volver la señal salen en el mismo orden y con las tres cabeceras', async () => { // spec 048 FR-019
    await habitsApi.fijarHorarioDelDia('h1', 'MONDAY', '06:00:00', null);
    await habitsApi.fijarAlarmaGeneral('h1', { sonido: 'DEFAULT', vibracion: true, pantallaCompleta: false } as never).catch(() => undefined);
    const cola = await leerCola('ana');
    mockRed.hay = true;

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    expect(mockPedidos.map(p => p.ruta)).toEqual(cola.map(e => e.datos.ruta));
    expect(mockPedidos[0].cabeceras).toMatchObject({ 'X-Id-Cliente': cola[0].idCliente, 'X-Origen-De-La-Hora': 'RELOJ_DEL_SISTEMA' });
  });

  it('si cambió en su cuenta después de lo que hiciste, gana lo del servidor y se avisa; un hábito quitado también', async () => { // spec 048 FR-019
    await habitsApi.fijarHorarioDelDia('h1', 'MONDAY', '06:00:00', null);
    await habitsApi.quitarHabitoDelPlan('h2');
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto cambió en tu cuenta después de que lo hiciste sin conexión. Se quedó lo más nuevo.', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' };

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    const avisos = await leerAvisos('ana');
    expect(avisos).toHaveLength(2);
    expect(avisos[0]).toMatchObject({ tipo: 'no-aplicado', etiqueta: 'Tu hora de un día', texto: 'Hora: 06:00', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' });
  });

  it('un hábito propio nuevo sigue pidiendo señal: el servidor le pone el id con el que se planifica todo lo demás', async () => { // spec 048 FR-019
    await expect(habitsApi.crearHabitoPersonal({ title: 'Leer' } as never)).rejects.toMatchObject({ status: 0 });
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('las lecturas de planificar se guardan para verse sin señal', () => { // spec 048 FR-004
    expect(esLecturaGuardable('/api/v1/habit-preferences')).toBe(true);
    expect(esLecturaGuardable('/api/v1/habit-preferences/h1/weekdays')).toBe(true);
    expect(esLecturaGuardable('/api/v1/habit-preferences/h1/week?weekStart=2026-11-09')).toBe(true);
    expect(esLecturaGuardable('/api/v1/habit-preferences/week-repeat')).toBe(true);
    expect(esLecturaGuardable('/api/v1/habit-unlocks')).toBe(true);
  });

  it('Planificar ya no se envuelve en SoloConConexion: sin señal también se planifica', () => { // spec 048 FR-019
    const fuente = readFileSync(join(__dirname, '../../../training/components/PlanificarDimensionModal.tsx'), 'utf8');
    expect(fuente).not.toContain('<SoloConConexion>');
  });
});
