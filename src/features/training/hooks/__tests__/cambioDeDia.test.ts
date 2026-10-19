import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import type { DatosEntrenamiento } from '../../api/cargarEntrenamiento';

const mockCargar = jest.fn<() => Promise<DatosEntrenamiento>>();
jest.mock('../../api/cargarEntrenamiento', () => ({ cargarEntrenamiento: () => mockCargar() }));
import { useTraining } from '../useTraining';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let raiz: ReactTestRenderer | null = null;
let lectura!: ReturnType<typeof useTraining>;
const renders: ReturnType<typeof useTraining>[] = [];
function Sonda({ activa = true }: { activa?: boolean }) {
  lectura = useTraining(activa); renders.push(lectura); return null;
}
const datos = (id: string, duracion = 1000): DatosEntrenamiento => ({
  tracks: [], catalogo: [], planHabits: [], rocasConEvidencia: new Set(),
  rocas: [{ id, titulo: id, completada: false } as DatosEntrenamiento['rocas'][number]],
  contexto: { fechaLocal: '2026-10-16', zonaHoraria: 'America/Lima',
    cierraEn: new Date(Date.now() + duracion).toISOString(), ahoraServidor: new Date().toISOString(),
    recibidoEn: Date.now(), recibidoMonotono: performance.now() },
});
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-17T04:59:59Z'));
  mockCargar.mockReset(); renders.length = 0;
});
afterEach(() => { act(() => raiz?.unmount()); raiz = null; jest.restoreAllMocks(); jest.useRealTimers(); });
async function montar() { await act(async () => { raiz = TestRenderer.create(React.createElement(Sonda)); }); }

describe('Training atraviesa medianoche', () => {
  it('invalida ayer al cierre y no lo ofrece mientras espera hoy', async () => {
    mockCargar.mockResolvedValueOnce(datos('ayer')).mockReturnValueOnce(new Promise(() => {}));
    await montar(); expect(lectura.habits[0].id).toBe('ayer');
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockCargar).toHaveBeenCalledTimes(2);
    expect(lectura.habits).toEqual([]); expect(lectura.loading).toBe(true);
  });
  it('sin red después del cierre muestra error y permite reintentar', async () => {
    mockCargar.mockResolvedValueOnce(datos('ayer')).mockRejectedValueOnce(new Error('sin red'));
    await montar();
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(lectura.habits).toEqual([]); expect(lectura.error).toBeTruthy();
    mockCargar.mockResolvedValueOnce(datos('hoy', 86_400_000));
    await act(async () => { await lectura.recargar(); });
    expect(lectura.habits[0].id).toBe('hoy'); expect(lectura.error).toBeNull();
  });
  it('regresar a Training relee y una respuesta anterior no reemplaza los nuevos datos', async () => {
    let responder!: (d: DatosEntrenamiento) => void;
    mockCargar.mockReturnValueOnce(new Promise(r => { responder = r; }));
    await montar();
    await act(async () => { raiz!.update(React.createElement(Sonda, { activa: false })); });
    mockCargar.mockResolvedValueOnce(datos('hoy', 86_400_000));
    await act(async () => { raiz!.update(React.createElement(Sonda, { activa: true })); });
    await act(async () => { responder(datos('ayer')); });
    expect(lectura.habits[0].id).toBe('hoy');
  });
  it('regresar del segundo plano dispara una actualización', async () => {
    let cambiar!: (estado: AppStateStatus) => void;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_evento, callback) => {
      cambiar = callback; return { remove: jest.fn() };
    });
    mockCargar.mockResolvedValue(datos('hoy', 86_400_000));
    await montar();
    await act(async () => { cambiar('background'); cambiar('active'); });
    expect(mockCargar).toHaveBeenCalledTimes(2);
  });
  it('al volver después del corte no ofrece ayer ni en el render previo al efecto de foco', async () => {
    mockCargar.mockResolvedValueOnce(datos('ayer'));
    await montar();
    await act(async () => { raiz!.update(React.createElement(Sonda, { activa: false })); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    const desde = renders.length;
    mockCargar.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => { raiz!.update(React.createElement(Sonda, { activa: true })); });
    expect(renders.slice(desde).every(estado => estado.habits.length === 0 && estado.loading)).toBe(true);
  });
  it('un snapshot recibido después de su cierre no llega a la pantalla', async () => {
    mockCargar.mockResolvedValueOnce(datos('ayer', -1)).mockResolvedValueOnce(datos('hoy', 86_400_000));
    await montar();
    expect(lectura.habits[0].id).toBe('hoy'); expect(mockCargar).toHaveBeenCalledTimes(2);
  });
  it('backend anterior: relee periódicamente sin inferir zona del teléfono', async () => {
    mockCargar.mockResolvedValue({ ...datos('hoy'), contexto: null });
    await montar();
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(mockCargar).toHaveBeenCalledTimes(2);
  });
});
