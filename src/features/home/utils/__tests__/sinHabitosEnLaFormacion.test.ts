import { describe, expect, it } from '@jest/globals';

import { sinHabitosEnLaFormacion } from '../sinHabitosEnLaFormacion';

const BASE = {
  formacion: 'DIPLOMADO',
  delServidor: true,
  diaPrograma: 5,
  registrosLeidos: true,
  registrosDeHoy: 0,
  habitosHoyTotal: 0,
};

describe('sinHabitosEnLaFormacion (spec 023, FR-014)', () => {
  it('una formación que no es la Escuela, ya en su Día 1, sin registros de hoy ni hábitos en /home: sin hábitos', () => {
    expect(sinHabitosEnLaFormacion(BASE)).toBe(true);
    expect(sinHabitosEnLaFormacion({ ...BASE, formacion: 'CERTIFICACION' })).toBe(true);
  });

  it('la Escuela se ve como siempre: nunca se esconde su tarjeta', () => {
    expect(sinHabitosEnLaFormacion({ ...BASE, formacion: 'ESCUELA' })).toBe(false);
  });

  it('el Día 0 no genera registros: «0 de hoy» es lo normal y la tarjeta se dibuja', () => {
    expect(sinHabitosEnLaFormacion({ ...BASE, diaPrograma: 0 })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, diaPrograma: null })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, diaPrograma: undefined })).toBe(false);
  });

  it('ante cualquier duda (no se leyó, hay registros, /home cuenta hábitos, el servidor no dijo la formación) se dibuja', () => {
    expect(sinHabitosEnLaFormacion({ ...BASE, registrosLeidos: false })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, registrosDeHoy: 3 })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, habitosHoyTotal: 4 })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, habitosHoyTotal: null })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, habitosHoyTotal: undefined })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, delServidor: false })).toBe(false);
    expect(sinHabitosEnLaFormacion({ ...BASE, formacion: null })).toBe(false);
  });
});
