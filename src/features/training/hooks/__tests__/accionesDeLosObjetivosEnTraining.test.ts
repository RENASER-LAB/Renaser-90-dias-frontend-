import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { DatosEntrenamiento } from '../../api/cargarEntrenamiento';

jest.mock('../../../habits/categorias/hooks/useCategoriasDeHabito', () => {
  const estado = { clave: null, listo: true, formacion: null, delServidor: false, categorias: [], dimensiones: [], recargar: () => undefined };
  return { useCategoriasDeHabito: () => estado };
});
const mockCargar = jest.fn<() => Promise<DatosEntrenamiento>>();
jest.mock('../../api/cargarEntrenamiento', () => ({ cargarEntrenamiento: () => mockCargar() }));
jest.mock('../../../../services/http/apiClient', () => ({
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { contextoDeLaEvidencia } from '../../utils/contextoDeLaEvidencia';
import { useTraining } from '../useTraining';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const montados: ReactTestRenderer[] = [];
afterEach(() => { act(() => { montados.splice(0).forEach(raiz => raiz.unmount()); }); });

type Roca = DatosEntrenamiento['rocas'][number];
const roca = (id: string, extra: Partial<Roca> = {}): Roca =>
  ({
    id,
    fecha: '2026-11-03',
    posicion: 1,
    titulo: `Acción ${id}`,
    descripcion: null,
    color: 'VERDE',
    puntajeImpacto: 8,
    esDelegable: false,
    eje: 'CUERPO',
    rocaSemanalId: null,
    horaInicio: '07:00:00',
    horaFin: null,
    completada: false,
    completadaEn: null,
    puntosOtorgados: 0,
    bloqueada: false,
    ...extra,
  }) as Roca;

const datos = (rocas: Roca[]): DatosEntrenamiento => ({ tracks: [], catalogo: [], planHabits: [], rocas, rocasConEvidencia: new Set() });

async function ultimoEstado() {
  let ultimo: ReturnType<typeof useTraining> | null = null;
  function Sonda() {
    ultimo = useTraining();
    return null;
  }
  await act(async () => {
    montados.push(TestRenderer.create(React.createElement(Sonda)));
  });
  return ultimo as unknown as ReturnType<typeof useTraining>;
}

beforeEach(() => mockCargar.mockReset());

describe('las acciones de los objetivos en Training', () => {
  it('issue #115 (5): cada acción lleva su eje, y la hoja de evidencia lo dice en lugar de «Vida y negocio»', async () => {
    mockCargar.mockResolvedValue(
      datos([roca('c', { eje: 'CUERPO' }), roca('n', { eje: 'TRABAJO' }), roca('r', { eje: 'RELACIONES', esDelegable: true })]),
    );
    const { habits } = await ultimoEstado();
    const porId = new Map(habits.map(h => [h.id, h]));

    expect(porId.get('c')).toMatchObject({ dimension: 'VIDA Y NEGOCIO', eje: 'CUERPO' });
    expect(porId.get('n')?.eje).toBe('TRABAJO');
    expect(contextoDeLaEvidencia(porId.get('c')!)).toBe('Cuerpo · Innegociable');
    expect(contextoDeLaEvidencia(porId.get('n')!)).toBe('Negocio y dinero · Innegociable');
    expect(contextoDeLaEvidencia(porId.get('r')!)).toBe('Relaciones · Delegable');
  });
});
