import { describe, expect, it } from '@jest/globals';

import { dimensionAAbrir } from '../aperturaDesdeAviso';

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
