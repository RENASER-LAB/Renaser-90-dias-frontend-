import { describe, expect, it } from '@jest/globals';

import type { AvisoApi } from '../../api/avisosApi';
import { avisoVigenteDe, estadoDeLaSemana, motivoCorto, motivoDeLaFila } from '../motivoDeLaFila';

const aviso = (id: number, alumnoId: string, body: string, createdAt: string, readAt: string | null = null): AvisoApi =>
  ({ id, type: 'ACOMPANAMIENTO_ALUMNO', title: 't', body, createdAt, readAt, route: `/mentor/groups/g-1/learners/${alumnoId}` }) as AvisoApi;
const dias = (...colores: Array<'VERDE' | 'AMARILLO' | 'ROJO' | 'SIN_DATOS'>) => colores.map(color => ({ color }));

describe('la línea gris de cada fila', () => {
  it('con un aviso vigente, dice el aviso más reciente de ESA persona', () => { // spec 055 FR-006
    const avisos = [
      aviso(1, 'u-1', 'no registra actividad hace 9 días', '2026-11-10T10:00:00Z'),
      aviso(2, 'u-1', 'no registra actividad hace 12 días', '2026-11-13T10:00:00Z'),
      aviso(3, 'u-2', 'aviso de otra persona', '2026-11-16T10:00:00Z'),
    ];
    expect(motivoDeLaFila({ aprendizId: 'u-1', color: 'ROJO', dias: [], avisos })).toBe('12 días sin actividad');
  });

  it('un aviso ya leído no cuenta como vigente', () => { // spec 055 FR-006
    const avisos = [aviso(1, 'u-1', 'viejo', '2026-11-10T10:00:00Z', '2026-11-11T10:00:00Z')];
    expect(avisoVigenteDe('u-1', avisos)).toBeNull();
    expect(motivoDeLaFila({ aprendizId: 'u-1', color: 'VERDE', dias: dias('VERDE'), avisos })).toBe('Al día');
  });

  it('sin aviso: «Cumplió N de 7 días» en rojo o ámbar, «Al día» en verde y «Todavía sin datos» sin datos', () => { // spec 055 FR-006
    const d = dias('VERDE', 'VERDE', 'VERDE', 'VERDE', 'ROJO', 'ROJO', 'AMARILLO');
    expect(motivoDeLaFila({ aprendizId: 'u-1', color: 'AMARILLO', dias: d, avisos: [] })).toBe('Cumplió 4 de 7 días');
    expect(estadoDeLaSemana('VERDE', d)).toBe('Al día');
    expect(estadoDeLaSemana('SIN_DATOS', [])).toBe('Todavía sin datos');
  });

  it('el aviso va corto y sin repetir el nombre que ya está arriba (menos texto, pedido del dueño)', () => { // spec 055 FR-006
    expect(motivoCorto('E2E Aprendiz tiene 63 evidencias pendientes.', 'E2E Aprendiz')).toBe('63 evidencias pendientes');
    expect(motivoCorto('Ana López (PRUEBA) no registra actividad hace 12 días.', 'Ana López (PRUEBA)')).toBe('12 días sin actividad');
    expect(motivoCorto('Lucía Vega no registra actividad hace 1 día.', 'Lucía Vega')).toBe('1 día sin actividad');
    expect(motivoCorto('Pedro tiene 1 evidencia pendiente.', 'Pedro')).toBe('1 evidencia pendiente');
    // Un aviso de otra forma: sin el nombre, sin el punto final y en tipo oración.
    expect(motivoCorto('Pedro dejó de responder al grupo.', 'Pedro')).toBe('Dejó de responder al grupo');
    const avisos = [aviso(1, 'u-1', 'E2E Aprendiz tiene 63 evidencias pendientes.', '2026-11-17T10:00:00Z')];
    expect(motivoDeLaFila({ aprendizId: 'u-1', nombre: 'E2E Aprendiz', color: 'ROJO', dias: [], avisos })).toBe('63 evidencias pendientes');
  });
});
