import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * «Dictado» en el contrato del Código Renaser (spec 030, decisión 030-2; `contracts/api.md` del backend): la app solo manda
 * `dictado: true` cuando es cierto —el pedido de quien escribe es idéntico al de siempre— y lee `dictado` de cada registro con
 * esquema tolerante: ausente (backend anterior) o roto vale `false` y no tumba el registro, que es lo que la persona escribió.
 */

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  ...jest.requireActual<typeof import('../../../../services/http/apiClient')>('../../../../services/http/apiClient'),
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import { obtenerHistorial, registrarCheckIn } from '../radarApi';

beforeEach(() => {
  mockApiFetch.mockReset();
});

const checkIn = {
  whatAmIDoing: 'a',
  whatAmIThinking: 'b',
  whatAmIFeeling: 'c',
  energyLevel: 6,
  whatAmIAvoiding: 'd',
};
const registro = { id: 'r1', ...checkIn, createdAt: '2026-10-31T19:06:00Z' };

describe('el pedido', () => {
  it('lo escrito viaja exactamente como siempre: sin la clave `dictado`', async () => {
    mockApiFetch.mockResolvedValueOnce(registro);
    await registrarCheckIn(checkIn);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/radar', { method: 'POST', body: checkIn });
    expect(Object.keys(mockApiFetch.mock.calls[0][1]?.body as object)).not.toContain('dictado');
  });

  it('lo dictado viaja con `dictado: true` y los mismos cinco campos', async () => {
    mockApiFetch.mockResolvedValueOnce({ ...registro, dictado: true });
    const guardado = await registrarCheckIn({ ...checkIn, dictado: true });
    expect(mockApiFetch.mock.calls[0][1]?.body).toEqual({ ...checkIn, dictado: true });
    expect(guardado.dictado).toBe(true);
  });
});

describe('la lectura', () => {
  it('cada registro dice si se dictó', async () => {
    mockApiFetch.mockResolvedValueOnce({
      entries: [{ ...registro, id: 'a', dictado: true }, { ...registro, id: 'b', dictado: false }],
      nextCursor: null,
    });
    const historial = await obtenerHistorial();
    expect(historial.entries.map(e => e.dictado)).toEqual([true, false]);
  });

  it('un backend anterior (sin el campo) lee `false`', async () => {
    mockApiFetch.mockResolvedValueOnce({ entries: [registro], nextCursor: null });
    expect((await obtenerHistorial()).entries[0].dictado).toBe(false);
  });

  it('un valor que no es un booleano se pierde solo él: el registro, lo que la persona escribió, sigue', async () => {
    mockApiFetch.mockResolvedValueOnce({ entries: [{ ...registro, dictado: 'si' }], nextCursor: null });
    const [leido] = (await obtenerHistorial()).entries;
    expect(leido.dictado).toBe(false);
    expect(leido.whatAmIDoing).toBe('a');
  });
});
