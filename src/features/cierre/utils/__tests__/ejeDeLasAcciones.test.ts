import { describe, expect, it } from '@jest/globals';

import { ejeDeLasAcciones } from '../ejeDeLasAcciones';

describe('el eje de cada acción pendiente del cierre (spec 033)', () => {
  const acciones = [
    { id: 'a-1', eje: 'CUERPO' as const },
    { id: 'a-2', eje: 'TRABAJO' as const },
  ];

  it('sale de las acciones de hoy, por id', () => {
    const ejeDe = ejeDeLasAcciones(acciones);
    expect(ejeDe('a-1')).toBe('CUERPO');
    expect(ejeDe('a-2')).toBe('TRABAJO');
  });

  it('una acción que no figura entre las de hoy no tiene eje: el ícono neutro, nunca uno inventado', () => {
    expect(ejeDeLasAcciones(acciones)('otra')).toBeNull();
  });

  it('sin lectura de las acciones de hoy, ninguna tiene eje', () => {
    expect(ejeDeLasAcciones(null)('a-1')).toBeNull();
    expect(ejeDeLasAcciones(undefined)('a-1')).toBeNull();
    expect(ejeDeLasAcciones([])('a-1')).toBeNull();
  });
});
