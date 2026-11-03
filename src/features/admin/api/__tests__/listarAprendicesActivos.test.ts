import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

import { listarAprendices } from '../adminApi';

/**
 * Segunda jornada del E2E de las formaciones (J2-1): el padrón de Administración trae también las solicitudes que esperan aprobación (cuentas
 * inactivas, sin programa) y «Asignar a varias personas» las ofrecía. La lista que lo necesita pide `activeOnly=true`; «Personas» sigue sin pedirlo.
 */
describe('listarAprendices: solo las cuentas activas', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ content: [], total: 0, page: 0, size: 20 });
  });

  it('con soloActivas, el servidor recibe activeOnly=true', async () => {
    await listarAprendices({ soloActivas: true });
    expect(String(mockApiFetch.mock.calls[0][0])).toContain('activeOnly=true');
  });

  it('sin soloActivas no viaja nada: «Personas» sigue viendo todas las cuentas', async () => {
    await listarAprendices({ pagina: 1, tamano: 20 });
    expect(String(mockApiFetch.mock.calls[0][0])).not.toContain('activeOnly');
  });
});
