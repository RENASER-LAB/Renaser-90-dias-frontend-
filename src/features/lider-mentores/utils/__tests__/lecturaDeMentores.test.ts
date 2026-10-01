import { describe, expect, it } from '@jest/globals';

import type { IndicadoresApi } from '../../api/liderMentoresSchemas';
import {
  duracionEnPalabras,
  evaluacionEnPalabras,
  gruposEnPalabras,
  mesVecino,
  nombreDelMes,
  observacionesEnPalabras,
  pendientesEnPalabras,
  porcentajeEnPantalla,
  respuestasEnPalabras,
} from '../lecturaDeMentores';

function mentor(cambios: Partial<IndicadoresApi> = {}): IndicadoresApi {
  return {
    userId: 'a1',
    fullName: 'Luisa Rojas',
    avatarUrl: null,
    groups: { source: 'OK', items: [{ id: 'g1', name: 'Grupo Fénix', trainees: 8, semaforo: null }] },
    traineeCount: 8,
    semaforo: { source: 'OK', summary: null },
    attention: { source: 'OK', open: 2, oldestOpenDays: 3, answered: 12, medianResponseHours: 4 },
    evaluation: {
      source: 'OK', month: '2026-09', percentage: 80, delivered: 16, expected: 20, traineesEvaluated: 3,
      state: 'CALCULADA', formulaVersion: 'v1',
    },
    ...cambios,
  };
}

describe('lecturaDeMentores', () => {
  it('nombra el mes y salta de año', () => {
    expect(nombreDelMes('2026-09')).toBe('septiembre');
    expect(nombreDelMes('2026-09', true)).toBe('septiembre de 2026');
    expect(mesVecino('2026-01', -1)).toBe('2025-12');
    expect(mesVecino('2026-12', 1)).toBe('2027-01');
  });

  it('grupos: uno por su nombre, varios por cantidad, ninguno lo dice, y caído no es cero', () => {
    expect(gruposEnPalabras(mentor())).toBe('Grupo Fénix · 8 aprendices');
    expect(gruposEnPalabras(mentor({ groups: { source: 'OK', items: [] }, traineeCount: 0 }))).toBe('Sin grupo a cargo hoy');
    expect(gruposEnPalabras(mentor({ groups: { source: 'UNAVAILABLE', items: null }, traineeCount: null }))).toBe(
      'No se pudieron leer sus grupos',
    );
  });

  it('pendientes: con antigüedad, sin pendientes, mes cerrado (null) y fuente caída', () => {
    expect(pendientesEnPalabras(mentor())).toBe('2 consultas sin responder · la más antigua, hace 3 días');
    expect(pendientesEnPalabras(mentor({ attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null } }))).toBe(
      'Sin consultas por responder',
    );
    expect(pendientesEnPalabras(mentor({ attention: { source: 'OK', open: null, oldestOpenDays: null, answered: 3, medianResponseHours: 2 } }))).toBeNull();
    expect(pendientesEnPalabras(mentor({ attention: { source: 'UNAVAILABLE', open: null, oldestOpenDays: null, answered: null, medianResponseHours: null } }))).toBe(
      'Consultas: no se pudieron leer',
    );
  });

  it('respuestas: con su n y el tiempo típico; sin respuestas no hay «0 h»', () => {
    expect(respuestasEnPalabras(mentor(), '2026-09')).toBe('12 respondidas en septiembre · suele responder en 4 h');
    expect(
      respuestasEnPalabras(mentor({ attention: { source: 'OK', open: 0, oldestOpenDays: null, answered: 0, medianResponseHours: null } }), '2026-09'),
    ).toBe('Ninguna consulta respondida en septiembre');
    expect(duracionEnPalabras(0.5)).toBe('30 min');
    expect(duracionEnPalabras(52)).toBe('2 días');
  });

  it('evaluación: con denominador, sin muestra, sin historial y caída', () => {
    expect(evaluacionEnPalabras(mentor(), '2026-09')).toBe('Evaluación de septiembre: 80 % (16 de 20 evidencias)');
    const sinMuestra = mentor({ evaluation: { ...mentor().evaluation, percentage: null, state: 'SIN_MUESTRA' } });
    expect(evaluacionEnPalabras(sinMuestra, '2026-09')).toBe('Evaluación de septiembre: todavía nada que medir');
    const sinHistorial = mentor({ evaluation: { ...mentor().evaluation, percentage: null, state: 'SIN_HISTORIAL' } });
    expect(evaluacionEnPalabras(sinHistorial, '2026-09')).toBe('Evaluación de septiembre: sin grupo en ese mes');
    const conDecimales = mentor({ evaluation: { ...mentor().evaluation, percentage: 59.5238 } });
    expect(evaluacionEnPalabras(conDecimales, '2026-09')).toBe('Evaluación de septiembre: 60 % (16 de 20 evidencias)');
    const caida = mentor({ evaluation: { ...mentor().evaluation, source: 'UNAVAILABLE', percentage: null, state: null } });
    expect(evaluacionEnPalabras(caida, '2026-09')).toBe('Evaluación de septiembre: no se pudo leer');
  });

  it('observaciones del mes y redondeo solo en pantalla', () => {
    expect(observacionesEnPalabras({ source: 'OK', recognitions: 1, suggestions: 0, alerts: 2 })).toBe(
      'Le dijiste: 1 reconocimiento, 2 alertas',
    );
    expect(observacionesEnPalabras({ source: 'OK', recognitions: 0, suggestions: 0, alerts: 0 })).toBe(
      'No le dijiste nada este mes',
    );
    expect(porcentajeEnPantalla(79.96)).toBe('80 %');
  });
});
