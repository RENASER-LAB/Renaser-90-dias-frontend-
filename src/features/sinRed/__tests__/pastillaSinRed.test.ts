/**
 * Spec 048 (D2, FR-007, FR-010, FR-011): la Pastilla Renacer entregada sin señal (auditoría del 2026-11-10). Antes
 * `POST /spirit-audio/submit` no pasaba por la cola: sin señal el modal mostraba un error crudo y no se podía entregar.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockPedidos: Array<{ ruta: string; body: unknown }> = [];
const mockRed: { hay: boolean; rechazo: { status: number; mensaje: string } | null } = { hay: false, rechazo: null };
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
      if (mockRed.rechazo) throw new ApiError(mockRed.rechazo.status, mockRed.rechazo.mensaje);
      return { onTime: true };
    }),
  };
});
jest.mock('../horaReal', () => ({ horaReal: jest.fn(() => ({ instante: new Date(2026, 10, 9, 10, 15), origen: 'RELOJ_DEL_SISTEMA' })) }));

import { DiaDeHabitosCambiadoError } from '../../habits/api/registroVigente';
import { entregarResumenEspiritu } from '../../spirit/api/spiritApi';
import { leerAvisos } from '../avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola } from '../colaSinRed';
import { aplicarAjustesDeLectura, guardarLectura, leerLectura } from '../lecturasGuardadas';

const CONTEXTO = { registroId: 'r-pastilla', fecha: '2026-11-09' };
const ESTADO = { currentDay: 3, days: [{ day: 3, state: 'current', summaryText: null, submittedAt: null }] };

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockRed.hay = false;
  mockRed.rechazo = null;
  ponerCuentaActual('ana');
});

describe('la Pastilla Renacer sin señal (spec 048)', () => {
  it('se entrega sin señal: espera en la cola con la hora real y se ve hecha al instante', async () => { // spec 048 FR-007 FR-011
    const r = await entregarResumenEspiritu(3, 'Entendí que la calma se entrena', CONTEXTO);

    expect(r).toMatchObject({ pendienteDeEnvio: true });
    const [envio] = await leerCola('ana');
    expect(envio).toMatchObject({ tipo: 'entregarPastilla', origenDeLaHora: 'RELOJ_DEL_SISTEMA' });
    expect(envio.datos).toEqual({ day: 3, summaryText: 'Entendí que la calma se entrena', registroId: 'r-pastilla' });
    const hoy = (await aplicarAjustesDeLectura('/api/v1/habit-tracks/today', [{ id: 'r-pastilla', estado: 'PENDIENTE' }])) as Array<{ estado: string }>;
    expect(hoy[0].estado).toBe('COMPLETADO');
    const estado = (await aplicarAjustesDeLectura('/api/v1/spirit-audio/status', ESTADO)) as typeof ESTADO;
    expect(estado.days[0]).toMatchObject({ state: 'submitted', summaryText: 'Entendí que la calma se entrena' });
  });

  it('entregarla dos veces sin señal deja una sola entrega en la cola', async () => { // spec 048 FR-007
    await entregarResumenEspiritu(3, 'Primera', CONTEXTO);
    await entregarResumenEspiritu(3, 'Segunda', CONTEXTO);
    expect(await leerCola('ana')).toHaveLength(1);
  });

  it('la de un día que ya terminó no se entrega sin señal, igual que con señal', async () => { // spec 048 FR-010
    await expect(entregarResumenEspiritu(3, 'Tarde', { ...CONTEXTO, fecha: '2026-11-08' })).rejects.toBeInstanceOf(DiaDeHabitosCambiadoError);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('al volver la señal se manda una vez y lo guardado dice entregada', async () => { // spec 048 FR-007 FR-011
    await guardarLectura('tok', '/api/v1/spirit-audio/status', ESTADO);
    await guardarLectura('tok', '/api/v1/habit-tracks/today', [{ id: 'r-pastilla', estado: 'PENDIENTE' }]);
    await entregarResumenEspiritu(3, 'Entendí que la calma se entrena', CONTEXTO);
    mockRed.hay = true;

    expect(await procesarCola('ana')).toBe(0);

    // El endpoint solo recibe `day` y `summaryText` (sin hora real: límite documentado en pastillaSinRed.ts).
    expect(mockPedidos).toEqual([{ ruta: '/api/v1/spirit-audio/submit', body: { day: 3, summaryText: 'Entendí que la calma se entrena' } }]);
    const estado = (await leerLectura('tok', '/api/v1/spirit-audio/status')) as typeof ESTADO;
    expect(estado.days[0].state).toBe('submitted');
    const hoy = (await leerLectura('tok', '/api/v1/habit-tracks/today')) as Array<{ estado: string }>;
    expect(hoy[0].estado).toBe('COMPLETADO');
  });

  it('si el primer envío llegó y se perdió la respuesta, el 409 «ENVIADO» del reintento la da por entregada', async () => {
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Ya se registró este día (enviado o vencido): ENVIADO' };

    expect(await procesarCola('ana')).toBe(0);
  });

  it('si llegó cuando el día ya venció, no se da por entregada: sale de la cola y avisa con el motivo y lo que escribiste (#180)', async () => { // spec 048 FR-016
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Ya se registró este día (enviado o vencido): PERDIDO' };

    expect(await procesarCola('ana')).toBe(0);
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-se-pudo', etiqueta: 'Tu Pastilla Renacer', texto: 'Texto' });
    expect(aviso.motivo).toMatch(/PERDIDO/);
  });
});
