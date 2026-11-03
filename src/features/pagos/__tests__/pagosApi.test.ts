import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(ruta: string, opciones?: { method?: string; body?: unknown }) => Promise<unknown>>();
jest.mock('../../../services/http/apiClient', () => ({
  apiFetch: (ruta: string, opciones?: { method?: string; body?: unknown }) => mockApiFetch(ruta, opciones),
}));

import { agregarCuota, asignarPagos, confirmarMiCronograma, editarCuota, leerMiIngresoDelServidor, leerPagosDeLaPersona, marcarCuota, quitarCuota } from '../api/pagosApi';

const RESPUESTA_DE_LA_FICHA = { personName: 'Ana', payments: null };

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(RESPUESTA_DE_LA_FICHA);
});

describe('lo de la persona (siempre lo propio, sin id)', () => {
  it('lee Mi ingreso', async () => {
    mockApiFetch.mockResolvedValue({ steps: [], payments: null });
    expect(await leerMiIngresoDelServidor()).toEqual({ pasos: [], pagos: null });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/me/ingreso', { timeoutMs: 15_000 });
  });

  it('confirma con su nombre sin espacios sobrantes y la casilla marcada', async () => {
    mockApiFetch.mockResolvedValue({ steps: [], payments: null });
    await confirmarMiCronograma({ nombre: '  Beto Aprendiz ', revisado: true });
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/me/ingreso/cronograma/confirmacion', { method: 'POST', body: { name: 'Beto Aprendiz', reviewed: true } });
  });
});

describe('lo de Administración sobre una persona', () => {
  it('lee, con el id codificado', async () => {
    await leerPagosDeLaPersona('a b/c');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/pagos/personas/a%20b%2Fc', { timeoutMs: 15_000 });
  });

  it('asigna «sin cronograma» o el cronograma entero con PUT', async () => {
    await asignarPagos('p1', { mode: 'NONE' });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1', { method: 'PUT', body: { mode: 'NONE' } });
    const cuerpo = { mode: 'SCHEDULE' as const, currency: 'USD' as const, installments: [{ dueDate: '2026-11-15', amount: 1000 }] };
    await asignarPagos('p1', cuerpo);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1', { method: 'PUT', body: cuerpo });
  });

  it('agrega, edita y quita una cuota por su ruta', async () => {
    await agregarCuota('p1', { dueDate: '2026-12-01', amount: 10 });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1/cuotas', { method: 'POST', body: { dueDate: '2026-12-01', amount: 10 } });
    await editarCuota('p1', 'c9', { dueDate: '2026-12-02', amount: 20 });
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1/cuotas/c9', { method: 'PUT', body: { dueDate: '2026-12-02', amount: 20 } });
    await quitarCuota('p1', 'c9');
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1/cuotas/c9', { method: 'DELETE' });
  });

  it('marca la cuota pagada o la devuelve a pendiente', async () => {
    await marcarCuota('p1', 'c9', true);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1/cuotas/c9/estado', { method: 'PUT', body: { status: 'PAID' } });
    await marcarCuota('p1', 'c9', false);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/pagos/personas/p1/cuotas/c9/estado', { method: 'PUT', body: { status: 'PENDING' } });
  });

  it('una respuesta que no se entiende es un error, no una pantalla inventada', async () => {
    mockApiFetch.mockResolvedValue(null);
    await expect(marcarCuota('p1', 'c9', true)).rejects.toThrow(/inesperado/);
  });
});
