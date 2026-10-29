import { describe, expect, it } from '@jest/globals';

import { dimensionAAbrir, habitoAAbrir } from '../aperturaDesdeAviso';

/** D-218: el aviso de un hábito abre Training con la dimensión de ese hábito ya abierta. */
describe('dimensión que abre Training desde el aviso de un hábito', () => {
  const habitos = [
    { habitoId: 'h-jugo', dimension: 'CUERPO' as const },
    { habitoId: 'h-escritura', dimension: 'MENTE' as const },
  ];

  it('con la dimensión en la ruta, la abre sin esperar a que carguen los hábitos', () => {
    expect(dimensionAAbrir({ habitoId: 'h-jugo', dimension: 'CUERPO' }, [], true)).toBe('CUERPO');
  });

  it('sin dimensión, la del hábito con ese id', () => {
    expect(dimensionAAbrir({ habitoId: 'h-escritura', dimension: null }, habitos, false)).toBe('MENTE');
  });

  it('sin dimensión y con los hábitos cargando, espera', () => {
    expect(dimensionAAbrir({ habitoId: 'h-escritura', dimension: null }, [], true)).toBe('esperar');
  });

  it('un hábito que ya no es de la persona no abre ninguna dimensión', () => {
    expect(dimensionAAbrir({ habitoId: 'h-otro', dimension: null }, habitos, false)).toBeNull();
  });
});


describe('habitoAAbrir (spec 014: el aviso abre el hábito de hoy, no una dimensión)', () => {
  const habitos = [
    { id: 'reg-1', habitoId: 'h1', tieneTrackHoy: true },
    { id: 'h2', habitoId: 'h2', tieneTrackHoy: false },
  ];

  it('devuelve el hábito de hoy al que apunta el aviso', () => {
    expect(habitoAAbrir({ habitoId: 'h1' }, habitos, false)).toBe(habitos[0]);
  });

  it('un hábito sin registro hoy (pausado, no le toca) no se abre', () => {
    expect(habitoAAbrir({ habitoId: 'h2' }, habitos, false)).toBeNull();
  });

  it('mientras cargan los hábitos, espera', () => {
    expect(habitoAAbrir({ habitoId: 'h1' }, [], true)).toBe('esperar');
  });

  it('cargados y sin el hábito, queda la lista', () => {
    expect(habitoAAbrir({ habitoId: 'nadie' }, habitos, false)).toBeNull();
  });
});
