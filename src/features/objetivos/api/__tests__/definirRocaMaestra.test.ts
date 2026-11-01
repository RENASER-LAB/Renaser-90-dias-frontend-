/**
 * `PUT /rocks/master/{eje}` (spec 026): ya no hay Mapa que mande `origen`. El pedido lleva solo la definición, sea un objetivo
 * nuevo escrito en Plan, el avance de uno fijo o la confirmación de uno del diagnóstico (solo el texto).
 */
import { beforeEach, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { definirRocaMaestra } from '../objetivosApi';

const ROCA = {
  id: 'r1', eje: 'CUERPO', objetivo: 'Bajar a 80 kg', meta: 80, avance: 90, unidad: 'kg', lineaBase: 90, porcentaje: null,
  creadoEn: '2026-10-27T12:00:00Z', actualizadoEn: '2026-10-27T12:00:00Z',
};

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(ROCA);
});

it('manda solo la definición, sin `origen` ni `desdeElMapa`', async () => {
  await definirRocaMaestra('CUERPO', { objetivo: 'Bajar a 80 kg' });
  expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/rocks/master/CUERPO', { method: 'PUT', body: { objetivo: 'Bajar a 80 kg' } });
});

it('confirmar un objetivo del diagnóstico es el mismo pedido, solo con el texto (sin meta)', async () => {
  await definirRocaMaestra('TRABAJO', { objetivo: 'Facturar 30 mil al mes' });
  const cuerpo = (mockApiFetch.mock.calls[0][1] as { body: Record<string, unknown> }).body;
  expect(Object.keys(cuerpo)).toEqual(['objetivo']);
});

it('la respuesta trae `origin` y `confirmed`, tolerantes a un servidor anterior', async () => {
  mockApiFetch.mockResolvedValue({ ...ROCA, origin: 'DIAGNOSTICO', confirmed: true });
  expect(await definirRocaMaestra('CUERPO', { objetivo: 'x' })).toMatchObject({ origin: 'DIAGNOSTICO', confirmed: true });
  mockApiFetch.mockResolvedValue(ROCA);
  expect(await definirRocaMaestra('CUERPO', { objetivo: 'x' })).toMatchObject({ origin: 'PLAN', confirmed: true });
});
