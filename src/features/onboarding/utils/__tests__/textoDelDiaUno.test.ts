import { describe, expect, it } from '@jest/globals';

import { introduccionDelDiaUno } from '../textoDelDiaUno';

describe('«Elige tu Día 1» habla del programa de la persona', () => {
  it('90 días (la Escuela, la Certificación y sin dato): el texto de siempre', () => {
    const deSiempre =
      'Tu programa de 90 días arranca el día que elijas. No puede ser hoy, para que puedas planificarte y dejar listos tus hábitos antes de que empiece a correr la cuenta.';
    expect(introduccionDelDiaUno(90, 'ESCUELA')).toBe(deSiempre);
    expect(introduccionDelDiaUno(90, 'CERTIFICACION')).toBe(deSiempre);
    expect(introduccionDelDiaUno(undefined, undefined)).toBe(deSiempre);
    expect(introduccionDelDiaUno(null, null)).toBe(deSiempre);
  });

  it('el Diplomado dice sus meses o su año', () => {
    expect(introduccionDelDiaUno(90, 'DIPLOMADO')).toContain('Tu programa de 3 meses arranca');
    expect(introduccionDelDiaUno(365, 'DIPLOMADO')).toContain('Tu programa de 1 año arranca');
  });
});
