import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<() => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: () => mockApiFetch() }));

import { obtenerTracksDeHoy } from '../habitsApi';

/**
 * E-230: Hoy y el orbe piden los hábitos de hoy al mismo tiempo. Dos GET simultáneos hacían que el
 * backend intentara crear dos veces el mismo track (409). Mientras hay uno en vuelo, se comparte.
 */
describe('obtenerTracksDeHoy', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('dos pedidos simultáneos hacen UNA sola llamada al servidor', async () => {
    let responder!: (valor: unknown) => void;
    mockApiFetch.mockReturnValueOnce(new Promise(resolver => (responder = resolver)));

    const primero = obtenerTracksDeHoy();
    const segundo = obtenerTracksDeHoy();
    responder([]);

    await expect(primero).resolves.toEqual([]);
    await expect(segundo).resolves.toEqual([]);
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('terminado uno, el siguiente pedido vuelve a ir al servidor (no es un caché)', async () => {
    mockApiFetch.mockResolvedValue([]);

    await obtenerTracksDeHoy();
    await obtenerTracksDeHoy();

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('si falla, el siguiente pedido reintenta', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce([]);

    await expect(obtenerTracksDeHoy()).rejects.toThrow('sin red');
    await expect(obtenerTracksDeHoy()).resolves.toEqual([]);
  });
});
