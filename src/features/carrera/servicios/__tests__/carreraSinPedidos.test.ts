jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../../habits/eventos/habitoCumplido', () => ({ avisarHabitoCumplido: jest.fn() }));
jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, message: string, body?: unknown) {
      super(message);
      this.status = status;
      this.body = body;
    }
    get codigo() {
      const b = this.body as { codigo?: string } | undefined;
      return b?.codigo ?? null;
    }
  }
  return { ApiError, apiFetch: jest.fn() };
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch, ApiError } from '../../../../services/http/apiClient';
import { avisarHabitoCumplido } from '../../../habits/eventos/habitoCumplido';
import { puntoDestino } from '../../utils/geo';
import { cuerpoDeLaCarrera } from '../../utils/cuerpoDeLaCarrera';
import { CLAVE_CARRERA_EN_CURSO, leerCarreraEnCurso, tocaGuardar } from '../almacenCarrera';
import {
  cargarCarrera,
  carreraActual,
  cerrarCarrera,
  descartarCarrera,
  empezarCarrera,
  latido,
  recibirPasos,
  recibirPuntos,
  reiniciarParaPruebas,
} from '../carreraEnVivo';
import { encolarYEnviar, estadoDelEnvio, procesarCola } from '../colaDeCarreras';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchFalso = apiFetch as unknown as jest.Mock<(...a: any[]) => Promise<any>>;
const ORIGEN = { lat: -12.0464, lng: -77.0428 };
const T0 = 1_800_000_000_000;

function correr(segundos: number) {
  for (let i = 0; i <= segundos; i++) {
    recibirPuntos([{ ...puntoDestino(ORIGEN, 90, 3 * i), t: T0 + 1000 + i * 1000, precision: 5, velocidad: 3 }]);
    if (i % 2 === 0) recibirPasos(3, T0 + 1000 + i * 1000);
    latido(T0 + 1000 + i * 1000);
  }
}

const RESPUESTA = {
  carreraId: 'x',
  repetida: false,
  fecha: '2026-11-05',
  kilometros: 1.8,
  cuentaParaElHabito: true,
  porRevisar: false,
  habito: { resultado: 'CERRADO', registroId: 'reg-1', kilometrosDelDia: 1.8, origenDelDia: 'GPS', puntosOtorgados: 8 },
};

beforeEach(async () => {
  reiniciarParaPruebas();
  fetchFalso.mockReset();
  (avisarHabitoCumplido as unknown as jest.Mock).mockReset();
  await AsyncStorage.clear();
});

