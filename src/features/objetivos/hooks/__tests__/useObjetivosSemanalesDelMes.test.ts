/**
 * `useObjetivosSemanalesDelMes` (spec 028): una lectura por semana, solo mientras la hoja está abierta y solo de las semanas que se
 * piden; sin releer al volver a un mes; sin datos de una apertura anterior; un fallo no tumba las demás semanas.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { EjeObjetivo, RocaMaestraApi, RocaSemanalApi } from '../../types/objetivos.types';

const mockLeer = jest.fn<(semana?: number) => Promise<RocaSemanalApi[]>>();
jest.mock('../../api/objetivosApi', () => ({ obtenerRocasSemanales: (semana?: number) => mockLeer(semana) }));

import { ApiError } from '../../../../services/http/apiClient';
import { useObjetivosSemanalesDelMes } from '../useObjetivosSemanalesDelMes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MAESTRAS = [
  { id: 'm-cuerpo', eje: 'CUERPO' },
  { id: 'm-trabajo', eje: 'TRABAJO' },
] as unknown as RocaMaestraApi[];
const semanal = (numeroSemana: number, rocaMaestraId: string, titulo: string) =>
  ({ id: `s${numeroSemana}${rocaMaestraId}`, rocaMaestraId, numeroSemana, titulo, autoevaluacionFin: null }) as unknown as RocaSemanalApi;

type Lectura = ReturnType<typeof useObjetivosSemanalesDelMes>;
let raiz: ReactTestRenderer | null = null;
let ultima: Lectura;

interface Entrada {
  activo: boolean;
  semanas: number[];
  eje?: EjeObjetivo;
}
function Sonda({ activo, semanas, eje = 'CUERPO' }: Entrada) {
  ultima = useObjetivosSemanalesDelMes({ activo, semanas, maestras: MAESTRAS, eje });
  return null;
}
async function montar(entrada: Entrada) {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda, entrada));
  });
}
async function actualizar(entrada: Entrada) {
  await act(async () => {
    raiz!.update(React.createElement(Sonda, entrada));
  });
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeer.mockReset();
});

describe('useObjetivosSemanalesDelMes', () => {
  it('con la hoja cerrada no lee nada', async () => {
    await montar({ activo: false, semanas: [5, 6] });
    expect(mockLeer).not.toHaveBeenCalled();
    expect(ultima.deLaSemana(5)).toBeUndefined();
  });

  it('lee cada semana pedida una vez y devuelve el objetivo del eje de cada una', async () => {
    mockLeer.mockImplementation(async semana =>
      semana === 5 ? [semanal(5, 'm-cuerpo', 'Llegar a 85 kg'), semanal(5, 'm-trabajo', 'Cerrar 2 ventas')] : [semanal(6, 'm-trabajo', 'Cerrar 3 ventas')],
    );
    await montar({ activo: true, semanas: [5, 6] });
    expect(mockLeer.mock.calls.map(([n]) => n).sort()).toEqual([5, 6]);
    expect(ultima.deLaSemana(5)?.titulo).toBe('Llegar a 85 kg');
    // Se leyó la 6 y ese eje no tiene objetivo: `null`, no `undefined`.
    expect(ultima.deLaSemana(6)).toBeNull();
    // Una semana que no se pidió no se leyó.
    expect(ultima.deLaSemana(7)).toBeUndefined();
  });

  it('cambiar de eje no vuelve a leer: el mismo pedido sirve para los tres', async () => {
    mockLeer.mockResolvedValue([semanal(5, 'm-cuerpo', 'Cuerpo'), semanal(5, 'm-trabajo', 'Trabajo')]);
    await montar({ activo: true, semanas: [5], eje: 'CUERPO' });
    await actualizar({ activo: true, semanas: [5], eje: 'TRABAJO' });
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(ultima.deLaSemana(5)?.titulo).toBe('Trabajo');
  });

  it('al cambiar de mes lee solo las semanas nuevas, y al volver no repite las ya leídas', async () => {
    mockLeer.mockResolvedValue([]);
    await montar({ activo: true, semanas: [1, 2, 3] });
    await actualizar({ activo: true, semanas: [5, 6] });
    await actualizar({ activo: true, semanas: [1, 2, 3] });
    expect(mockLeer.mock.calls.map(([n]) => n)).toEqual([1, 2, 3, 5, 6]);
  });

  it('al cerrar la hoja suelta lo leído, y al abrirla otra vez lo relee', async () => {
    mockLeer.mockResolvedValue([semanal(5, 'm-cuerpo', 'Primera vez')]);
    await montar({ activo: true, semanas: [5] });
    await actualizar({ activo: false, semanas: [5] });
    expect(ultima.deLaSemana(5)).toBeUndefined();
    mockLeer.mockResolvedValue([semanal(5, 'm-cuerpo', 'Segunda vez')]);
    await actualizar({ activo: true, semanas: [5] });
    expect(mockLeer).toHaveBeenCalledTimes(2);
    expect(ultima.deLaSemana(5)?.titulo).toBe('Segunda vez');
  });

  it('un fallo de una semana no tumba las demás: esa queda sin leer (nunca «sin objetivo» inventado)', async () => {
    mockLeer.mockImplementation(async semana => {
      if (semana === 5) throw new Error('sin red');
      return [semanal(6, 'm-cuerpo', 'Llegar a 84 kg')];
    });
    await montar({ activo: true, semanas: [5, 6] });
    expect(ultima.deLaSemana(5)).toBeUndefined();
    expect(ultima.deLaSemana(6)?.titulo).toBe('Llegar a 84 kg');
  });

  it('un 403 (todavía sin los tres objetivos de 90 días) no es un error: esa semana no tiene objetivo', async () => {
    mockLeer.mockRejectedValue(new ApiError(403, 'ROCKS_LOCKED'));
    await montar({ activo: true, semanas: [5] });
    expect(ultima.deLaSemana(5)).toBeNull();
  });
});
