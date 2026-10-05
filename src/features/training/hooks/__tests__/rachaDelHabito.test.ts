import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import type { PlanHabit } from '../../../../screens/PlanScreen';
import type { HabitoCatalogoApi, TrackDelDiaApi } from '../../../habits/types/habits.types';
import { habitsSchemas } from '../../../habits/api/habitsSchemas';
import type { DatosEntrenamiento } from '../../api/cargarEntrenamiento';

const mockCargar = jest.fn<() => Promise<DatosEntrenamiento>>();
jest.mock('../../api/cargarEntrenamiento', () => ({ cargarEntrenamiento: () => mockCargar() }));
jest.mock('../../../../services/http/apiClient', () => ({
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { useTraining } from '../useTraining';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const catalogo = (id: string): HabitoCatalogoApi =>
  ({ id, title: id, category: 'BODY', evidenceRequirement: 'OPTIONAL', systemKey: null }) as unknown as HabitoCatalogoApi;

const enElPlan = (id: string): PlanHabit =>
  ({ id, title: id, time: '07:00', locked: false, isOptional: false, isDeactivatable: true, days: {} }) as unknown as PlanHabit;

const trackDeHoy = (habitoId: string, extra: Partial<TrackDelDiaApi>): TrackDelDiaApi =>
  ({
    id: `track-${habitoId}`,
    habitoId,
    fechaEjecucion: '2026-10-05',
    diaPrograma: 15,
    tipoDia: 'DISCIPLINA',
    esOpcional: false,
    estado: 'PENDIENTE',
    puntosOtorgados: 0,
    respuestaTexto: null,
    calificacionProductividad: null,
    completadoEn: null,
    tituloHabito: habitoId,
    tipoHabito: 'CHECKBOX',
    guia: null,
    horaDisparo: '07:00:00',
    horaLimite: null,
    ...extra,
  }) as TrackDelDiaApi;

/**
 * Cuatro tarjetas: DORMIR con la racha del servidor (5), JUGO con un backend anterior (sin el
 * campo), CAMINAR sin track de hoy (no le toca o está en pausa) y una roca.
 */
const DATOS: DatosEntrenamiento = {
  tracks: [trackDeHoy('dormir', { rachaDias: 5 }), trackDeHoy('jugo', {}), trackDeHoy('agua', { rachaDias: 0 })],
  catalogo: [catalogo('dormir'), catalogo('jugo'), catalogo('caminar'), catalogo('agua')],
  planHabits: [enElPlan('dormir'), enElPlan('jugo'), enElPlan('caminar'), enElPlan('agua')],
  rocas: [{ id: 'roca-1', titulo: 'Llamar a tres clientes', completada: false } as DatosEntrenamiento['rocas'][number]],
  rocasConEvidencia: new Set(),
};

async function ultimoEstado() {
  let ultimo: ReturnType<typeof useTraining> | null = null;
  function Sonda() {
    ultimo = useTraining();
    return null;
  }
  await act(async () => {
    TestRenderer.create(React.createElement(Sonda));
  });
  return ultimo as unknown as ReturnType<typeof useTraining>;
}

/**
 * D-254 (2026-10-05, pedido del dueño): la racha de cada tarjeta de Training es la del servidor.
 * Contra el código anterior falla: `useTraining` fijaba `streak: 0` en todas, y la tarjeta mostraba
 * «🔥 0 días» siempre, también en las rocas y contra un backend que no sabe de rachas.
 */
describe('Training: la racha de cada hábito', () => {
  beforeEach(() => {
    mockCargar.mockReset();
    mockCargar.mockResolvedValue(DATOS);
  });

  it('usa `rachaDias` del track de hoy, también cuando es 0', async () => {
    const { habits } = await ultimoEstado();
    const porHabito = new Map(habits.map(h => [h.habitoId ?? h.id, h.streak]));

    expect(porHabito.get('dormir')).toBe(5);
    expect(porHabito.get('agua')).toBe(0);
  });

  it('sin el campo (backend anterior), sin track de hoy o en una roca: null, nunca un 0 inventado', async () => {
    const { habits } = await ultimoEstado();
    const porHabito = new Map(habits.map(h => [h.habitoId ?? h.id, h.streak]));

    expect(porHabito.get('jugo')).toBeNull();
    expect(porHabito.get('caminar')).toBeNull();
    expect(porHabito.get('roca-1')).toBeNull();
    expect(habits.find(h => h.habitoId === 'caminar')?.tieneTrackHoy).toBe(false);
  });

  it('el esquema acepta `rachaDias`, lo deja pasar ausente o null, y rechaza un número negativo', () => {
    const base = trackDeHoy('dormir', {});
    expect(habitsSchemas.tracksDeHoy.safeParse([{ ...base, rachaDias: 3 }]).success).toBe(true);
    expect(habitsSchemas.tracksDeHoy.safeParse([base]).success).toBe(true);
    expect(habitsSchemas.tracksDeHoy.safeParse([{ ...base, rachaDias: null }]).success).toBe(true);
    expect(habitsSchemas.tracksDeHoy.safeParse([{ ...base, rachaDias: -1 }]).success).toBe(false);
  });

  it('la tarjeta solo dibuja la llama si hay racha, y ya no queda ningún `streak: 0` fijo', () => {
    const raiz = path.resolve(__dirname, '..', '..', '..', '..');
    const pantalla = fs.readFileSync(path.join(raiz, 'screens/TrainingScreen.tsx'), 'utf-8');
    const hook = fs.readFileSync(path.join(raiz, 'features/training/hooks/useTraining.ts'), 'utf-8');

    expect(pantalla).toMatch(/\{habit\.streak != null && \(\s*<View style=\{styles\.racha\}/);
    expect(hook).not.toMatch(/streak: 0/);
  });
});
