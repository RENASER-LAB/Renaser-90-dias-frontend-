import { describe, expect, it } from '@jest/globals';

import { aLineal, coloresDelOrbe } from '../coloresDelOrbe';

describe('aLineal', () => {
  it('blanco y negro quedan en los extremos', () => {
    expect(aLineal('#FFFFFF')).toEqual([1, 1, 1]);
    expect(aLineal('#000000')).toEqual([0, 0, 0]);
  });

  it('un gris medio de sRGB es MÁS oscuro en lineal (por eso no se mezcla en sRGB)', () => {
    const [r] = aLineal('#808080');
    expect(r).toBeGreaterThan(0.2);
    expect(r).toBeLessThan(0.23);
  });
});

describe('coloresDelOrbe', () => {
  it('claro y oscuro tienen su propia paleta', () => {
    expect(coloresDelOrbe(true).idleA).not.toEqual(coloresDelOrbe(false).idleA);
  });
});
