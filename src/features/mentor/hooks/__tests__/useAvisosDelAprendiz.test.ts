import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type { AvisoApi } from '../../api/avisosApi';

const mockLeer = jest.fn<() => Promise<AvisoApi[]>>();
const mockMarcar = jest.fn<(id: number) => Promise<void>>();
jest.mock('../../api/avisosApi', () => {
  const actual = jest.requireActual<typeof import('../../api/avisosApi')>('../../api/avisosApi');
  return { ...actual, obtenerAvisosDeAcompanamiento: () => mockLeer(), marcarAvisoLeido: (id: number) => mockMarcar(id) };
});

import { useAvisosDelAprendiz } from '../useAvisosDelAprendiz';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const aviso = (id: number, alumno: string, readAt: string | null = null): AvisoApi =>
  ({ id, type: 'ACOMPANAMIENTO_ALUMNO', title: 't', body: `aviso ${id}`, createdAt: `2026-11-1${id}T10:00:00Z`, readAt, route: `/mentor/groups/g-1/learners/${alumno}` }) as AvisoApi;

let motivo: string | null = null;
function Probador({ aprendizId }: { aprendizId: string | null }) {
  motivo = useAvisosDelAprendiz(aprendizId).motivoDelAviso;
  return null;
}
const abrir = (aprendizId: string | null) =>
  act(async () => {
    TestRenderer.create(React.createElement(Probador, { aprendizId }));
  });

beforeEach(() => {
  mockLeer.mockReset();
  mockMarcar.mockReset().mockResolvedValue(undefined);
  motivo = null;
});

describe('abrir la ficha marca sus avisos como leídos', () => {
  it('marca solo los avisos sin leer de ESE aprendiz, con el endpoint de siempre', async () => { // spec 055 FR-009, SC-007
    mockLeer.mockResolvedValue([aviso(1, 'u-1'), aviso(2, 'u-1'), aviso(3, 'u-2'), aviso(4, 'u-1', '2026-11-12T00:00:00Z')]);
    await abrir('u-1');
    expect(mockMarcar.mock.calls.map(([id]) => id).sort()).toEqual([1, 2]);
  });

  it('el motivo de la cabecera es el aviso vigente más reciente, tomado antes de marcarlos', async () => { // spec 055 FR-009
    mockLeer.mockResolvedValue([aviso(1, 'u-1'), aviso(2, 'u-1')]);
    await abrir('u-1');
    expect(motivo).toBe('aviso 2');
  });

  it('si uno falla, los otros igual quedan leídos y la ficha no se entera', async () => { // spec 055 FR-009
    mockLeer.mockResolvedValue([aviso(1, 'u-1'), aviso(2, 'u-1')]);
    mockMarcar.mockImplementation(async id => {
      if (id === 1) throw new Error('boom');
    });
    await abrir('u-1');
    expect(mockMarcar).toHaveBeenCalledTimes(2);
  });

  it('si la bandeja no responde no pasa nada, y sin aprendiz no pregunta', async () => { // spec 055 FR-009
    mockLeer.mockRejectedValue(new Error('sin red'));
    await abrir('u-1');
    expect(motivo).toBeNull();
    expect(mockMarcar).not.toHaveBeenCalled();
    mockLeer.mockClear();
    await abrir(null);
    expect(mockLeer).not.toHaveBeenCalled();
  });
});
