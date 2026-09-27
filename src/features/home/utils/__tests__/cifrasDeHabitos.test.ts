import { describe, expect, it } from '@jest/globals';

import { cifrasDeHabitos } from '../cifrasDeHabitos';

describe('cifrasDeHabitos', () => {
  it('muestra completados sobre total', () => {
    expect(cifrasDeHabitos({ completados: 8, total: 14 })).toBe('8/14');
    expect(cifrasDeHabitos({ completados: 0, total: 3 })).toBe('0/3');
  });

  it('sin datos no dice «Al día» ni nada (E-257)', () => {
    expect(cifrasDeHabitos(null)).toBeNull();
    expect(cifrasDeHabitos(undefined)).toBeNull();
  });
});
