import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/** D-244: el contrato del botón de emergencia contra el servidor. */

const mockApiFetch = jest.fn(async (_ruta: string, _op?: unknown): Promise<unknown> => undefined);
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, op?: unknown) => mockApiFetch(ruta, op),
}));

import {
  cerrarEmergenciaSinCambio,
  leerEmergenciaAbierta,
  leerMiEmergencia,
  pedirAyudaPorEmergencia,
} from '../emergenciaApi';

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('emergenciaApi', () => {
  it('lee el pedido propio, con y sin pedido abierto', async () => {
    mockApiFetch.mockResolvedValue({ diaActual: 20, diaMaximo: 20, abierta: null });
    await expect(leerMiEmergencia()).resolves.toEqual({ diaActual: 20, diaMaximo: 20, abierta: null });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/me/emergency-request', undefined);
  });

  it('pide con POST y el cuerpo exacto', async () => {
    mockApiFetch.mockResolvedValue({ id: 'p', queOcurrio: 'x', diaPedido: 3, diaAlPedir: 20, estado: 'ABIERTA' });
    await pedirAyudaPorEmergencia({ queOcurrio: 'x', diaPedido: 3 });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/me/emergency-request', {
      method: 'POST',
      body: { queOcurrio: 'x', diaPedido: 3 },
    });
  });

  it('un 204 del pedido abierto de alguien es «no tiene»', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await expect(leerEmergenciaAbierta('a 1')).resolves.toBeNull();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/trainees/a%201/emergency-request', undefined);
  });

  it('una respuesta con otra forma no pasa callada', async () => {
    mockApiFetch.mockResolvedValue({ id: 'p' });
    await expect(leerEmergenciaAbierta('a')).rejects.toThrow('El backend respondió algo inesperado');
  });

  it('cierra sin cambiar con POST', async () => {
    await cerrarEmergenciaSinCambio('p-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/emergency-requests/p-1/close', { method: 'POST' });
  });
});
