import { describe, expect, it } from '@jest/globals';

import { subtituloDelAlumno } from '../subtituloDelAlumno';

/** S-1 (26/09): la ficha del mentor decía «Día por confirmar» de todo el mundo. */
describe('la línea bajo el nombre del aprendiz', () => {
  it('sin datos no dice nada — nunca «Día por confirmar»', () => {
    expect(subtituloDelAlumno(null, null)).toBeNull();
  });

  it('dice lo que sabe', () => {
    expect(subtituloDelAlumno(12, null)).toBe('Día 12 de 90');
    expect(subtituloDelAlumno(0, null)).toBe('Todavía no arrancó su programa');
    expect(subtituloDelAlumno(null, 3)).toBe('Última actividad hace 3 días');
    expect(subtituloDelAlumno(5, 0)).toBe('Día 5 de 90 · última actividad hace menos de un día');
  });
});
