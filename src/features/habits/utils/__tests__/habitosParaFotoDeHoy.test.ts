import { describe, expect, it } from '@jest/globals';

import type { HabitoCatalogoApi, TrackDelDiaApi } from '../../types/habits.types';
import { habitosParaFotoDeHoy } from '../habitosParaFotoDeHoy';

/**
 * Qué ofrece «+ Subir Foto» de Yo (2026-09-29): los hábitos de hoy que Training cerraría con la
 * cámara directa, y ninguno más.
 */

const track = (habitoId: string, estado = 'PENDIENTE'): TrackDelDiaApi => ({
  id: `t-${habitoId}`, habitoId, fechaEjecucion: '2026-09-29', diaPrograma: 10, tipoDia: 'NORMAL',
  esOpcional: false, estado, puntosOtorgados: 0, respuestaTexto: null, calificacionProductividad: null,
  completadoEn: null, tituloHabito: habitoId, tipoHabito: 'CHECKBOX', guia: null, horaDisparo: null, horaLimite: null,
});

const habito = (id: string, evidenceRequirement: string, systemKey: string | null = null): HabitoCatalogoApi => ({
  id, title: id, description: null, habitType: 'CHECKBOX', category: 'BODY', evidenceRequirement,
  isOptional: false, isSystemHabit: systemKey !== null, isDeactivatable: true, systemKey,
});

describe('habitosParaFotoDeHoy', () => {
  it('ofrece solo los que exigen evidencia, siguen abiertos y no tienen flujo propio', () => {
    const tracks = [
      track('foto'),
      track('opcional'),
      track('hecho', 'COMPLETADO'),
      track('vencido', 'EXPIRADO'),
      track('clase'),
      track('huerfano'),
    ];
    const catalogo = [
      habito('foto', 'REQUIRED'),
      habito('opcional', 'OPTIONAL'),
      habito('hecho', 'REQUIRED'),
      habito('vencido', 'REQUIRED'),
      habito('clase', 'REQUIRED', 'DAILY_CLASS'),
    ];
    expect(habitosParaFotoDeHoy(tracks, catalogo, false).map(h => h.track.habitoId)).toEqual(['foto']);
  });

  it('un hábito común se registra con foto y sin pregunta', () => {
    const [comun] = habitosParaFotoDeHoy([track('c')], [habito('c', 'REQUIRED')], false);
    expect(comun.conPregunta).toBe(false);
  });

  it('los rituales ya no se ofrecen para foto (2026-10-31): piden solo texto, en Training', () => {
    for (const clave of ['RITUAL_MORNING', 'RITUAL_MIDDAY', 'RITUAL_NIGHT']) {
      expect(habitosParaFotoDeHoy([track('r')], [habito('r', 'REQUIRED', clave)], false)).toEqual([]);
    }
  });

  it('en web no ofrece nada: ahí la cámara directa no se usa', () => {
    expect(habitosParaFotoDeHoy([track('foto')], [habito('foto', 'REQUIRED')], true)).toEqual([]);
  });
});
