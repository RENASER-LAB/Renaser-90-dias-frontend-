import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError } from '../../../../services/http/apiClient';
import { obtenerDiaDeHabitos, milisegundosDelDia } from '../diaDeHabitosApi';

const mockFetch = jest.fn<(ruta: string) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string) => mockFetch(ruta),
}));
afterEach(() => { mockFetch.mockReset(); jest.useRealTimers(); });
const SNAPSHOT = { fechaLocal: '2026-10-16', zonaHoraria: 'America/Lima',
  cierraEn: '2026-10-17T05:00:00Z', ahoraServidor: '2026-10-17T04:59:59Z', tracks: [] };

describe('día de hábitos del servidor', () => {
  it('conserva contexto aun sin tracks y con reloj del teléfono en otra fecha', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-01-01T12:00:00Z'));
    mockFetch.mockResolvedValue(SNAPSHOT);
    const dia = await obtenerDiaDeHabitos();
    expect(dia.tracks).toEqual([]);
    expect(dia.contexto?.zonaHoraria).toBe('America/Lima');
    expect(milisegundosDelDia(dia.contexto!)).toBeLessThanOrEqual(1000);
    jest.advanceTimersByTime(1000);
    expect(milisegundosDelDia(dia.contexto!)).toBeLessThanOrEqual(0);
  });
  it('solo un 404 usa el array anterior y no inventa zona', async () => {
    mockFetch.mockRejectedValueOnce(new ApiError(404, 'No encontrado')).mockResolvedValueOnce([]);
    await expect(obtenerDiaDeHabitos()).resolves.toEqual({ tracks: [], contexto: null });
    expect(mockFetch.mock.calls.map(([ruta]) => ruta)).toEqual([
      '/api/v1/habit-tracks/today/snapshot', '/api/v1/habit-tracks/today',
    ]);
  });
  it.each([0, 403, 500])('no oculta un error %s como lista vacía', async status => {
    mockFetch.mockRejectedValue(new ApiError(status, 'falló'));
    await expect(obtenerDiaDeHabitos()).rejects.toThrow('falló');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  it('rechaza un snapshot incoherente en vez de ofrecer registros de otra fecha', async () => {
    mockFetch.mockResolvedValue({ ...SNAPSHOT, cierraEn: 'no es fecha' });
    await expect(obtenerDiaDeHabitos()).rejects.toThrow();
  });
  it('cambiar la hora del teléfono no prolonga ni adelanta el snapshot', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-01-01T12:00:00Z'));
    mockFetch.mockResolvedValue(SNAPSHOT);
    const dia = await obtenerDiaDeHabitos();
    jest.setSystemTime(new Date('2035-01-01T12:00:00Z'));
    expect(milisegundosDelDia(dia.contexto!)).toBe(1000);
    jest.setSystemTime(new Date('2020-01-01T12:00:00Z'));
    jest.advanceTimersByTime(1000);
    expect(milisegundosDelDia(dia.contexto!)).toBe(0);
  });
  it('con el dispositivo en Lima, Madrid conserva su propio día y su siguiente medianoche', async () => {
    jest.useFakeTimers().setSystemTime(new Date(SNAPSHOT.ahoraServidor));
    expect(new Date().getDate()).toBe(16); // Jest corre en America/Lima: todavía es el día anterior.
    mockFetch.mockResolvedValueOnce(SNAPSHOT).mockResolvedValueOnce({ ...SNAPSHOT,
      fechaLocal: '2026-10-17', zonaHoraria: 'Europe/Madrid', cierraEn: '2026-10-17T22:00:00Z',
    });
    const lima = await obtenerDiaDeHabitos();
    const madrid = await obtenerDiaDeHabitos();
    expect(madrid.contexto?.fechaLocal).toBe('2026-10-17');
    jest.advanceTimersByTime(1000);
    expect(milisegundosDelDia(lima.contexto!)).toBe(0);
    expect(milisegundosDelDia(madrid.contexto!)).toBe(17 * 60 * 60 * 1000);
  });
});
