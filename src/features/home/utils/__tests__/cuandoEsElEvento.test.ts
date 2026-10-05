import { describe, expect, it } from '@jest/globals';

import { cuandoEsElEvento } from '../cuandoEsElEvento';

/**
 * La fecha del próximo evento en Hoy (rediseño del 2026-10-05): «Hoy · 20:00» o «mar 6 oct · 20:00».
 * Antes era `toLocaleString('es-ES', { dateStyle: 'short' })` → «5/10/26, 20:00».
 *
 * Lima es UTC−5: las 20:00 del lunes 5 son las 01:00 UTC del martes 6. Por eso los relojes de estas
 * pruebas caen entre las 00:00 y las 05:00 UTC (regla 02 del backend, E-91): un «hoy» calculado en UTC
 * diría «mar 6 oct» para un evento de esta noche.
 */
const LIMA = 'America/Lima';
const LUNES_22_LIMA = Date.parse('2026-10-06T03:00:00Z');

describe('cuandoEsElEvento', () => {
  it('un evento de esta noche dice «Hoy», aunque en UTC ya sea mañana', () => {
    expect(cuandoEsElEvento('2026-10-06T01:00:00Z', LUNES_22_LIMA, LIMA)).toBe('Hoy · 20:00');
  });

  it('otro día: día y mes cortos, sin año ni barras', () => {
    expect(cuandoEsElEvento('2026-10-07T01:00:00Z', LUNES_22_LIMA, LIMA)).toBe('mar 6 oct · 20:00');
    expect(cuandoEsElEvento('2026-10-10T15:30:00Z', LUNES_22_LIMA, LIMA)).toBe('sáb 10 oct · 10:30');
    expect(cuandoEsElEvento('2027-01-01T14:00:00Z', LUNES_22_LIMA, LIMA)).toBe('vie 1 ene · 09:00');
  });

  it('pasada la medianoche de Lima, el evento de las 20:00 de ayer ya no es «Hoy»', () => {
    const martes_00_30 = Date.parse('2026-10-06T05:30:00Z');
    expect(cuandoEsElEvento('2026-10-06T01:00:00Z', martes_00_30, LIMA)).toBe('lun 5 oct · 20:00');
  });
});
