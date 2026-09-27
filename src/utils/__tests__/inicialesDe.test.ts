import { describe, expect, it } from '@jest/globals';
import { inicialesDe } from '../iniciales';

describe('inicialesDe', () => {
  it('toma la primera y la última palabra', () => {
    expect(inicialesDe('Ana López')).toBe('AL');
    expect(inicialesDe('Kelin')).toBe('KE');
    expect(inicialesDe('')).toBe('·');
  });

  it('ignora lo que no empieza con letra, como «(PRUEBA)»', () => {
    expect(inicialesDe('María Torres (PRUEBA)')).toBe('MT');
    expect(inicialesDe('Ana López (PRUEBA)')).toBe('AL');
    expect(inicialesDe('Ñahui 2026')).toBe('ÑA');
  });
});
