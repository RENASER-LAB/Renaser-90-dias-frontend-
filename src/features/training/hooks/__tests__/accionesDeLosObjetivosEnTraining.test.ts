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

import { conElCierreConfirmado } from '../../utils/cierreConfirmado';
import { contextoDeLaEvidencia } from '../../utils/contextoDeLaEvidencia';
import { contarElDia, textoDelResumenDeHoy } from '../../utils/listaDelDia';
import { itemsDeHoy, puntosDeHoy } from '../../utils/itemsDelDia';
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

beforeEach(() => {
  mockCargar.mockReset();
});

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

  /**
   * Issue #115 (6): «1 de 23 hechos · 0 pts» tras cumplir una acción. Los puntos de una acción son los que el servidor guardó en la acción
   * (`puntosOtorgados` de `GET /rocks/today`), y el resumen del día los suma igual que los de los hábitos.
   */
  it('issue #115 (6): el resumen del día suma lo que el servidor pagó por las acciones cumplidas, igual que por los hábitos', async () => {
    mockCargar.mockResolvedValue({
      tracks: [
        {
          id: 'track-agua', habitoId: 'agua', fechaEjecucion: '2026-11-03', diaPrograma: 13, tipoDia: 'DISCIPLINA', esOpcional: false, estado: 'COMPLETADO',
          puntosOtorgados: 8, respuestaTexto: null, calificacionProductividad: null, completadoEn: '2026-11-03T12:00:00Z', tituloHabito: 'Agua', tipoHabito: 'CHECKBOX',
          guia: null, horaDisparo: '07:00:00', horaLimite: null,
        } as unknown as DatosEntrenamiento['tracks'][number],
      ],
      catalogo: [{ id: 'agua', title: 'Agua', category: 'BODY', evidenceRequirement: 'OPTIONAL', systemKey: null } as unknown as DatosEntrenamiento['catalogo'][number]],
      planHabits: [{ id: 'agua', title: 'Agua', time: '07:00', locked: false, isOptional: false, isDeactivatable: true, days: {} } as unknown as DatosEntrenamiento['planHabits'][number]],
      rocas: [
        roca('a1', { completada: true, completadaEn: '2026-11-03T18:55:00Z', puntosOtorgados: 10 }),
        roca('a2', { eje: 'TRABAJO', completada: true, completadaEn: '2026-11-03T19:10:00Z', puntosOtorgados: 6 }),
        roca('a3', { eje: 'RELACIONES' }),
      ],
      rocasConEvidencia: new Set(['a1', 'a2']),
    });
    const { habits } = await ultimoEstado();
    const items = itemsDeHoy(habits, [], { hoyIso: '2026-11-03', zona: null, titulos: {} });

    expect(items.filter(x => x.tipo === 'accion' && x.hecho).map(x => x.puntos)).toEqual([10, 6]);
    expect(puntosDeHoy(items)).toBe(8 + 10 + 6);
    const { hechos, total } = contarElDia(items);
    expect(textoDelResumenDeHoy(hechos, total, puntosDeHoy(items))).toBe('3 de 4 hechos · 24 pts');
  });

  it('issue #115 (6): una acción que el servidor pagó en 0 (fuera de plazo) suma 0, sin inventar puntos', async () => {
    mockCargar.mockResolvedValue(datos([roca('tarde', { completada: true, completadaEn: '2026-11-03T19:10:00Z', puntosOtorgados: 0 })]));
    const { habits } = await ultimoEstado();
    expect(puntosDeHoy(itemsDeHoy(habits, [], { hoyIso: '2026-11-03', zona: null, titulos: {} }))).toBe(0);
  });
});

/**
 * El cierre que el servidor acaba de confirmar se refleja en la lista antes de la relectura: con los puntos que el servidor respondió, para que el
 * resumen no se quede en «0 pts» mientras llega lo verdadero.
 */
describe('conElCierreConfirmado', () => {
  const pendiente = { id: 'a1', done: false, hasEvidence: false, estado: 'PENDIENTE', puntosOtorgados: null as number | null | undefined };

  it('marca lo hecho y pone los puntos que el servidor pagó', () => {
    expect(conElCierreConfirmado(pendiente, true, 10)).toEqual({ id: 'a1', done: true, hasEvidence: true, estado: 'COMPLETADO', puntosOtorgados: 10 });
  });

  it('un 0 pagado por el servidor se respeta; sin respuesta no se inventa nada y se conserva lo que había', () => {
    expect(conElCierreConfirmado(pendiente, false, 0).puntosOtorgados).toBe(0);
    expect(conElCierreConfirmado(pendiente, false).puntosOtorgados).toBeNull();
    expect(conElCierreConfirmado({ ...pendiente, puntosOtorgados: 5 }, false, undefined).puntosOtorgados).toBe(5);
    expect(conElCierreConfirmado(pendiente, false, null).puntosOtorgados).toBeNull();
  });

  it('con la lista reflejada, el resumen del día ya suma los puntos de la acción', () => {
    const base = { tieneTrackHoy: true, dimension: 'VIDA Y NEGOCIO', title: 'Entrenar piernas', time: '07:00', tag: 'Innegociable', streak: null };
    const accion = { ...base, ...pendiente } as unknown as Parameters<typeof itemsDeHoy>[0][number];
    const antes = itemsDeHoy([accion], [], { hoyIso: '2026-11-03', zona: null, titulos: {} });
    expect(puntosDeHoy(antes)).toBe(0);
    const despues = itemsDeHoy([conElCierreConfirmado(accion, true, 10)], [], { hoyIso: '2026-11-03', zona: null, titulos: {} });
    expect(puntosDeHoy(despues)).toBe(10);
    expect(textoDelResumenDeHoy(contarElDia(despues).hechos, contarElDia(despues).total, puntosDeHoy(despues))).toBe('1 de 1 hecho · 10 pts');
  });
});
