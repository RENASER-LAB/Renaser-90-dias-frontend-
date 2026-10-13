import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

import { aprobarSolicitud, listarAprendices } from '../adminApi';

/**
 * Backend D-265 y E-605: aprobar eligiendo el rol, y la sección «Aprendices» de «Equipo y roles» pidiendo solo
 * aprendices.
 */
describe('aprobar con rol (D-265)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(undefined);
  });

  it('con un rol lo manda en el cuerpo', async () => {
    await aprobarSolicitud('s-1', 'TRAINEE_GUIDE');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/account-requests/s-1/approve', {
      method: 'POST',
      body: { role: 'TRAINEE_GUIDE' },
    });
  });

  it('sin rol no manda cuerpo: es el pedido de siempre, el de la app 1.5.0', async () => {
    await aprobarSolicitud('s-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/account-requests/s-1/approve', { method: 'POST' });
  });
});

describe('listado de aprendices con filtro de rol (E-605)', () => {
  const paginaVacia = { content: [], total: 0, page: 0, size: 20 };

  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue(paginaVacia);
  });

  it('con rol pide role=; sin rol, todas las cuentas como antes', async () => {
    await listarAprendices({ pagina: 0, tamano: 20, rol: 'TRAINEE' });
    await listarAprendices({ pagina: 0, tamano: 20 });
    expect(mockApiFetch.mock.calls[0][0]).toBe('/api/v1/admin/trainees?page=0&size=20&role=TRAINEE');
    expect(mockApiFetch.mock.calls[1][0]).toBe('/api/v1/admin/trainees?page=0&size=20');
  });
});
