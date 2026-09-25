import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, apiFetch: jest.fn() };
});

import { ApiError, apiFetch } from '../../../../services/http/apiClient';
import { obtenerMemoriaRenasia, olvidarRecuerdoRenasia, olvidarTodoRenasia } from '../memoriaApi';

const pedir = jest.mocked(apiFetch);

const memoria = {
  activa: true,
  recuerdos: [
    { id: '3f2a9c1e-0b7d-4c55-9e0a-1d2b3c4d5e6f', categoria: 'CONTEXTO_DE_VIDA', titulo: 'Tu contexto', texto: 'Trabaja de noche' },
  ],
  resumen: null,
};

describe('memoria del acompañante (D-167)', () => {
  beforeEach(() => {
    pedir.mockReset();
  });

  it('GET /api/v1/renasia/memoria devuelve lo validado', async () => {
    pedir.mockResolvedValueOnce(memoria);

    await expect(obtenerMemoriaRenasia()).resolves.toEqual(memoria);
    expect(pedir).toHaveBeenCalledWith('/api/v1/renasia/memoria');
  });

  it('una respuesta con otra forma es un error claro, no un undefined lejos de la causa', async () => {
    pedir.mockResolvedValueOnce({ recuerdos: 'no es una lista' });

    await expect(obtenerMemoriaRenasia()).rejects.toThrow('Respuesta inesperada de GET /api/v1/renasia/memoria');
  });

  it('una categoría nueva del backend no rompe el perfil', async () => {
    const conOtra = { ...memoria, recuerdos: [{ ...memoria.recuerdos[0], categoria: 'OTRA_NUEVA' }] };
    pedir.mockResolvedValueOnce(conOtra);

    await expect(obtenerMemoriaRenasia()).resolves.toEqual(conOtra);
  });

  it('olvidar un recuerdo es DELETE a su ruta, con el id escapado', async () => {
    pedir.mockResolvedValueOnce(undefined);

    await olvidarRecuerdoRenasia('a/b');

    expect(pedir).toHaveBeenCalledWith('/api/v1/renasia/memoria/recuerdos/a%2Fb', { method: 'DELETE' });
  });

  it('si ya no estaba (404), para la persona es lo mismo: no es un error', async () => {
    pedir.mockRejectedValueOnce(new ApiError(404, 'Ese recuerdo no existe'));

    await expect(olvidarRecuerdoRenasia('x')).resolves.toBeUndefined();
  });

  it('cualquier otro fallo al olvidar sí se informa', async () => {
    pedir.mockRejectedValueOnce(new ApiError(500, 'Error 500'));

    await expect(olvidarRecuerdoRenasia('x')).rejects.toThrow('Error 500');
  });

  it('olvidar todo es DELETE a la memoria entera', async () => {
    pedir.mockResolvedValueOnce(undefined);

    await olvidarTodoRenasia();

    expect(pedir).toHaveBeenCalledWith('/api/v1/renasia/memoria', { method: 'DELETE' });
  });
});
