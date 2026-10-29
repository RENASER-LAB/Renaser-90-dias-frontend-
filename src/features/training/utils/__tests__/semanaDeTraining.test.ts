import { describe, expect, it } from '@jest/globals';
import {
  fechaDelDiaUno,
  lunesDe,
  nombreDelDiaEnFrase,
  relacionConHoy,
  semanaDe,
  sePuedeLeerElDia,
  tituloDelDia,
} from '../semanaDeTraining';

// 2026-10-29 es jueves.
describe('La semana de Training (lunes a domingo)', () => {
  it('el jueves 29: de lunes 26 a domingo 1', () => {
    const semana = semanaDe('2026-10-29');
    expect(semana.map(d => d.iso)).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
    expect(semana.map(d => d.letra).join('')).toBe('LMMJVSD');
    expect(semana.map(d => d.numero)).toEqual(['26', '27', '28', '29', '30', '31', '1']);
    expect(semana.map(d => d.relacion)).toEqual(['pasado', 'pasado', 'pasado', 'hoy', 'futuro', 'futuro', 'futuro']);
  });

  it('el domingo sigue en SU semana (no salta a la siguiente, como la de planificar)', () => {
    const semana = semanaDe('2026-11-01');
    expect(semana[0].iso).toBe('2026-10-26');
    expect(semana[6].relacion).toBe('hoy');
    expect(semana.slice(0, 6).every(d => d.relacion === 'pasado')).toBe(true);
  });

  it('el lunes todo lo demás es futuro', () => {
    const semana = semanaDe('2026-10-26');
    expect(semana[0].relacion).toBe('hoy');
    expect(semana.slice(1).every(d => d.relacion === 'futuro')).toBe(true);
  });

  it('lunesDe y el título del día', () => {
    expect(lunesDe('2026-10-29')).toBe('2026-10-26');
    expect(lunesDe('2026-10-26')).toBe('2026-10-26');
    expect(tituloDelDia('2026-10-29')).toBe('Jueves 29');
    expect(tituloDelDia('2026-11-01')).toBe('Domingo 1');
    expect(nombreDelDiaEnFrase('2026-10-30')).toBe('viernes');
  });

  it('relacionConHoy', () => {
    expect(relacionConHoy('2026-10-28', '2026-10-29')).toBe('pasado');
    expect(relacionConHoy('2026-10-29', '2026-10-29')).toBe('hoy');
    expect(relacionConHoy('2026-10-30', '2026-10-29')).toBe('futuro');
  });
});

describe('qué días se pueden pedir al servidor (misma regla que GET /habit-tracks/day)', () => {
  const hoy = '2026-10-29'; // jueves

  it('el Día 1 sale del día del programa', () => {
    expect(fechaDelDiaUno(hoy, 1)).toBe('2026-10-29');
    expect(fechaDelDiaUno(hoy, 15)).toBe('2026-10-15');
    expect(fechaDelDiaUno(hoy, 0)).toBeNull();
    expect(fechaDelDiaUno(hoy, null)).toBeNull();
  });

  it('de ayer hacia atrás, hasta el lunes', () => {
    expect(sePuedeLeerElDia('2026-10-28', hoy, 40)).toBe(true);
    expect(sePuedeLeerElDia('2026-10-27', hoy, 40)).toBe(true);
    expect(sePuedeLeerElDia('2026-10-26', hoy, 40)).toBe(true);
  });

  it('hoy y los días que vienen, no', () => {
    expect(sePuedeLeerElDia(hoy, hoy, 40)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-30', hoy, 40)).toBe(false);
  });

  it('otra semana, no', () => {
    expect(sePuedeLeerElDia('2026-10-25', hoy, 40)).toBe(false);
  });

  it('no antes del Día 1', () => {
    // Día 3 hoy (jueves) → el Día 1 fue el martes 27.
    expect(sePuedeLeerElDia('2026-10-26', hoy, 3)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-27', hoy, 3)).toBe(true);
    expect(sePuedeLeerElDia('2026-10-28', hoy, 3)).toBe(true);
  });

  it('sin Día 1 (programa sin arrancar o sin dato) no se pide nada', () => {
    expect(sePuedeLeerElDia('2026-10-28', hoy, 0)).toBe(false);
    expect(sePuedeLeerElDia('2026-10-28', hoy, null)).toBe(false);
  });

  it('el lunes no hay ningún día válido', () => {
    const lunes = '2026-10-26';
    for (const dia of semanaDe(lunes)) expect(sePuedeLeerElDia(dia.iso, lunes, 40)).toBe(false);
  });
});
