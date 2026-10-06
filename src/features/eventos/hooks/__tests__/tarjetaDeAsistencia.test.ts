import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => {
  const real = jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient');
  return { ...real, apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones) };
});

import { marcar } from '../../api/asistenciaApi';
import { leerListaParaLaTarjeta } from '../useAsistenciaDelEvento';

const LISTA = {
  occurrenceStart: '2026-10-06T01:00:00Z',
  opensAt: '2026-10-06T00:30:00Z',
  closesAt: '2026-10-06T14:00:00Z',
  open: true,
  closed: null,
  people: [],
};

describe('la tarjeta «Asistencia» con un backend viejo o sin permiso (D-256)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('pide /attendance de esa fecha y la devuelve traducida', async () => {
    mockApiFetch.mockResolvedValueOnce(LISTA);
    const lista = await leerListaParaLaTarjeta('ev 1', '2026-10-06T01:00:00Z');
    expect(lista?.abierta).toBe(true);
    expect(mockApiFetch.mock.calls[0][0]).toBe(
      '/api/v1/calendar/events/ev%201/attendance?occurrenceStart=2026-10-06T01%3A00%3A00Z',
    );
  });

  it('un backend sin el endpoint (404) no rompe nada: no hay tarjeta', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'Not Found'));
    await expect(leerListaParaLaTarjeta('ev', 'x')).resolves.toBeNull();
  });

  it('sin permiso (403) o sin red, tampoco', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(403, 'Solo quien creó el evento…'));
    await expect(leerListaParaLaTarjeta('ev', 'x')).resolves.toBeNull();
    mockApiFetch.mockRejectedValueOnce(new ApiError(0, 'Sin conexión'));
    await expect(leerListaParaLaTarjeta('ev', 'x')).resolves.toBeNull();
  });

  it('marcar manda el estado del contrato, también null para dejar ausente', async () => {
    mockApiFetch.mockResolvedValue({ userId: 'ana', estado: null });
    await marcar('ev', '2026-10-06T01:00:00Z', 'ana', null);
    expect(mockApiFetch.mock.calls[0][1]).toEqual({
      method: 'PUT',
      body: { occurrenceStart: '2026-10-06T01:00:00Z', estado: null },
    });
  });
});
