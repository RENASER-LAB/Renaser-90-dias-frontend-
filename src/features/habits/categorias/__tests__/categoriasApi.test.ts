import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: unknown) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: unknown) => mockApiFetch(ruta, opciones),
}));

import {
  actualizarCategoriaAdmin,
  cambiarActivaCategoriaAdmin,
  crearCategoriaAdmin,
  eliminarCategoriaAdmin,
  leerCategoriasDeMiFormacion,
  listarCategoriasAdmin,
  ordenarCategoriasAdmin,
} from '../api/categoriasApi';

/** El contrato de las categorías de hábito (spec 023 del backend): rutas, verbos y cuerpos. */
const FILA = {
  key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', formation: 'DIPLOMADO', name: 'Estudio', icon: 'bookOpen', order: 1,
  isActive: true, activeHabits: 0, totalHabits: 0, canBeDeactivated: true, canBeDeleted: true,
};

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('categoriasApi', () => {
  it('las de mi formación: GET /habit-categories', async () => {
    mockApiFetch.mockResolvedValue({ formation: 'DIPLOMADO', categories: [{ key: 'A_B', code: 'A_B', name: 'Uno', icon: null, order: 1 }] });
    expect((await leerCategoriasDeMiFormacion())?.formation).toBe('DIPLOMADO');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/habit-categories', expect.anything());
  });

  it('las de Administración: una formación, o las tres sin parámetro', async () => {
    mockApiFetch.mockResolvedValue([FILA]);
    expect(await listarCategoriasAdmin('DIPLOMADO')).toHaveLength(1);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories?formation=DIPLOMADO', expect.anything());
    await listarCategoriasAdmin();
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories', expect.anything());
  });

  it('crea con POST: formación, nombre e ícono', async () => {
    mockApiFetch.mockResolvedValue(FILA);
    await crearCategoriaAdmin({ formacion: 'DIPLOMADO', nombre: 'Estudio', icono: 'bookOpen' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories', {
      method: 'POST',
      body: { formation: 'DIPLOMADO', name: 'Estudio', icon: 'bookOpen' },
    });
  });

  it('renombra y cambia el ícono con PUT; `changesIcon` distingue «no lo toques» de «quítaselo»', async () => {
    mockApiFetch.mockResolvedValue(FILA);
    await actualizarCategoriaAdmin('DIPLOMADO_ESTUDIO', { nombre: 'Estudio profundo', icono: null, cambiaElIcono: false });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories/DIPLOMADO_ESTUDIO', {
      method: 'PUT',
      body: { name: 'Estudio profundo', icon: '', changesIcon: false },
    });
    await actualizarCategoriaAdmin('DIPLOMADO_ESTUDIO', { icono: null, cambiaElIcono: true });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories/DIPLOMADO_ESTUDIO', {
      method: 'PUT',
      body: { name: undefined, icon: '', changesIcon: true },
    });
  });

  it('activa o desactiva, ordena con la lista completa de claves y elimina', async () => {
    mockApiFetch.mockResolvedValue(FILA);
    await cambiarActivaCategoriaAdmin('DIPLOMADO_ESTUDIO', false);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories/DIPLOMADO_ESTUDIO/active', {
      method: 'PUT',
      body: { isActive: false },
    });
    mockApiFetch.mockResolvedValue([FILA]);
    await ordenarCategoriasAdmin('DIPLOMADO', ['B', 'A']);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories/order', {
      method: 'PUT',
      body: { formation: 'DIPLOMADO', keys: ['B', 'A'] },
    });
    mockApiFetch.mockResolvedValue(undefined);
    await eliminarCategoriaAdmin('DIPLOMADO_ESTUDIO');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/habit-categories/DIPLOMADO_ESTUDIO', { method: 'DELETE' });
  });

  it('un backend anterior (sin el endpoint) lanza el error de la API y quien llama usa las de respaldo', async () => {
    mockApiFetch.mockRejectedValue(new Error('404'));
    await expect(leerCategoriasDeMiFormacion()).rejects.toThrow('404');
  });
});
