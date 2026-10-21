/**
 * La capacidad `canExportRanking` de `GET /api/v1/mentor/context` (spec 006 del backend, T035): decide si Comunidad
 * → Ranking ofrece «Descargar». Mismo criterio que `canAdminister`: lo dice el servidor, no se deduce del rol, y
 * un backend anterior (sin el campo) o una consulta caída no dan el botón.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockCapacidadesDePrograma = jest.fn<() => Promise<Record<string, unknown> | null>>();
jest.mock('../../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: () => mockCapacidadesDePrograma() }));
jest.mock('../../../programa/events/avisoDiaUnoElegido', () => ({ escucharDiaUnoElegido: () => () => undefined }));

import { contextoMentorSchema } from '../../../mentor/api/mentorSchemas';
import { useCapacidades, type Capacidades } from '../useCapacidades';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

async function leerCapacidades(respuesta: Record<string, unknown> | null): Promise<Capacidades> {
  mockCapacidadesDePrograma.mockResolvedValue(respuesta);
  let ultima!: Capacidades;
  function Sonda() {
    ultima = useCapacidades().capacidades;
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  return ultima;
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockCapacidadesDePrograma.mockReset();
});

const BASE = { programRequired: false, canStartProgram: false, canAccompany: true, canAdminister: true };

describe('useCapacidades().exportarRanking', () => {
  it('es verdadero solo con un `true` explícito del servidor', async () => {
    expect((await leerCapacidades({ ...BASE, canExportRanking: true })).exportarRanking).toBe(true);
  });

  it.each([
    ['`false` (mentor, guía, aprendiz)', { ...BASE, canExportRanking: false }],
    ['`null`', { ...BASE, canExportRanking: null }],
    ['ausente: un backend anterior que no manda el campo', BASE],
    ['un texto que no es un booleano', { ...BASE, canExportRanking: 'true' }],
  ])('es falso con %s', async (_caso, respuesta) => {
    expect((await leerCapacidades(respuesta)).exportarRanking).toBe(false);
  });

  it('es falso si la consulta falló (un error de red no es un permiso)', async () => {
    expect(await leerCapacidades(null)).toEqual({
      administrar: false,
      puedeIniciarPrograma: false,
      acompana: false,
      exportarRanking: false,
    });
  });

  it('no mezcla las capacidades: poder administrar no da el botón, y el botón no da Administración', async () => {
    expect(await leerCapacidades({ ...BASE, canAdminister: true, canExportRanking: false })).toMatchObject({
      administrar: true,
      exportarRanking: false,
    });
    act(() => raiz?.unmount());
    expect(await leerCapacidades({ ...BASE, canAdminister: false, canExportRanking: true })).toMatchObject({
      administrar: false,
      exportarRanking: true,
    });
  });
});

describe('el esquema de `/mentor/context`', () => {
  const CONTEXTO = {
    personalProgram: { enrolled: false, day: null },
    canAccompany: false,
    assignments: [],
  };

  it('acepta el campo nuevo y su ausencia (un backend anterior no lo manda)', () => {
    const con = contextoMentorSchema.parse({ ...CONTEXTO, capabilities: { ...BASE, canExportRanking: true } });
    expect(con.capabilities.canExportRanking).toBe(true);
    const sin = contextoMentorSchema.parse({ ...CONTEXTO, capabilities: BASE });
    expect(sin.capabilities.canExportRanking).toBeUndefined();
    const nulo = contextoMentorSchema.parse({ ...CONTEXTO, capabilities: { ...BASE, canExportRanking: null } });
    expect(nulo.capabilities.canExportRanking).toBeNull();
  });
});
