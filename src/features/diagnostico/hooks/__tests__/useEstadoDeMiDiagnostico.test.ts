import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AppState } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Lo que Hoy y Yo saben del diagnóstico de la persona (spec 026): sin lectura no hay oferta, una cuenta nueva no hereda lo de la
 * anterior, una respuesta vieja no pisa a la nueva, y terminar el diagnóstico lo relee en el acto.
 */

let mockUsuario: { id: string } | null = { id: 'u-1' };
const mockEstado = jest.fn<() => Promise<unknown>>();

jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: mockUsuario }) }));
jest.mock('../../api/diagnosticoApi', () => ({ obtenerEstadoDeMiDiagnostico: () => mockEstado() }));

import { avisarDiagnosticoTerminado } from '../../events/avisoDiagnosticoTerminado';
import type { EstadoDeMiDiagnostico } from '../../types/diagnostico.types';
import { useEstadoDeMiDiagnostico } from '../useEstadoDeMiDiagnostico';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PENDIENTE: EstadoDeMiDiagnostico = { ficha: 'CON_DIAGNOSTICO', estado: 'PENDIENTE', version: null, completedAt: null };
const COMPLETADO: EstadoDeMiDiagnostico = { ficha: 'CON_DIAGNOSTICO', estado: 'COMPLETADO', version: 3, completedAt: '2026-11-02T15:04:00Z' };

const vaciar = () => new Promise<void>(res => setImmediate(res));
let ultimo: ReturnType<typeof useEstadoDeMiDiagnostico> | null = null;
let raiz: ReactTestRenderer | null = null;

function Prueba() {
  ultimo = useEstadoDeMiDiagnostico();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Prueba));
    await vaciar();
  });
}
async function volverARenderizar() {
  await act(async () => {
    raiz?.update(React.createElement(Prueba));
    await vaciar();
  });
}

beforeEach(() => {
  mockUsuario = { id: 'u-1' };
  mockEstado.mockReset().mockResolvedValue(PENDIENTE);
  ultimo = null;
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('useEstadoDeMiDiagnostico', () => {
  it('mientras llega la primera lectura no hay estado y está cargando; después, el estado', async () => {
    let resolver!: (e: EstadoDeMiDiagnostico) => void;
    mockEstado.mockReturnValue(new Promise(res => { resolver = res; }));
    await montar();
    expect(ultimo).toMatchObject({ estado: null, cargando: true });
    await act(async () => {
      resolver(PENDIENTE);
      await vaciar();
    });
    expect(ultimo).toMatchObject({ estado: PENDIENTE, cargando: false });
  });

  it('un fallo (404 de un backend anterior, sin red) deja el estado en null: no se ofrece nada', async () => {
    mockEstado.mockRejectedValue(new Error('404'));
    await montar();
    expect(ultimo).toMatchObject({ estado: null, cargando: false });
  });

  it('«recargar» vuelve a leer, y si falla conserva lo que ya se sabía', async () => {
    await montar();
    mockEstado.mockResolvedValueOnce(COMPLETADO);
    await act(async () => {
      ultimo?.recargar();
      await vaciar();
    });
    expect(ultimo?.estado).toEqual(COMPLETADO);
    mockEstado.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => {
      ultimo?.recargar();
      await vaciar();
    });
    expect(ultimo?.estado).toEqual(COMPLETADO);
  });

  it('terminar el diagnóstico lo relee en el acto: la tarjeta se va sin esperar a nadie', async () => {
    await montar();
    expect(ultimo?.estado?.estado).toBe('PENDIENTE');
    mockEstado.mockResolvedValue(COMPLETADO);
    await act(async () => {
      avisarDiagnosticoTerminado();
      await vaciar();
    });
    expect(ultimo?.estado?.estado).toBe('COMPLETADO');
  });

  it('una respuesta vieja no pisa a la nueva', async () => {
    let viejo!: (e: EstadoDeMiDiagnostico) => void;
    mockEstado.mockReturnValueOnce(new Promise(res => { viejo = res; }));
    await montar();
    mockEstado.mockResolvedValueOnce(COMPLETADO);
    await act(async () => {
      ultimo?.recargar();
      await vaciar();
    });
    expect(ultimo?.estado).toEqual(COMPLETADO);
    await act(async () => {
      viejo(PENDIENTE);
      await vaciar();
    });
    expect(ultimo?.estado).toEqual(COMPLETADO);
  });

  it('al cambiar de cuenta no se ve ni un render lo de la anterior', async () => {
    await montar();
    expect(ultimo?.estado).toEqual(PENDIENTE);
    let resolver!: (e: EstadoDeMiDiagnostico) => void;
    mockEstado.mockReturnValue(new Promise(res => { resolver = res; }));
    mockUsuario = { id: 'u-2' };
    const vistos: Array<EstadoDeMiDiagnostico | null> = [];
    function Espia() {
      const e = useEstadoDeMiDiagnostico();
      vistos.push(e.estado);
      return null;
    }
    await act(async () => {
      raiz?.update(React.createElement(Espia));
      await vaciar();
    });
    expect(vistos.every(v => v === null)).toBe(true);
    await act(async () => {
      resolver({ ...PENDIENTE, estado: 'EN_CURSO' });
      await vaciar();
    });
    expect(vistos[vistos.length - 1]?.estado).toBe('EN_CURSO');
  });

  it('sin sesión no pregunta nada', async () => {
    mockUsuario = null;
    await montar();
    expect(mockEstado).not.toHaveBeenCalled();
    expect(ultimo).toMatchObject({ estado: null, cargando: false });
  });

  it('al volver la app a primer plano relee, pero no si la última lectura es reciente', async () => {
    let oyente: ((s: string) => void) | null = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, f: (s: string) => void) => {
      oyente = f;
      return { remove: () => undefined };
    }) as never);
    await montar();
    expect(mockEstado).toHaveBeenCalledTimes(1);
    await act(async () => {
      oyente?.('active');
      await vaciar();
    });
    expect(mockEstado).toHaveBeenCalledTimes(1); // hace segundos: no se vuelve a preguntar
    const ahora = Date.now();
    const reloj = jest.spyOn(Date, 'now').mockReturnValue(ahora + 120_000);
    await act(async () => {
      oyente?.('active');
      await vaciar();
    });
    expect(mockEstado).toHaveBeenCalledTimes(2);
    reloj.mockRestore();
    await volverARenderizar();
  });
});
