import { describe, expect, it } from '@jest/globals';

import { diaInicialDelDetalle } from '../diaInicialDelDetalle';

const dia = (fecha: string, cantidad: number) => ({ fecha, obligaciones: Array.from({ length: cantidad }, () => ({})) });

/** E-439 (29/09): la ficha abría el detalle del lunes y el post de hoy parecía sin marcar. */
describe('el día que abre el detalle de la semana', () => {
  it('es HOY en la semana en curso: el último día con hábitos, no el lunes', () => {
    const semana = [dia('2026-09-28', 15), dia('2026-09-29', 15), dia('2026-09-30', 0), dia('2026-10-01', 0)];
    expect(diaInicialDelDetalle(semana)).toBe('2026-09-29');
  });

  it('en una semana pasada es el domingo', () => {
    const semana = [dia('2026-09-21', 15), dia('2026-09-22', 15), dia('2026-09-27', 14)];
    expect(diaInicialDelDetalle(semana)).toBe('2026-09-27');
  });

  it('no depende del orden en que lleguen los días', () => {
    expect(diaInicialDelDetalle([dia('2026-09-29', 3), dia('2026-09-28', 3)])).toBe('2026-09-29');
  });

  it('sin hábitos en toda la semana no abre ninguno', () => {
    expect(diaInicialDelDetalle([dia('2026-09-28', 0)])).toBeNull();
    expect(diaInicialDelDetalle([])).toBeNull();
  });
});
