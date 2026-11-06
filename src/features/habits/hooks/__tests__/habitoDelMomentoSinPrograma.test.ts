/**
 * Issue #148: para el personal sin programa propio, Hoy pedía `GET /habit-tracks/today` en cada apertura, el servidor respondía
 * 404 «Participante no encontrado» y la app anotaba «[Hoy] no se pudieron leer los hábitos de hoy».
 *
 * Con `/home` diciendo `inscrito: false` no se pide nada; mientras no se sabe se pide como siempre y un 404 queda en silencio.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockObtener = jest.fn<() => Promise<unknown[]>>();

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (cb: () => void) => useEffect(cb, [cb]) };
});
jest.mock('../../../../hooks/useMinutoActual', () => ({ useMinutoActual: () => new Date('2026-11-06T10:00:00') }));
jest.mock('../../api/habitsApi', () => ({ obtenerTracksDeHoy: () => mockObtener() }));
jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError };
});

import { ApiError } from '../../../../services/http/apiClient';
import { useHabitoDelMomento } from '../useHabitoDelMomento';

type Resultado = ReturnType<typeof useHabitoDelMomento>;

function montar(inscrito?: boolean): { ultimo: () => Resultado; renderer: ReactTestRenderer } {
  let ultimo: Resultado | null = null;
  function Sonda(): null {
    ultimo = useHabitoDelMomento(inscrito);
    return null;
  }
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Sonda));
  });
  return { ultimo: () => ultimo as unknown as Resultado, renderer };
}

describe('useHabitoDelMomento sin programa (issue #148)', () => {
  let warn: ReturnType<typeof jest.spyOn>;
  beforeEach(() => {
    mockObtener.mockReset();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('con inscrito = false no pide los hábitos de hoy ni avisa', async () => {
    const { ultimo, renderer } = montar(false);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockObtener).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(ultimo().registrosLeidos).toBe(false);
    expect(ultimo().registrosDeHoy).toBe(0);
    act(() => renderer.unmount());
  });

  it('un 404 «Participante no encontrado» queda en silencio', async () => {
    mockObtener.mockRejectedValue(new (ApiError as unknown as new (s: number, m: string) => Error)(404, 'Participante no encontrado: x'));
    const { ultimo, renderer } = montar(undefined);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockObtener).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(ultimo().registrosLeidos).toBe(false);
    act(() => renderer.unmount());
  });

  it('otro fallo se sigue anotando', async () => {
    mockObtener.mockRejectedValue(new Error('red'));
    const { renderer } = montar(true);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(warn).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('con programa lee los registros como siempre', async () => {
    mockObtener.mockResolvedValue([]);
    const { ultimo, renderer } = montar(true);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockObtener).toHaveBeenCalledTimes(1);
    expect(ultimo().registrosLeidos).toBe(true);
    act(() => renderer.unmount());
  });
});
