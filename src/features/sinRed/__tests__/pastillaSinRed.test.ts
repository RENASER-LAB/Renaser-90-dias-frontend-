/**
 * Spec 048 (D2, FR-007, FR-010, FR-011): la Pastilla Renacer entregada sin señal (auditoría del 2026-11-10). Antes
 * `POST /spirit-audio/submit` no pasaba por la cola: sin señal el modal mostraba un error crudo y no se podía entregar.
 *
 * Issue #186: al volver la señal sale con las tres cabeceras de lo hecho sin señal (la hora real y el `idCliente`), y lo que el servidor
 * no aplica o aplica sin puntos se avisa como en las demás áreas.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const mockPedidos: Array<{ ruta: string; body: unknown; cabeceras: Record<string, string> | undefined }> = [];
const mockRed: {
  hay: boolean;
  rechazo: { status: number; mensaje: string; codigo?: string } | null;
  respuesta: Record<string, unknown>;
} = { hay: false, rechazo: null, respuesta: { onTime: true } };
jest.mock('../../../services/http/apiClient', () => {
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
      const c = (this.body as { codigo?: unknown } | undefined)?.codigo;
      return typeof c === 'string' ? c : null;
    }
  }
  return {
    ApiError,
    apiFetch: jest.fn(async (ruta: string, op?: { body?: unknown; cabeceras?: Record<string, string> }) => {
      if (!mockRed.hay) throw new ApiError(0, 'sin red');
      mockPedidos.push({ ruta, body: op?.body, cabeceras: op?.cabeceras });
      if (mockRed.rechazo) {
        const { status, mensaje, codigo } = mockRed.rechazo;
        throw new ApiError(status, mensaje, codigo ? { message: mensaje, codigo } : undefined);
      }
      return mockRed.respuesta;
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
  mockRed.respuesta = { onTime: true };
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

  it('al volver la señal se manda una vez, con la hora real y el idCliente en las tres cabeceras, y lo guardado dice entregada', async () => { // spec 048 FR-007 FR-010 FR-011
    await guardarLectura('tok', '/api/v1/spirit-audio/status', ESTADO);
    await guardarLectura('tok', '/api/v1/habit-tracks/today', [{ id: 'r-pastilla', estado: 'PENDIENTE' }]);
    await entregarResumenEspiritu(3, 'Entendí que la calma se entrena', CONTEXTO);
    const [envio] = await leerCola('ana');
    mockRed.hay = true;

    expect(await procesarCola('ana')).toBe(0);

    // La hora real es la de las 10:15 en que la persona la entregó, no la de ahora: así el servidor la cuenta a tiempo aunque llegue después (#186).
    expect(mockPedidos).toEqual([
      {
        ruta: '/api/v1/spirit-audio/submit',
        body: { day: 3, summaryText: 'Entendí que la calma se entrena' },
        cabeceras: {
          'X-Id-Cliente': envio.idCliente,
          'X-Hecho-En': new Date(2026, 10, 9, 10, 15).toISOString(),
          'X-Origen-De-La-Hora': 'RELOJ_DEL_SISTEMA',
        },
      },
    ]);
    const estado = (await leerLectura('tok', '/api/v1/spirit-audio/status')) as typeof ESTADO;
    expect(estado.days[0].state).toBe('submitted');
    const hoy = (await leerLectura('tok', '/api/v1/habit-tracks/today')) as Array<{ estado: string }>;
    expect(hoy[0].estado).toBe('COMPLETADO');
  });

  it('un reintento (llegó pero se perdió la respuesta) sale con el MISMO idCliente: el servidor la registra una sola vez', async () => { // spec 048 FR-008
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;
    mockRed.rechazo = { status: 0, mensaje: 'se cortó antes de la respuesta' };
    await procesarCola('ana');
    expect(await leerCola('ana')).toHaveLength(1);

    mockRed.rechazo = null;
    expect(await procesarCola('ana', Date.now() + 3_600_000)).toBe(0);

    expect(mockPedidos).toHaveLength(2);
    expect(mockPedidos[1].cabeceras?.['X-Id-Cliente']).toBe(mockPedidos[0].cabeceras?.['X-Id-Cliente']);
    expect(mockPedidos[1].cabeceras?.['X-Hecho-En']).toBe(mockPedidos[0].cabeceras?.['X-Hecho-En']);
    expect(await leerAvisos('ana')).toHaveLength(0);
  });

  it('si el servidor ya la tenía entregada (409 YA_ESTABA_HECHO) sale de la cola, avisa con su motivo y lo que escribiste, y lo guardado dice entregada', async () => { // spec 048 FR-016
    await guardarLectura('tok', '/api/v1/spirit-audio/status', ESTADO);
    await guardarLectura('tok', '/api/v1/habit-tracks/today', [{ id: 'r-pastilla', estado: 'PENDIENTE' }]);
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto ya estaba hecho en tu cuenta. Se quedó lo que ya había.', codigo: 'YA_ESTABA_HECHO' };

    expect(await procesarCola('ana')).toBe(0);

    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({
      tipo: 'no-aplicado',
      codigo: 'YA_ESTABA_HECHO',
      etiqueta: 'Tu Pastilla Renacer',
      texto: 'Texto',
      motivo: 'Esto ya estaba hecho en tu cuenta. Se quedó lo que ya había.',
    });
    // El servidor SÍ la tiene entregada: sin señal no tiene que volver a verse pendiente.
    expect(((await leerLectura('tok', '/api/v1/spirit-audio/status')) as typeof ESTADO).days[0].state).toBe('submitted');
    expect(((await leerLectura('tok', '/api/v1/habit-tracks/today')) as Array<{ estado: string }>)[0].estado).toBe('COMPLETADO');
  });

  it('si el día ya cerró al llegar (409 FUERA_DE_SU_DIA) avisa con lo que escribiste y lo guardado NO dice entregada', async () => { // spec 048 FR-016
    await guardarLectura('tok', '/api/v1/spirit-audio/status', ESTADO);
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto era de un día que ya terminó y no se pudo aplicar.', codigo: 'FUERA_DE_SU_DIA' };

    expect(await procesarCola('ana')).toBe(0);

    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-aplicado', codigo: 'FUERA_DE_SU_DIA', texto: 'Texto' });
    expect(aviso.motivo).toMatch(/día que ya terminó/);
    expect(((await leerLectura('tok', '/api/v1/spirit-audio/status')) as typeof ESTADO).days[0].state).toBe('current');
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('si el hábito quedó sin puntos (más de 48 h o hora futura) la entrega cuenta y la hoja de avisos lo dice con su motivo', async () => { // spec 048 FR-015
    await guardarLectura('tok', '/api/v1/spirit-audio/status', ESTADO);
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;
    mockRed.respuesta = { onTime: true, motivoSinPuntos: 'LLEGO_DESPUES_DE_48_H' };

    expect(await procesarCola('ana')).toBe(0);

    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'sin-puntos', codigo: 'LLEGO_DESPUES_DE_48_H', etiqueta: 'Tu Pastilla Renacer' });
    expect(aviso.motivo).toMatch(/48 horas/);
    expect(((await leerLectura('tok', '/api/v1/spirit-audio/status')) as typeof ESTADO).days[0].state).toBe('submitted');
  });

  it('con una respuesta sin motivoSinPuntos no avisa nada: la entrega sumó sus puntos', async () => { // spec 048 FR-015
    await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
    mockRed.hay = true;

    expect(await procesarCola('ana')).toBe(0);

    expect(await leerAvisos('ana')).toHaveLength(0);
  });

  it('un servidor anterior (409 sin codigo, «…: PERDIDO» o «…: ENTREGADO») no se da por entregada: sale de la cola y avisa con el motivo y lo que escribiste (#180)', async () => { // spec 048 FR-016
    for (const estado of ['PERDIDO', 'ENTREGADO']) {
      await AsyncStorage.clear();
      mockRed.hay = false;
      mockRed.rechazo = null;
      await entregarResumenEspiritu(3, 'Texto', CONTEXTO);
      mockRed.hay = true;
      mockRed.rechazo = { status: 409, mensaje: `Ya se registró este día (enviado o vencido): ${estado}` };

      expect(await procesarCola('ana')).toBe(0);
      const [aviso] = await leerAvisos('ana');
      expect(aviso).toMatchObject({ tipo: 'no-se-pudo', etiqueta: 'Tu Pastilla Renacer', texto: 'Texto' });
      expect(aviso.motivo).toMatch(new RegExp(estado));
    }
  });
});
