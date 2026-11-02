/**
 * El pedido que cierra «Kilómetros diarios» con los pasos (spec 037, D-310). Mismas reglas de seguridad que `/complete`: se compara el
 * id del registro con el de HOY antes de enviar (regla del 17-oct), un día cerrado no se reasigna ni se celebra, y al confirmar el
 * servidor sale `habitoCumplido` con el hábito y el día.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import { escucharDiaDeHabitosCambiado } from '../../../habits/eventos/diaDeHabitosCambiado';
import { alCumplirUnHabito } from '../../../habits/eventos/habitoCumplido';
import type { TrackDelDiaApi } from '../../../habits/types/habits.types';
import { registrarKilometrosAutomaticos } from '../pasosApi';

const mockTracks = jest.fn<() => Promise<TrackDelDiaApi[]>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../habits/api/habitsApi', () => ({ obtenerTracksDeHoy: () => mockTracks() }));
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (...args: unknown[]) => mockPost(...args),
}));

afterEach(() => {
  mockTracks.mockReset();
  mockPost.mockReset();
});

const track = { id: 'hoy', habitoId: 'h-km', fechaEjecucion: '2026-11-04', estado: 'PENDIENTE' } as TrackDelDiaApi;
const cuerpo = { kilometros: 5.4, pasos: 7120, fuente: 'Galaxy Watch', dispositivo: 'RELOJ' as const, leidoEn: '2026-11-04T22:10:03.000Z' };
const cerrado = { id: 'hoy', estado: 'COMPLETADO', puntosOtorgados: 8, completadoEn: '2026-11-04T22:11:00Z', valorMedido: 5.4 };

describe('registrarKilometrosAutomaticos', () => {
  it('envía la lectura al endpoint de pasos del registro de hoy y devuelve el registro cerrado', async () => {
    mockTracks.mockResolvedValue([track]);
    mockPost.mockResolvedValue(cerrado);

    const resultado = await registrarKilometrosAutomaticos('hoy', cuerpo);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/habit-tracks/hoy/auto-measurement', { method: 'POST', body: cuerpo });
    expect(resultado.puntosOtorgados).toBe(8);
    expect(resultado.estado).toBe('COMPLETADO');
  });

  it('al confirmar el servidor avisa «se cumplió un hábito» con los puntos que pagó, el hábito y el día del registro', async () => {
    mockTracks.mockResolvedValue([track]);
    mockPost.mockResolvedValue(cerrado);
    const cumplidos: unknown[] = [];
    const salir = alCumplirUnHabito(c => cumplidos.push(c));
    try {
      await registrarKilometrosAutomaticos('hoy', cuerpo);
    } finally {
      salir();
    }
    expect(cumplidos).toEqual([{ registroId: 'hoy', puntosOtorgados: 8, habitoId: 'h-km', fecha: '2026-11-04' }]);
  });

  it('un registro que ya no es el de hoy no envía nada, no celebra y avisa que el día cambió', async () => {
    mockTracks.mockResolvedValue([track]);
    const cambio = jest.fn();
    const salirDelCambio = escucharDiaDeHabitosCambiado(cambio);
    const logro = jest.fn();
    const salirDelLogro = alCumplirUnHabito(logro);
    try {
      await expect(registrarKilometrosAutomaticos('ayer', cuerpo)).rejects.toThrow('Tu día cambió');
      expect(mockPost).not.toHaveBeenCalled();
      expect(logro).not.toHaveBeenCalled();
      expect(cambio).toHaveBeenCalledTimes(1);
    } finally {
      salirDelCambio();
      salirDelLogro();
    }
  });

  it('si el día termina durante el pedido, el 409 de «ese día ya cerró» no reasigna ni celebra', async () => {
    mockTracks.mockResolvedValue([track]);
    mockPost.mockRejectedValue(new ApiError(409, 'Este hábito era del 4 de noviembre; ese día ya cerró y no se puede registrar.'));
    const logro = jest.fn();
    const salir = alCumplirUnHabito(logro);
    try {
      await expect(registrarKilometrosAutomaticos('hoy', cuerpo)).rejects.toThrow('Tu día cambió');
      expect(logro).not.toHaveBeenCalled();
    } finally {
      salir();
    }
  });

  it('un 400 del servidor (no llega a la meta) conserva su mensaje, que es el que lee la persona', async () => {
    mockTracks.mockResolvedValue([track]);
    const rechazo = new ApiError(400, 'Todavía no llegas a tu meta de 5 km.');
    mockPost.mockRejectedValue(rechazo);
    await expect(registrarKilometrosAutomaticos('hoy', cuerpo)).rejects.toBe(rechazo);
  });

  it('sin conexión para leer el registro pide actualizar antes de enviar', async () => {
    mockTracks.mockRejectedValue(new ApiError(0, 'sin red'));
    await expect(registrarKilometrosAutomaticos('hoy', cuerpo)).rejects.toThrow('actualizar');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('una respuesta que no es un registro cerrado no se da por buena', async () => {
    mockTracks.mockResolvedValue([track]);
    mockPost.mockResolvedValue({ cosa: 'rara' });
    await expect(registrarKilometrosAutomaticos('hoy', cuerpo)).rejects.toThrow();
  });
});
