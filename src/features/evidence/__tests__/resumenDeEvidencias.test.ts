import { describe, expect, it } from '@jest/globals';

import { resumenDeEvidencias } from '../resumenDeEvidencias';

const base = { cargando: false, error: null, cantidad: 0, hayMas: false };

describe('resumenDeEvidencias', () => {
  it('muestra el número real cuando está la lista completa', () => {
    expect(resumenDeEvidencias({ ...base, cantidad: 3 })).toBe('3 evidencias subidas');
    expect(resumenDeEvidencias({ ...base, cantidad: 1 })).toBe('1 evidencia subida');
  });

  it('no inventa un total si el servidor dice que hay más páginas', () => {
    expect(resumenDeEvidencias({ ...base, cantidad: 20, hayMas: true })).toBe('Tus fotos y registros');
  });

  it('sin datos todavía, o si falló, no da cifra', () => {
    expect(resumenDeEvidencias({ ...base, cargando: true })).toBe('Tus fotos y registros');
    expect(resumenDeEvidencias({ ...base, error: 'x' })).toBe('Tus fotos y registros');
  });

  it('sin evidencias lo dice', () => {
    expect(resumenDeEvidencias(base)).toBe('Todavía no subiste ninguna');
  });

  it('nunca habla de un mentor que verifica', () => {
    for (const cantidad of [0, 1, 37]) {
      expect(resumenDeEvidencias({ ...base, cantidad })).not.toMatch(/mentor|verificad/);
    }
  });
});
