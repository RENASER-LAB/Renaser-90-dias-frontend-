import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * «Completa tu diagnóstico» en Hoy (spec 026): solo con el diagnóstico asignado y sin terminar; si el servidor no tiene la ruta
 * o la persona tiene la ficha estándar, no se dibuja nada.
 */

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
const mockEstado = jest.fn<() => Promise<unknown>>();
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
jest.mock('../../api/diagnosticoApi', () => ({ obtenerEstadoDeMiDiagnostico: () => mockEstado() }));

import { avisarDiagnosticoTerminado } from '../../events/avisoDiagnosticoTerminado';
import { TarjetaDelDiagnosticoPendiente } from '../TarjetaDelDiagnosticoPendiente';
import { textos, tocar, vaciar } from './ayudasDePrueba';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const alAbrir = jest.fn();
const sinNada = (r: ReactTestRenderer) => r.root.findAll(n => typeof n.type === 'string').length === 0;

async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(TarjetaDelDiagnosticoPendiente, { alAbrir }));
    await vaciar();
  });
  return r;
}

const estado = (extra: Record<string, unknown>) => ({ ficha: 'CON_DIAGNOSTICO', estado: 'PENDIENTE', version: null, completedAt: null, ...extra });

beforeEach(() => {
  alAbrir.mockReset();
  mockEstado.mockReset();
});

describe('TarjetaDelDiagnosticoPendiente', () => {
  it('pendiente: «Completa tu diagnóstico · De él nacen tus objetivos de 90 días ›», toda tocable', async () => {
    mockEstado.mockResolvedValue(estado({}));
    const r = await montar();
    expect(textos(r)).toContain('Completa tu diagnóstico | De él nacen tus objetivos de 90 días.');
    await tocar(r, 'Completa tu diagnóstico. De él nacen tus objetivos de 90 días.');
    expect(alAbrir).toHaveBeenCalledTimes(1);
  });

  it('en curso también se ofrece', async () => {
    mockEstado.mockResolvedValue(estado({ estado: 'EN_CURSO', version: 3 }));
    expect(textos(await montar())).toContain('Completa tu diagnóstico');
  });

  it('con la ficha estándar, terminado, sin la ruta (404) o sin red no se dibuja nada', async () => {
    mockEstado.mockResolvedValue(estado({ ficha: 'ESTANDAR', estado: 'NO_APLICA' }));
    expect(sinNada(await montar())).toBe(true);
    mockEstado.mockResolvedValue(estado({ estado: 'COMPLETADO' }));
    expect(sinNada(await montar())).toBe(true);
    mockEstado.mockRejectedValue(new Error('404'));
    expect(sinNada(await montar())).toBe(true);
  });

  it('mientras no se sabe no se dibuja nada (sin parpadeo)', async () => {
    mockEstado.mockReturnValue(new Promise(() => undefined));
    expect(sinNada(await montar())).toBe(true);
  });

  it('se va sola cuando la persona termina el diagnóstico', async () => {
    mockEstado.mockResolvedValue(estado({}));
    const r = await montar();
    expect(textos(r)).toContain('Completa tu diagnóstico');
    mockEstado.mockResolvedValue(estado({ estado: 'COMPLETADO' }));
    await act(async () => {
      avisarDiagnosticoTerminado();
      await vaciar();
    });
    expect(sinNada(r)).toBe(true);
  });
});
