/**
 * Backend D-284 (issue #20): la activación del Mapa manda `origen: 'MAPA'` para que su objetivo reemplace al que se
 * definió antes en Plan; Plan no manda `origen` (otro valor sería 400).
 */
import { beforeEach, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import * as fs from 'fs';
import * as path from 'path';

import { definirRocaMaestra } from '../objetivosApi';

const ROCA = {
  id: 'r1', eje: 'CUERPO', objetivo: 'Bajar a 80 kg', meta: 80, avance: 90, unidad: 'kg', lineaBase: 90,
  creadoEn: '2026-10-27T12:00:00Z', actualizadoEn: '2026-10-27T12:00:00Z',
};

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(ROCA);
});

it('desde el Mapa manda origen MAPA junto con la definición', async () => {
  await definirRocaMaestra('CUERPO' as never, { objetivo: 'Bajar a 80 kg' } as never, { desdeElMapa: true }).catch(() => undefined);
  expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/rocks/master/CUERPO', {
    method: 'PUT',
    body: { objetivo: 'Bajar a 80 kg', origen: 'MAPA' },
  });
});

it('desde Plan no manda origen', async () => {
  await definirRocaMaestra('CUERPO' as never, { objetivo: 'Bajar a 80 kg' } as never).catch(() => undefined);
  expect((mockApiFetch.mock.calls[0][1] as { body: unknown }).body).toEqual({ objetivo: 'Bajar a 80 kg' });
});

it('la activación del Mapa pide el origen MAPA', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '../../../mapa-renacimiento/hooks/useMapaRenacimiento.ts'), 'utf8');
  expect(fuente).toMatch(/definirRocaMaestra\([^;]*\{ desdeElMapa: true \}\)/);
});
