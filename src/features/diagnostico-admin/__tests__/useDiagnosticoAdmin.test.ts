import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLeer = jest.fn<() => Promise<unknown>>();
jest.mock('../api/diagnosticoAdminApi', () => ({
  leerBorradorDelDiagnostico: () => mockLeer(),
}));

import { ApiError } from '../../../services/http/apiClient';
import { useDiagnosticoAdmin, type EstadoDelDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
import type { BorradorDelDiagnostico } from '../types/diagnosticoAdmin.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const borrador = (version: number | null, extra: Partial<BorradorDelDiagnostico> = {}): BorradorDelDiagnostico => ({
  publicada: version === null ? null : { version, publicadaEn: null, publicadaPor: null },
  hayCambiosSinPublicar: true,
  puedePublicar: { ok: true, motivos: [] },
  secciones: [],
  retiradas: [],
  totales: { secciones: 0, preguntas: 0 },
  noEntendidas: 0,
  ...extra,
});

let ultimo!: EstadoDelDiagnosticoAdmin;
let raiz: ReactTestRenderer | null = null;
function Sonda({ activo = true }: { activo?: boolean }) {
  ultimo = useDiagnosticoAdmin(activo);
  return null;
}
const montar = async (activo = true) => {
  await act(async () => { raiz = TestRenderer.create(React.createElement(Sonda, { activo })); });
};

beforeEach(() => mockLeer.mockReset());
afterEach(async () => {
  if (raiz) await act(async () => { raiz!.unmount(); });
  raiz = null;
});

describe('useDiagnosticoAdmin', () => {
  it('lee el borrador al abrir y fija la versión base', async () => {
    mockLeer.mockResolvedValue(borrador(3));
    await montar();
    expect(ultimo.borrador?.publicada?.version).toBe(3);
    expect(ultimo.cargando).toBe(false);
    expect(ultimo.versionBase).toBe(3);
    expect(ultimo.otraPersona).toBe(false);
  });

  it('sin versión publicada, la base es 0', async () => {
    mockLeer.mockResolvedValue(borrador(null));
    await montar();
    expect(ultimo.versionBase).toBe(0);
  });

  it('inactivo no pide nada', async () => {
    await montar(false);
    expect(mockLeer).not.toHaveBeenCalled();
  });

  it('una lectura fallida se clasifica: sin permiso, sin red, no disponible', async () => {
    mockLeer.mockRejectedValue(new ApiError(403, 'no'));
    await montar();
    expect(ultimo.fallo).toBe('sin_permiso');
    expect(ultimo.borrador).toBeNull();
    mockLeer.mockRejectedValue(new ApiError(404, 'no'));
    await act(async () => { await ultimo.recargar(); });
    expect(ultimo.fallo).toBe('no_disponible');
    mockLeer.mockRejectedValue(new ApiError(0, 'sin red'));
    await act(async () => { await ultimo.recargar(); });
    expect(ultimo.fallo).toBe('sin_red');
  });

  it('algo que no es un borrador es un error, no una pantalla vacía', async () => {
    mockLeer.mockResolvedValue(null);
    await montar();
    expect(ultimo.fallo).toBe('error');
    expect(ultimo.cargando).toBe(false);
  });

  it('ejecutar corre el cambio, relee y devuelve el resultado', async () => {
    mockLeer.mockResolvedValue(borrador(3, { totales: { secciones: 1, preguntas: 1 } }));
    await montar();
    mockLeer.mockResolvedValue(borrador(3, { totales: { secciones: 1, preguntas: 2 } }));
    const accion = jest.fn(async () => 'hecho');
    let r: string | undefined;
    await act(async () => { r = await ultimo.ejecutar(accion); });
    expect(r).toBe('hecho');
    expect(accion).toHaveBeenCalledTimes(1);
    expect(ultimo.borrador?.totales.preguntas).toBe(2);
  });

  it('si el cambio falla, no relee y el error sube', async () => {
    mockLeer.mockResolvedValue(borrador(3));
    await montar();
    mockLeer.mockClear();
    await act(async () => {
      await expect(ultimo.ejecutar(async () => { throw new ApiError(409, 'Ya alimenta'); })).rejects.toThrow('Ya alimenta');
    });
    expect(mockLeer).not.toHaveBeenCalled();
  });

  it('si el cambio salió bien pero la relectura falla, conserva lo que había y lo marca como desactualizado', async () => {
    mockLeer.mockResolvedValue(borrador(3));
    await montar();
    mockLeer.mockRejectedValue(new ApiError(0, 'sin red'));
    await act(async () => { await ultimo.ejecutar(async () => 1); });
    expect(ultimo.borrador?.publicada?.version).toBe(3);
    expect(ultimo.desactualizado).toBe(true);
  });

  it('la versión base NO se mueve con las relecturas: si otra persona publicó, se avisa', async () => {
    mockLeer.mockResolvedValue(borrador(3));
    await montar();
    mockLeer.mockResolvedValue(borrador(4));
    await act(async () => { await ultimo.ejecutar(async () => 1); });
    expect(ultimo.versionBase).toBe(3);
    expect(ultimo.otraPersona).toBe(true);
  });

  it('recargar a mano pone la base al día', async () => {
    mockLeer.mockResolvedValue(borrador(3));
    await montar();
    mockLeer.mockResolvedValue(borrador(4));
    await act(async () => { await ultimo.ejecutar(async () => 1); });
    await act(async () => { await ultimo.recargar(); });
    expect(ultimo.versionBase).toBe(4);
    expect(ultimo.otraPersona).toBe(false);
  });

  it('tras publicar yo mismo, la nueva versión pasa a ser mi base', async () => {
    mockLeer.mockResolvedValue(borrador(3));
    await montar();
    mockLeer.mockResolvedValue(borrador(4));
    await act(async () => { await ultimo.ejecutar(async () => 1, { reiniciarBase: true }); });
    expect(ultimo.versionBase).toBe(4);
    expect(ultimo.otraPersona).toBe(false);
  });
});
