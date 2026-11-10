import { describe, expect, it } from '@jest/globals';

import { textoDelGlobo } from '../utils/textoDelGlobo';

describe('globo del ícono de conexión (spec 048, D4)', () => {
  it('dice desde cuándo no hay señal y cuántas cosas faltan enviar', () => { // spec 048 FR-006
    const desde = new Date(2026, 10, 9, 10, 42).getTime();
    expect(textoDelGlobo(desde, 3, new Date(2026, 10, 9, 11, 0))).toBe('Sin conexión desde las 10:42 · 3 cosas por enviar');
    expect(textoDelGlobo(desde, 1, new Date(2026, 10, 9, 11, 0))).toBe('Sin conexión desde las 10:42 · 1 cosa por enviar');
    expect(textoDelGlobo(desde, 0, new Date(2026, 10, 9, 11, 0))).toBe('Sin conexión desde las 10:42');
  });

  it('con señal y cosas pendientes, dice que se están enviando', () => {
    expect(textoDelGlobo(null, 2)).toBe('Enviando 2 cosas…');
  });
});
