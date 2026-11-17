import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { ApiError } from '../../../../services/http/apiClient';
import type { SemanaDelAprendiz } from '../../api/mentorApi';

const mockObtener = jest.fn<(g: string, u: string, semanaHasta?: string | null) => Promise<SemanaDelAprendiz>>();
jest.mock('../../api/mentorApi', () => ({ obtenerSemanaDelAprendiz: (g: string, u: string, s?: string | null) => mockObtener(g, u, s) }));

import { useSemanasDelAprendiz } from '../useSemanasDelAprendiz';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Una semana de sábado a viernes que termina en `hasta`; el Día 1 cae en la semana del 31/10 al 6/11. */
const semana = (hasta: string): SemanaDelAprendiz =>
  ({ personaId: 'u-1', desde: hasta, hasta, primeraSemana: '2026-10-31', diaUno: '2026-11-02', dias: [], zona: 'America/Lima', semanaEnCurso: hasta === '2026-11-20' }) as unknown as SemanaDelAprendiz;

let api!: ReturnType<typeof useSemanasDelAprendiz>;
const avisarQueYaNoAcompana = jest.fn<(motivo: string) => void>();
function Probador({ grupo = 'g-1' }: { grupo?: string }) {
  api = useSemanasDelAprendiz(grupo, 'u-1', avisarQueYaNoAcompana);
  return null;
}
async function montar(): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(Probador));
  });
  return r;
}
const pedidos = () => mockObtener.mock.calls.map(([, , s]) => s ?? null);

beforeEach(() => {
  mockObtener.mockReset();
  avisarQueYaNoAcompana.mockReset();
  mockObtener.mockImplementation(async (_g, _u, s) => semana(s ?? '2026-11-20'));
});

describe('las semanas de la ficha', () => {
  it('al abrir pide la semana en curso (sin fecha) y adelanta la anterior', async () => { // spec 055 FR-016
    await montar();
    expect(pedidos()).toEqual([null, '2026-11-13']);
    expect(api.semanaEnCurso?.hasta).toBe('2026-11-20');
    expect(api.estadoDe('2026-11-13')).toBe('lista');
  });

  it('al elegir una fecha pide su semana y adelanta la anterior; volver a una ya vista no pide de nuevo', async () => { // spec 055 FR-016, SC-004
    await montar();
    mockObtener.mockClear();

    await act(async () => api.pedirFecha('2026-11-10')); // semana que cierra el 13/11, ya adelantada
    expect(pedidos()).toEqual(['2026-11-06']); // solo se adelanta la anterior a esa
    mockObtener.mockClear();

    await act(async () => api.pedirFecha('2026-11-17')); // la de hoy, ya vista
    await act(async () => api.pedirFecha('2026-11-10'));
    expect(mockObtener).not.toHaveBeenCalled();
  });

  it('no adelanta una semana anterior al Día 1 del programa', async () => { // spec 055 FR-016
    await montar();
    await act(async () => api.pedirFecha('2026-11-04')); // semana que cierra el 6/11: la primera
    expect(pedidos()).not.toContain('2026-10-30');
  });

  it('una semana que ya viaja no se pide dos veces', async () => { // spec 055 FR-016
    await montar();
    mockObtener.mockClear();
    mockObtener.mockImplementation(() => new Promise(() => undefined));
    await act(async () => {
      api.pedirFecha('2026-11-04');
      api.pedirFecha('2026-11-05');
    });
    expect(pedidos().filter(s => s === '2026-11-06')).toHaveLength(1);
  });

  it('al cerrar la ficha se descarta la caché: la siguiente abre y vuelve a pedir', async () => { // spec 055 FR-016
    const r = await montar();
    await act(async () => r.unmount());
    mockObtener.mockClear();
    await montar();
    expect(pedidos()[0]).toBeNull();
  });

  it('sin internet, una semana no cargada dice que hace falta conexión y lo ya cargado se sigue viendo', async () => { // spec 055 FR-016
    await montar();
    mockObtener.mockImplementation(async () => {
      throw new ApiError(0, 'Sin conexión');
    });
    await act(async () => api.pedirFecha('2026-11-04'));
    expect(api.estadoDe('2026-11-06')).toBe('fallo');
    expect(api.falloDe('2026-11-06')?.tipo).toBe('sin_red');
    expect(api.falloDe('2026-11-06')?.mensaje).toMatch(/conexión/);
    expect(api.semanaDe('2026-11-20')).not.toBeNull();
  });

  it('un motivo del servidor se muestra tal cual, y «reintentar» vuelve a pedir esa semana', async () => { // spec 055 FR-016
    await montar();
    mockObtener.mockImplementation(async () => {
      throw new ApiError(400, 'Esa semana es anterior al Día 1 del aprendiz.', { codigo: 'FUERA_DEL_PROGRAMA' });
    });
    await act(async () => api.pedirFecha('2026-11-04'));
    expect(api.falloDe('2026-11-06')?.mensaje).toBe('Esa semana es anterior al Día 1 del aprendiz.');
    mockObtener.mockImplementation(async (_g, _u, s) => semana(s ?? '2026-11-20'));
    await act(async () => api.reintentar('2026-11-06'));
    expect(api.estadoDe('2026-11-06')).toBe('lista');
  });

  it('si el servidor dice que ya no lo acompaña, avisa con su motivo y no queda ningún dato viejo', async () => { // spec 055 FR-017
    await montar();
    mockObtener.mockImplementation(async () => {
      throw new ApiError(403, 'Ya no acompañas a este aprendiz.', { codigo: 'NO_ACOMPANA' });
    });
    await act(async () => api.pedirFecha('2026-11-04'));
    expect(avisarQueYaNoAcompana).toHaveBeenCalledWith('Ya no acompañas a este aprendiz.');
    expect(api.semanaDe('2026-11-20')).toBeNull();
    expect(api.semanaEnCurso).toBeNull();
  });
});