describe('una carrera no llama al servidor mientras dura', () => {
  // spec 042 FR-004, FR-016, SC-001
  it('cero pedidos durante 10 minutos de carrera y uno solo al terminar', async () => {
    empezarCarrera({ carreraId: '6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10', cuentaId: 'cuenta', pesoKg: 70, conPasos: true }, T0);
    correr(600);
    expect(fetchFalso).not.toHaveBeenCalled();

    fetchFalso.mockResolvedValue({ ...RESPUESTA, carreraId: '6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10' });
    const final = await cerrarCarrera(T0 + 602_000);
    await encolarYEnviar('cuenta', cuerpoDeLaCarrera(final!, T0 + 602_000, { guardarRuta: true }));
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/v1/carreras');
    expect((fetchFalso.mock.calls[0][1] as { body: { carreraId: string } }).body.carreraId).toBe('6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10');
    // spec 042 FR-027: cerrar el hábito avisa el cumplido de siempre.
    expect(avisarHabitoCumplido).toHaveBeenCalledWith(expect.objectContaining({ registroId: 'reg-1', puntosOtorgados: 8 }));
    expect(estadoDelEnvio('6f1c2c1e-3b1a-4c0a-9a55-2f0f8d1d7a10')?.tipo).toBe('respondida');
    // Ya enviada: procesar la cola de nuevo no manda nada más.
    await procesarCola('cuenta', true);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  // spec 042 FR-013
  it('descartar borra la carrera del teléfono y no envía nada', async () => {
    empezarCarrera({ carreraId: 'a', cuentaId: 'cuenta', pesoKg: 70, conPasos: false }, T0);
    correr(30);
    await descartarCarrera();
    expect(carreraActual()).toBeNull();
    expect(await AsyncStorage.getItem(CLAVE_CARRERA_EN_CURSO)).toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('sin red, la carrera espera en el teléfono', () => {
  // spec 042 FR-017, FR-019, SC-002
  it('se queda en la cola sin red y, al volver la señal, el reintento repetido es éxito sin duplicar', async () => {
    empezarCarrera({ carreraId: 'b', cuentaId: 'cuenta', pesoKg: 70, conPasos: false }, T0);
    correr(120);
    const final = await cerrarCarrera(T0 + 122_000);
    const cuerpo = cuerpoDeLaCarrera(final!, T0 + 122_000, { guardarRuta: false });

    fetchFalso.mockRejectedValueOnce(new ApiError(0, 'Sin conexión'));
    await encolarYEnviar('cuenta', cuerpo);
    expect(estadoDelEnvio('b')).toEqual({ tipo: 'en-cola', km: expect.any(String) });

    fetchFalso.mockResolvedValueOnce({ ...RESPUESTA, carreraId: 'b', repetida: true, habito: { ...RESPUESTA.habito, resultado: 'SIN_CAMBIO', puntosOtorgados: 0 } });
    const ahora = Date.now;
    Date.now = () => ahora() + 61_000;
    try {
      await procesarCola('cuenta', true);
    } finally {
      Date.now = ahora;
    }
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect((fetchFalso.mock.calls[1][1] as { body: unknown }).body).toEqual((fetchFalso.mock.calls[0][1] as { body: unknown }).body); // mismos bytes: misma huella
    expect(estadoDelEnvio('b')?.tipo).toBe('respondida');
    expect(avisarHabitoCumplido).not.toHaveBeenCalled(); // una respuesta repetida no vuelve a celebrar
  });

  // spec 042 casos de borde: la cola es por cuenta
  it('la cola de una cuenta no sale con la sesión de otra', async () => {
    empezarCarrera({ carreraId: 'c', cuentaId: 'ana', pesoKg: 70, conPasos: false }, T0);
    correr(120);
    const final = await cerrarCarrera(T0 + 122_000);
    fetchFalso.mockRejectedValueOnce(new ApiError(0, 'Sin conexión'));
    await encolarYEnviar('ana', cuerpoDeLaCarrera(final!, T0 + 122_000, { guardarRuta: false }));
    fetchFalso.mockClear();
    await procesarCola('luis', true);
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('la carrera sobrevive a que Android mate la app', () => {
  // spec 042 FR-005
  it('se guarda como mucho cada 5 s o cada 10 puntos', () => {
    expect(tocaGuardar(10, 0)).toBe(true);
    expect(tocaGuardar(3, 5_000)).toBe(true);
    expect(tocaGuardar(3, 2_000)).toBe(false);
  });

  // spec 042 FR-006, SC-003
  it('al reabrir se retoma de esta cuenta con lo guardado (pérdida ≤ 5 s); la de otra cuenta no se muestra', async () => {
    empezarCarrera({ carreraId: 'd', cuentaId: 'cuenta', pesoKg: 70, conPasos: false }, T0);
    correr(90);
    const enMemoria = carreraActual()!;
    await new Promise(r => setImmediate(r));
    const guardada = (await leerCarreraEnCurso())!;
    expect(enMemoria.distanciaM - guardada.distanciaM).toBeLessThanOrEqual(3 * 5 + 1);

    reiniciarParaPruebas(); // la app murió
    expect(await cargarCarrera('otra', T0 + 600_000)).toBeNull();
    const retomada = await cargarCarrera('cuenta', T0 + 600_000);
    expect(retomada?.carreraId).toBe('d');
    expect(retomada?.fase).toBe('pausa');
  });
});
