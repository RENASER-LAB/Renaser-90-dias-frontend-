/**
 * A qué se sube la foto del registro con foto (D-178 del backend): un hábito o una acción del día.
 */
import { describe, expect, it } from '@jest/globals';

import { destinoDeEvidencia } from '../destinoDeFoto';

describe('destinoDeEvidencia', () => {
  it('sin el campo es un hábito: un backend anterior a D-178 sigue funcionando igual', () => {
    expect(destinoDeEvidencia(undefined)).toBe('habito');
    expect(destinoDeEvidencia(null)).toBe('habito');
    expect(destinoDeEvidencia('habito')).toBe('habito');
  });

  it('"roca" es una acción del día', () => {
    expect(destinoDeEvidencia('roca')).toBe('roca');
  });

  it('un valor que esta versión no conoce no se manda a ningún lado', () => {
    expect(destinoDeEvidencia('curso')).toBeNull();
    expect(destinoDeEvidencia(3)).toBeNull();
  });
});
