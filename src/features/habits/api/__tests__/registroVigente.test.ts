import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../../services/http/apiClient';
import { ejecutarEnRegistroVigente } from '../registroVigente';
import { escucharDiaDeHabitosCambiado } from '../../eventos/diaDeHabitosCambiado';
import type { TrackDelDiaApi } from '../../types/habits.types';
import { completarRegistro, confirmarEvidencia, solicitarUrlSubidaEvidencia } from '../evidenciaHabitoApi';
import { alCumplirUnHabito } from '../../eventos/habitoCumplido';

const mockTracks = jest.fn<() => Promise<TrackDelDiaApi[]>>();
const mockPost = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../habitsApi', () => ({ obtenerTracksDeHoy: () => mockTracks() }));
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (...args: unknown[]) => mockPost(...args),
}));
afterEach(() => { mockTracks.mockReset(); mockPost.mockReset(); });
const track = { id: 'hoy', estado: 'PENDIENTE' } as TrackDelDiaApi;

describe('registro original vigente antes de escribir', () => {
  it('un ID de ayer no genera escritura ni se reemplaza por el de hoy', async () => {
    mockTracks.mockResolvedValue([track]);
    const escribir = jest.fn(async () => 10);
    const cambio = jest.fn(); const salir = escucharDiaDeHabitosCambiado(cambio);
    try {
      await expect(ejecutarEnRegistroVigente('ayer', escribir)).rejects.toThrow('Tu día cambió');
      expect(escribir).not.toHaveBeenCalled(); expect(cambio).toHaveBeenCalledTimes(1);
    } finally { salir(); }
  });
  it('sin conexión pide actualizar antes de escribir', async () => {
    mockTracks.mockRejectedValue(new ApiError(0, 'sin red'));
    const escribir = jest.fn(async () => 10);
    await expect(ejecutarEnRegistroVigente('hoy', escribir)).rejects.toThrow('actualizar');
    expect(escribir).not.toHaveBeenCalled();
  });
  it('si el día termina durante el POST, avisa y conserva el rechazo sin repetir', async () => {
    mockTracks.mockResolvedValue([track]);
    const error = new ApiError(409, 'Este hábito era del 16 de octubre; ese día ya cerró y no se puede registrar.');
    const escribir = jest.fn(async () => { throw error; });
    const cambio = jest.fn(); const salir = escucharDiaDeHabitosCambiado(cambio);
    try {
      await expect(ejecutarEnRegistroVigente('hoy', escribir)).rejects.toThrow('Tu día cambió');
      expect(escribir).toHaveBeenCalledTimes(1); expect(cambio).toHaveBeenCalledTimes(1);
    } finally { salir(); }
  });
  it('un 409 ajeno al día mantiene su error original', async () => {
    mockTracks.mockResolvedValue([track]);
    const error = new ApiError(409, 'Este registro no puede completarse: COMPLETADO');
    await expect(ejecutarEnRegistroVigente('hoy', async () => { throw error; })).rejects.toBe(error);
  });
  it('deja al servidor responder por un registro ya completado, sin fingir puntos', async () => {
    mockTracks.mockResolvedValue([{ ...track, estado: 'COMPLETADO' }]);
    await expect(ejecutarEnRegistroVigente('hoy', async () => 0)).resolves.toBe(0);
  });

  it.each([
    ['completar', () => completarRegistro('ayer')],
    ['pedir cámara/subida', () => solicitarUrlSubidaEvidencia('ayer', 'image/jpeg')],
    ['confirmar evidencia', () => confirmarEvidencia('ayer', { tipo: 'TEXTO', contenidoTexto: 'Respuesta de ayer' })],
  ] as Array<[string, () => Promise<unknown>]>)('%s: el camino real no escribe ni celebra un registro que dejó de ser vigente', async (_nombre, enviar) => {
    mockTracks.mockResolvedValue([track]);
    const logro = jest.fn(); const salir = alCumplirUnHabito(logro);
    try {
      await expect(enviar()).rejects.toThrow('Tu día cambió');
      expect(mockPost).not.toHaveBeenCalled(); expect(logro).not.toHaveBeenCalled();
    } finally { salir(); }
  });

  it('subir evidencia antes del corte no autoriza completar después ni asignar puntos', async () => {
    mockTracks.mockResolvedValueOnce([track]).mockResolvedValueOnce([]);
    mockPost.mockResolvedValueOnce({ id: 'evidencia', estadoValidacion: 'PENDIENTE' });
    await confirmarEvidencia('hoy', { tipo: 'TEXTO', contenidoTexto: 'Mi evidencia' });
    const logro = jest.fn(); const salir = alCumplirUnHabito(logro);
    try {
      await expect(completarRegistro('hoy')).rejects.toThrow('Tu día cambió');
      expect(mockPost).toHaveBeenCalledTimes(1); expect(logro).not.toHaveBeenCalled();
    } finally { salir(); }
  });
});
