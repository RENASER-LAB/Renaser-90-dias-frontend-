import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

import { obtenerGuiasDeRecepcion, reemplazarGuiasDeRecepcion } from '../adminApi';

/** Las rutas de guías de recepción (backend D-242): GET para leer, PUT de reemplazo para guardar. */
describe('guías de recepción', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('GET sin grupo pide el designado; con grupo, lo manda en la consulta', async () => {
    mockApiFetch.mockResolvedValue({ cohortId: 'c-1', receptionCellId: null, guides: [] });
    await obtenerGuiasDeRecepcion('c-1');
    await obtenerGuiasDeRecepcion('c-1', 'r-1');
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/admin/cohorts/c-1/reception/guides');
    expect(mockApiFetch.mock.calls[1][0]).toBe('/api/v1/admin/cohorts/c-1/reception/guides?receptionCellId=r-1');
  });

  it('PUT manda la lista entera por userId y el grupo', async () => {
    mockApiFetch.mockResolvedValue({});
    await reemplazarGuiasDeRecepcion('c-1', 'r-1', ['u-1', 'u-2']);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/cohorts/c-1/reception/guides', {
      method: 'PUT',
      body: { receptionCellId: 'r-1', guides: [{ userId: 'u-1' }, { userId: 'u-2' }] },
    });
  });
});
