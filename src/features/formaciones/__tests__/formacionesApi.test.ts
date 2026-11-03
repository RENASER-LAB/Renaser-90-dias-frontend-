import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../services/http/apiClient', () => ({ apiFetch: jest.fn() }));

import { apiFetch } from '../../../services/http/apiClient';
import {
  asignarFormaciones,
  elegirMiFormacion,
  guardarFormacion,
  leerFormacion,
  leerFormacionDeUnaPersonaApi,
  leerMiFormacion,
  listarFormaciones,
  trasladarAprendiz,
} from '../api/formacionesApi';

const pedido = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  pedido.mockReset();
});

describe('la formación de la sesión', () => {
  it('se lee de /me/formacion y se elige con PUT /me/formacion/activa', async () => {
    pedido.mockResolvedValueOnce({ activa: { codigo: 'ESCUELA', nombre: 'Escuela Renaser' }, disponibles: [] });
    const leida = await leerMiFormacion();
    expect(pedido).toHaveBeenCalledWith('/api/v1/me/formacion', expect.objectContaining({ timeoutMs: 15_000 }));
    expect(leida?.activa?.codigo).toBe('ESCUELA');

    pedido.mockResolvedValueOnce({ activa: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' }, disponibles: [], puedeElegir: true });
    const elegida = await elegirMiFormacion('DIPLOMADO');
    expect(pedido).toHaveBeenLastCalledWith('/api/v1/me/formacion/activa', expect.objectContaining({ method: 'PUT', body: { codigo: 'DIPLOMADO' } }));
    expect(elegida?.activa?.codigo).toBe('DIPLOMADO');
  });

  it('una respuesta sin forma no inventa una formación', async () => {
    pedido.mockResolvedValueOnce(null);
    expect(await leerMiFormacion()).toBeNull();
  });
});

describe('Administración', () => {
  it('lista las formaciones y perdona una tarjeta rota', async () => {
    pedido.mockResolvedValueOnce([
      { resumen: { codigo: 'ESCUELA', nombre: 'Escuela Renaser', duracionesDias: [90] }, aprendicesActivos: 1, personal: 0, grupos: 0, porAtender: 0 },
      { roto: true },
    ]);
    const tarjetas = await listarFormaciones();
    expect(pedido).toHaveBeenCalledWith('/api/v1/admin/formaciones', expect.anything());
    expect(tarjetas.map(t => t.resumen.codigo)).toEqual(['ESCUELA']);
  });

  it('una lista que no es lista queda vacía', async () => {
    pedido.mockResolvedValueOnce({ no: 'una lista' });
    expect(await listarFormaciones()).toEqual([]);
  });

  it('lee el detalle y guarda con la versión', async () => {
    pedido.mockResolvedValueOnce({
      resumen: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser', duracionesDias: [90, 365] },
      personas: {},
      grupos: {},
      porAtender: {},
    });
    expect((await leerFormacion('DIPLOMADO'))?.resumen.nombre).toBe('Diplomado Renaser');
    expect(pedido).toHaveBeenLastCalledWith('/api/v1/admin/formaciones/DIPLOMADO', expect.anything());

    pedido.mockResolvedValueOnce({ codigo: 'DIPLOMADO', nombre: 'Diplomado Plus', duracionesDias: [90, 365], version: 5 });
    const guardada = await guardarFormacion('DIPLOMADO', { nombre: 'Diplomado Plus', descripcion: '', activa: true, duracionesDias: [90, 365], version: 4 });
    expect(pedido).toHaveBeenLastCalledWith(
      '/api/v1/admin/formaciones/DIPLOMADO',
      expect.objectContaining({ method: 'PUT', body: { nombre: 'Diplomado Plus', descripcion: '', activa: true, duracionesDias: [90, 365], version: 4 } }),
    );
    expect(guardada?.version).toBe(5);
  });

  it('la formación de una persona, sus formaciones de trabajo y el traslado van por sus rutas', async () => {
    pedido.mockResolvedValueOnce({ formacion: 'ESCUELA', duracionDias: 90, programaActivado: true, formacionesDelPersonal: [], historial: [] });
    expect((await leerFormacionDeUnaPersonaApi('p 1'))?.formacion).toBe('ESCUELA');
    expect(pedido).toHaveBeenLastCalledWith('/api/v1/admin/users/p%201/formaciones', expect.anything());

    pedido.mockResolvedValueOnce(undefined);
    await asignarFormaciones('p1', ['ESCUELA', 'DIPLOMADO'], 'DIPLOMADO');
    expect(pedido).toHaveBeenLastCalledWith(
      '/api/v1/admin/users/p1/formaciones',
      expect.objectContaining({ method: 'PUT', body: { formaciones: ['ESCUELA', 'DIPLOMADO'], activa: 'DIPLOMADO' } }),
    );

    pedido.mockResolvedValueOnce(undefined);
    await trasladarAprendiz('p1', { formacion: 'DIPLOMADO', duracionDias: 365, darPorTerminada: true, motivo: 'Cambió de programa' });
    expect(pedido).toHaveBeenLastCalledWith(
      '/api/v1/admin/trainees/p1/formacion',
      expect.objectContaining({ method: 'POST', body: { formacion: 'DIPLOMADO', duracionDias: 365, darPorTerminada: true, motivo: 'Cambió de programa' } }),
    );
  });
});
