/**
 * Spec 048, fase 3 (FR-019, D13, D14, P1, P7): «Cierra tu día» sin señal. Con la red y la hora reemplazadas por dobles que anotan
 * cada pedido: se guarda con la hora real, el día queda cerrado al instante y llega con las tres cabeceras.
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
      return { fecha: '2026-11-09', estado: 'CERRADO', puedeCerrar: true, cerradoEn: '2026-11-10T02:40:00Z', nota: null, acciones: [], semana: null };
    }),
  };
});
const mockHora = { instante: new Date(2026, 10, 9, 21, 40) };
jest.mock('../../../sinRed/horaReal', () => ({
  horaReal: jest.fn(() => ({ instante: mockHora.instante, origen: 'RELOJ_DEL_SISTEMA' })),
}));

import { leerAvisos } from '../../../sinRed/avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola } from '../../../sinRed/colaSinRed';
import { aplicarAjustesDeLectura } from '../../../sinRed/lecturasGuardadas';
import { esRechazoPorDiaCerrado } from '../../../habits/api/registroVigente';
import type { CierreDelDia, CuerpoDelCierre } from '../../types/cierre.types';
import { guardarCierreDelDia } from '../cierreApi';
import { cierreConLoElegido, resumenDelCierre } from '../cierreSinRed';

const VISTA: CierreDelDia = {
  fecha: '2026-11-09',
  estado: 'ABIERTO',
  puedeCerrar: true,
  cerradoEn: null,
  nota: null,
  semana: { cumplidas: 3, planificadas: 5 },
  acciones: [
    { id: 'a1', titulo: 'Revisar las facturas', horaInicio: '10:00', cumplida: false, cumplidaEn: null, cierre: null, exigeRespuesta: true },
    { id: 'a2', titulo: 'Llamar a Luis', horaInicio: '11:00', cumplida: true, cumplidaEn: '2026-11-09T16:00:00Z', cierre: null, exigeRespuesta: false },
  ],
};
const CUERPO: CuerpoDelCierre = {
  fecha: '2026-11-09',
  acciones: [{ id: 'a1', motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Me ganó una reunión' }],
  nota: 'Día largo',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockRed.hay = false;
  mockRed.rechazo = null;
  mockHora.instante = new Date(2026, 10, 9, 21, 40);
  ponerCuentaActual('ana');
});

describe('Cierra tu día sin señal (spec 048 fase 3)', () => {
  it('sin señal queda cerrado al instante con lo elegido y espera en la cola con la hora real', async () => { // spec 048 FR-019
    const r = await guardarCierreDelDia(CUERPO, VISTA);

    expect(r.estado).toBe('CERRADO');
    expect(r.nota).toBe('Día largo');
    expect(r.acciones[0].cierre).toEqual({ motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Me ganó una reunión' });
    const [envio] = await leerCola('ana');
    expect(envio).toMatchObject({ tipo: 'escritura', origenDeLaHora: 'RELOJ_DEL_SISTEMA' });
    expect(envio.datos).toMatchObject({ area: 'cierre', metodo: 'PUT', ruta: '/api/v1/rocks/day-closure', cuerpo: CUERPO });
  });

  it('con señal sale como siempre, sin cola ni cabeceras', async () => { // spec 048 FR-019
    mockRed.hay = true;
    await guardarCierreDelDia(CUERPO, VISTA);
    expect(mockPedidos).toHaveLength(1);
    expect(mockPedidos[0].cabeceras).toBeUndefined();
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('el día se sigue viendo cerrado al releerlo mientras espera (ajuste de lectura)', async () => { // spec 048 FR-011
    await guardarCierreDelDia(CUERPO, VISTA);
    const leido = (await aplicarAjustesDeLectura('/api/v1/rocks/day-closure?date=2026-11-09', VISTA)) as CierreDelDia;
    expect(leido.estado).toBe('CERRADO');
    expect(leido.acciones[0].cierre?.motivo).toBe('SIN_TIEMPO');
    // Otro día no se toca.
    const otro = (await aplicarAjustesDeLectura('/api/v1/rocks/day-closure?date=2026-11-08', { ...VISTA, fecha: '2026-11-08' })) as CierreDelDia;
    expect(otro.estado).toBe('ABIERTO');
  });

  it('si la hora real ya es de otro día, no se guarda: se dice «ese día ya cerró» como con señal', async () => { // spec 048 FR-010
    mockHora.instante = new Date(2026, 10, 10, 0, 5);
    const error = await guardarCierreDelDia(CUERPO, VISTA).catch(e => e);
    expect(esRechazoPorDiaCerrado(error)).toBe(true);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('sin la hoja a la vista no hay cómo mostrarlo cerrado: falla como siempre', async () => { // spec 048 FR-019
    await expect(guardarCierreDelDia(CUERPO)).rejects.toMatchObject({ status: 0 });
  });

  it('al volver la señal sale con las tres cabeceras y el día de la hora real', async () => { // spec 048 FR-019
    await guardarCierreDelDia(CUERPO, VISTA);
    const [envio] = await leerCola('ana');
    mockRed.hay = true;

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    expect(mockPedidos[0].cabeceras).toEqual({
      'X-Id-Cliente': envio.idCliente,
      'X-Hecho-En': new Date(2026, 10, 9, 21, 40).toISOString(),
      'X-Origen-De-La-Hora': 'RELOJ_DEL_SISTEMA',
    });
    expect(mockPedidos[0].body).toEqual(CUERPO);
  });

  it('si el servidor se queda con lo suyo (cambio más nuevo), avisa con la nota y lo elegido (P7)', async () => { // spec 048 FR-019
    await guardarCierreDelDia(CUERPO, VISTA);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto cambió en tu cuenta después de que lo hiciste sin conexión. Se quedó lo más nuevo.', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' };

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-aplicado', etiqueta: 'Tu cierre de hoy', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' });
    expect(aviso.texto).toContain('Nota del día: Día largo');
    expect(aviso.texto).toContain('«Revisar las facturas»');
    expect(aviso.texto).toContain('Me ganó una reunión');
  });

  it('el resumen y el cierre armado usan solo lo que la persona eligió', () => {
    expect(cierreConLoElegido(VISTA, CUERPO, 'x').acciones[1]).toEqual(VISTA.acciones[1]);
    expect(resumenDelCierre({ fecha: '2026-11-09', acciones: [] }, VISTA)).toBe('');
  });
});
