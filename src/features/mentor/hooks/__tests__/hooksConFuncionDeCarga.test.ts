import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { DiasDelAprendiz, SemanaDelAprendiz } from '../../api/mentorApi';
import type { CargarDiasDeLaFicha, CargarSemanaDeLaFicha } from '../../utils/lecturasDeLaFicha';

import { useDiasDelMes } from '../useDiasDelMes';
import { useSemanasDelAprendiz } from '../useSemanasDelAprendiz';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Las semanas y los días de la ficha leen por la función `cargar` que les pasa la ficha (spec 056): así el líder, que no tiene grupo, y
 * el mentor comparten los mismos hooks. Que con `(grupoId, aprendizId)` el mentor siga igual lo prueban los hooks de la 055, sin tocar.
 */
const semana = (hasta: string): SemanaDelAprendiz =>
  ({ personaId: 'u-1', desde: hasta, hasta, primeraSemana: '2026-10-31', diaUno: '2026-11-02', dias: [], zona: 'America/Lima', semanaEnCurso: hasta === '2026-11-20' }) as unknown as SemanaDelAprendiz;

const cargarSemana = jest.fn<CargarSemanaDeLaFicha>();
const cargarDias = jest.fn<CargarDiasDeLaFicha>();
const pedidos = (f: typeof cargarSemana) => f.mock.calls.map(([s]) => s ?? null);

beforeEach(() => {
  cargarSemana.mockReset().mockImplementation(async s => semana(s ?? '2026-11-20'));
  cargarDias.mockReset().mockResolvedValue({ zona: 'America/Lima', diaUno: '2026-11-02', dias: [{ fecha: '2026-11-17', color: 'VERDE', porcentaje: 100, estado: 'MEDIDO' }] } as DiasDelAprendiz);
});

describe('useSemanasDelAprendiz con una función de carga', () => {
  let api!: ReturnType<typeof useSemanasDelAprendiz>;
  function Probador({ cargar }: { cargar: CargarSemanaDeLaFicha | null }) {
    api = useSemanasDelAprendiz(cargar, 'u-1');
    return null;
  }
  async function montar(cargar: CargarSemanaDeLaFicha | null): Promise<ReactTestRenderer> {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(Probador, { cargar }));
    });
    return r;
  }

  it('al abrir pide la semana en curso (sin fecha) y adelanta la anterior, por esa función', async () => { // spec 056 FR-014
    await montar(cargarSemana);
    expect(pedidos(cargarSemana)).toEqual([null, '2026-11-13']);
    expect(api.semanaEnCurso?.hasta).toBe('2026-11-20');
  });

  it('al elegir una fecha pide su semana por la misma función', async () => { // spec 056 FR-014
    await montar(cargarSemana);
    cargarSemana.mockClear();
    await act(async () => api.pedirFecha('2026-11-04'));
    expect(pedidos(cargarSemana)).toContain('2026-11-06');
  });

  it('sin función de carga no pide nada y no se queda cargando', async () => { // spec 056 FR-014
    await montar(null);
    expect(cargarSemana).not.toHaveBeenCalled();
    expect(api.semanaEnCurso).toBeNull();
  });

  it('otra función (otra persona u otra puerta) descarta la caché y vuelve a empezar', async () => { // spec 056 FR-014
    const r = await montar(cargarSemana);
    const otra = jest.fn<CargarSemanaDeLaFicha>().mockImplementation(async s => semana(s ?? '2026-11-20'));
    await act(async () => r.update(React.createElement(Probador, { cargar: otra })));
    expect(pedidos(otra)).toEqual([null, '2026-11-13']);
  });
});

describe('useDiasDelMes con una función de carga', () => {
  let api!: ReturnType<typeof useDiasDelMes>;
  function Probador({ cargar }: { cargar: CargarDiasDeLaFicha | null }) {
    api = useDiasDelMes(cargar, 'u-1');
    return null;
  }
  async function montar(cargar: CargarDiasDeLaFicha | null): Promise<ReactTestRenderer> {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(React.createElement(Probador, { cargar }));
    });
    return r;
  }

  it('pide el mes entero por esa función y guarda el color de cada día', async () => { // spec 056 FR-018
    await montar(cargarDias);
    await act(async () => api.asegurarMes('2026-11-17'));
    expect(cargarDias).toHaveBeenCalledWith('2026-11-01', '2026-11-30');
    expect(api.diaDe('2026-11-17')?.color).toBe('VERDE');
    expect(api.diaUnoDeLosDias).toBe('2026-11-02');
  });

  it('un mes ya pedido no se vuelve a pedir', async () => { // spec 056 FR-018
    await montar(cargarDias);
    await act(async () => api.asegurarMes('2026-11-17'));
    await act(async () => api.asegurarMes('2026-11-03'));
    expect(cargarDias).toHaveBeenCalledTimes(1);
  });

  it('si el pedido falla, los días quedan sin color (nunca verde) y se podrá pedir de nuevo', async () => { // spec 056 FR-018
    cargarDias.mockRejectedValueOnce(new Error('sin red'));
    await montar(cargarDias);
    await act(async () => api.asegurarMes('2026-11-17'));
    expect(api.diaDe('2026-11-17')).toBeNull();
    await act(async () => api.asegurarMes('2026-11-17'));
    expect(api.diaDe('2026-11-17')?.color).toBe('VERDE');
  });

  it('sin función de carga no pide nada', async () => { // spec 056 FR-018
    await montar(null);
    await act(async () => api.asegurarMes('2026-11-17'));
    expect(cargarDias).not.toHaveBeenCalled();
  });

  it('otra función descarta lo guardado de la persona anterior', async () => { // spec 056 FR-018
    const r = await montar(cargarDias);
    await act(async () => api.asegurarMes('2026-11-17'));
    const otra = jest.fn<CargarDiasDeLaFicha>().mockResolvedValue({ zona: null, diaUno: null, dias: [] } as DiasDelAprendiz);
    await act(async () => r.update(React.createElement(Probador, { cargar: otra })));
    expect(api.diaDe('2026-11-17')).toBeNull();
  });
});
