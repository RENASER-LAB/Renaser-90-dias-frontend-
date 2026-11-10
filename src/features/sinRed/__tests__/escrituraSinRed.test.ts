/**
 * Spec 048, fase 3 (FR-019, D13, D14): la escritura genérica. Con señal sale como siempre; sin señal se guarda en la cola con la hora
 * real y se ve la respuesta optimista; sale con las tres cabeceras; y el orden se respeta.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
type Pedido = { ruta: string; metodo?: string; body?: unknown; cabeceras?: Record<string, string> };
const mockPedidos: Pedido[] = [];
const mockRed: { hay: boolean; rechazo: { status: number; mensaje: string; codigo?: string } | null } = { hay: true, rechazo: null };
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
      return (this.body as { codigo?: string } | null)?.codigo ?? null;
    }
  }
  return {
    ApiError,
    apiFetch: jest.fn(async (ruta: string, op?: { method?: string; body?: unknown; cabeceras?: Record<string, string> }) => {
      if (!mockRed.hay) throw new ApiError(0, 'sin red');
      mockPedidos.push({ ruta, metodo: op?.method, body: op?.body, cabeceras: op?.cabeceras });
      if (mockRed.rechazo) throw new ApiError(mockRed.rechazo.status, mockRed.rechazo.mensaje, { codigo: mockRed.rechazo.codigo });
      return { ok: true, ruta };
    }),
  };
});
jest.mock('../horaReal', () => ({
  horaReal: jest.fn(() => ({ instante: new Date('2026-11-10T02:40:13.250Z'), origen: 'RELOJ_DEL_SISTEMA' })),
}));

import { ApiError } from '../../../services/http/apiClient';
import { leerAvisos } from '../avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola } from '../colaSinRed';
import { alTerminarEnvioDe, escribirOEncolar, escriturasEsperando, type EscrituraSinRed } from '../escrituraSinRed';

const ESCRITURA: EscrituraSinRed = { area: 'cierre', etiqueta: 'Tu cierre del día', metodo: 'PUT', ruta: '/api/v1/rocks/day-closure', cuerpo: { fecha: '2026-11-09' }, resumen: 'mi nota' };
const AJUSTE = { validar: (r: unknown) => ({ de: 'servidor', r }), optimista: () => ({ de: 'optimista', r: null }) };

beforeEach(async () => {
  await AsyncStorage.clear();
  mockPedidos.length = 0;
  mockRed.hay = true;
  mockRed.rechazo = null;
  ponerCuentaActual('ana');
});

describe('escribirOEncolar (spec 048 fase 3)', () => {
  it('con señal sale como siempre, sin cabeceras, y devuelve lo del servidor', async () => { // spec 048 FR-019
    const r = await escribirOEncolar(ESCRITURA, AJUSTE);
    expect(r.de).toBe('servidor');
    expect(mockPedidos).toEqual([{ ruta: '/api/v1/rocks/day-closure', metodo: 'PUT', body: { fecha: '2026-11-09' }, cabeceras: undefined }]);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('sin señal se guarda con la hora real y devuelve la respuesta optimista', async () => { // spec 048 FR-019
    mockRed.hay = false;
    const r = await escribirOEncolar(ESCRITURA, AJUSTE);
    expect(r.de).toBe('optimista');
    const [envio] = await leerCola('ana');
    expect(envio).toMatchObject({ tipo: 'escritura', hechoEn: '2026-11-10T02:40:13.250Z', origenDeLaHora: 'RELOJ_DEL_SISTEMA' });
    expect(envio.datos).toMatchObject({ area: 'cierre', metodo: 'PUT', ruta: '/api/v1/rocks/day-closure', resumen: 'mi nota' });
  });

  it('un 4xx del servidor se dice como siempre: no se guarda en la cola', async () => { // spec 048 FR-019
    mockRed.rechazo = { status: 400, mensaje: 'Cuenta qué pasó con «X».' };
    await expect(escribirOEncolar(ESCRITURA, AJUSTE)).rejects.toThrow('Cuenta qué pasó con «X».');
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('sin cuenta en la sesión no hay dónde guardarlo: sube el error de red', async () => { // spec 048 FR-019
    ponerCuentaActual(null);
    mockRed.hay = false;
    await expect(escribirOEncolar(ESCRITURA, AJUSTE)).rejects.toBeInstanceOf(ApiError);
  });

  it('las reglas de la app corren antes de guardar: si no se cumplen, no se encola', async () => { // spec 048 FR-010
    mockRed.hay = false;
    const antesDeEncolar = jest.fn(() => {
      throw new Error('Ese día ya terminó.');
    });
    await expect(escribirOEncolar(ESCRITURA, { ...AJUSTE, antesDeEncolar })).rejects.toThrow('Ese día ya terminó.');
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('al volver la señal sale con las tres cabeceras y sale de la cola', async () => { // spec 048 FR-019
    mockRed.hay = false;
    await escribirOEncolar(ESCRITURA, AJUSTE);
    const [envio] = await leerCola('ana');
    mockRed.hay = true;

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    expect(mockPedidos[0].cabeceras).toEqual({
      'X-Id-Cliente': envio.idCliente,
      'X-Hecho-En': '2026-11-10T02:40:13.250Z',
      'X-Origen-De-La-Hora': 'RELOJ_DEL_SISTEMA',
    });
    expect(mockPedidos[0]).toMatchObject({ ruta: '/api/v1/rocks/day-closure', metodo: 'PUT', body: { fecha: '2026-11-09' } });
  });

  it('el orden se respeta: con una escritura esperando, la nueva se pone detrás aunque haya señal', async () => { // spec 048 FR-019
    mockRed.hay = false;
    await escribirOEncolar({ ...ESCRITURA, ruta: '/primera' }, AJUSTE);
    mockRed.hay = true;
    const r = await escribirOEncolar({ ...ESCRITURA, ruta: '/segunda' }, AJUSTE);
    await new Promise(res => setTimeout(res, 30));

    expect(r.de).toBe('optimista');
    expect(mockPedidos.map(p => p.ruta)).toEqual(['/primera', '/segunda']);
    expect(await leerCola('ana')).toHaveLength(0);
  });

  it('un 409 con codigo: el servidor se queda con lo suyo, sale de la cola y avisa con lo que escribiste', async () => { // spec 048 FR-019
    mockRed.hay = false;
    await escribirOEncolar(ESCRITURA, AJUSTE);
    mockRed.hay = true;
    mockRed.rechazo = { status: 409, mensaje: 'Esto cambió en tu cuenta después de que lo hiciste sin conexión. Se quedó lo más nuevo.', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR' };

    expect(await procesarCola('ana', Date.now(), { adelantar: true })).toBe(0);
    const [aviso] = await leerAvisos('ana');
    expect(aviso).toMatchObject({ tipo: 'no-aplicado', etiqueta: 'Tu cierre del día', codigo: 'CAMBIO_MAS_NUEVO_EN_EL_SERVIDOR', texto: 'mi nota' });
  });

  it('las pantallas se enteran cuando algo de su área sale de la cola, y solo de su área', async () => { // spec 048 FR-019
    const delCierre = jest.fn();
    const delPlan = jest.fn();
    const q1 = alTerminarEnvioDe('cierre', delCierre);
    const q2 = alTerminarEnvioDe('plan', delPlan);
    mockRed.hay = false;
    await escribirOEncolar(ESCRITURA, AJUSTE);
    mockRed.hay = true;
    await procesarCola('ana', Date.now(), { adelantar: true });
    q1();
    q2();

    expect(delCierre).toHaveBeenCalledTimes(1);
    expect(delPlan).not.toHaveBeenCalled();
  });

  it('lo que espera de un área se puede leer en orden para los ajustes de lectura', async () => { // spec 048 FR-019
    mockRed.hay = false;
    await escribirOEncolar({ ...ESCRITURA, ruta: '/a' }, AJUSTE);
    await escribirOEncolar({ ...ESCRITURA, area: 'plan', ruta: '/b' }, AJUSTE);
    await escribirOEncolar({ ...ESCRITURA, ruta: '/c' }, AJUSTE);

    expect((await escriturasEsperando('cierre')).map(e => e.ruta)).toEqual(['/a', '/c']);
  });
});
