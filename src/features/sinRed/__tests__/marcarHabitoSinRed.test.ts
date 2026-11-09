/** Spec 048 (FR-010, FR-011, FR-014): marcar un hábito sin señal lo guarda en la cola con la hora real y se ve hecho al instante. */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockPedidos: Array<{ ruta: string; body: unknown }> = [];
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
    apiFetch: jest.fn(async (ruta: string, op?: { body?: unknown }) => {
      if (!mockRed.hay) throw new ApiError(0, 'sin red');
      mockPedidos.push({ ruta, body: op?.body });
      return { id: 'r1', estado: 'COMPLETADO', puntosOtorgados: 10, respuestaTexto: null, completadoEn: '2026-11-09T21:10:00Z' };
    }),
  };
});
const mockTrack = { id: 'r1', habitoId: 'h-escritura', fechaEjecucion: '2026-11-09', estado: 'PENDIENTE' };
jest.mock('../../habits/api/registroVigente', () => {
  const real = jest.requireActual('../../habits/api/registroVigente') as Record<string, unknown>;
  return { ...real, ejecutarEnRegistroVigente: jest.fn(async (_id: string, escribir: (t: unknown) => Promise<unknown>) => escribir(mockTrack)) };
});
jest.mock('../horaReal', () => ({ horaReal: jest.fn(() => ({ instante: new Date(2026, 10, 9, 21, 10), origen: 'RELOJ_DEL_SISTEMA' })) }));

import { alCumplirUnHabito, alMarcarSinRed } from '../../habits/eventos/habitoCumplido';
import { completarRegistro, conMarcadosSinRed } from '../../habits/api/evidenciaHabitoApi';
import { DiaDeHabitosCambiadoError } from '../../habits/api/registroVigente';
import { leerCola, ponerCuentaActual, procesarCola } from '../colaSinRed';
import { guardarLectura, leerLectura } from '../lecturasGuardadas';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockRed.hay = false;
  mockTrack.fechaEjecucion = '2026-11-09';
  ponerCuentaActual('ana');
});

describe('marcar un hábito sin señal (spec 048)', () => {
  it('queda hecho al instante, calla sus alarmas y espera en la cola con la hora real', async () => { // spec 048 FR-011 FR-007
    const marcados: string[] = [];
    const celebrados: string[] = [];
    const q1 = alMarcarSinRed(m => void marcados.push(String(m.habitoId)));
    const q2 = alCumplirUnHabito(c => void celebrados.push(c.registroId));

    const r = await completarRegistro('r1', 'Lo hice en el campo');

    expect(r.estado).toBe('COMPLETADO');
    expect(marcados).toEqual(['h-escritura']);
    expect(celebrados).toEqual([]); // la celebración sale con la respuesta del servidor (D12)
    const [envio] = await leerCola('ana');
    expect(envio.datos).toMatchObject({ registroId: 'r1', respuestaTexto: 'Lo hice en el campo' });
    q1();
    q2();
  });

  it('un hábito de un día que ya terminó no se marca sin señal, igual que con señal', async () => { // spec 048 FR-010
    mockTrack.fechaEjecucion = '2026-11-08';
    await expect(completarRegistro('r1')).rejects.toBeInstanceOf(DiaDeHabitosCambiadoError);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('al volver la señal se envía con la hora real y su id, y recién ahí celebra con los puntos', async () => { // spec 048 FR-014
    await completarRegistro('r1');
    const celebrados: number[] = [];
    const desdeLaCola: unknown[] = [];
    const q = alCumplirUnHabito(c => {
      celebrados.push(c.puntosOtorgados);
      desdeLaCola.push(c.desdeLaCola);
    });
    mockRed.hay = true;

    expect(await procesarCola('ana')).toBe(0);

    expect(mockPedidos[0].ruta).toBe('/api/v1/habit-tracks/r1/complete');
    expect(mockPedidos[0].body).toMatchObject({ origenDeLaHora: 'RELOJ_DEL_SISTEMA', idCliente: expect.any(String), hechoEn: expect.any(String) });
    expect(celebrados).toEqual([10]);
    expect(desdeLaCola).toEqual([true]); // Entrenar se relee para mostrar los puntos (E2E 09/11)
    q();
  });
});

describe('lo marcado sin señal se sigue viendo hecho (E2E 09/11)', () => {
  it('una relectura que todavía dice PENDIENTE muestra COMPLETADO lo que espera en la cola', () => { // spec 048 FR-011
    const hoy = [{ id: 'r1', estado: 'PENDIENTE', titulo: 'Despertar' }, { id: 'r2', estado: 'PENDIENTE' }];
    expect(conMarcadosSinRed(hoy, new Set(['r1']))).toEqual([
      { id: 'r1', estado: 'COMPLETADO', titulo: 'Despertar' },
      { id: 'r2', estado: 'PENDIENTE' },
    ]);
  });
  it('al confirmarse, lo guardado de Entrenar dice hecho: sin señal no vuelve a verse pendiente', async () => { // spec 048 FR-011
    await guardarLectura('tok', '/api/v1/habit-tracks/day?fecha=2026-11-09', [{ ...mockTrack }]);
    await completarRegistro('r1', 'Lo hice en el campo');
    mockRed.hay = true;
    await procesarCola('ana', Date.now() + 60_000, { adelantar: true });

    expect(await leerCola('ana')).toEqual([]);
    const guardado = (await leerLectura('tok', '/api/v1/habit-tracks/day?fecha=2026-11-09')) as Array<{ estado: string }>;
    expect(guardado[0].estado).toBe('COMPLETADO');
  });
});
