import { describe, expect, it } from '@jest/globals';

import type { RocaMaestraApi } from '../../types/objetivos.types';
import { cifraDelObjetivo } from '../cifraDelObjetivo';

/** Una roca maestra con lo mínimo, para no repetir los campos que no importan en cada caso. */
function roca(parcial: Partial<RocaMaestraApi>): RocaMaestraApi {
  return {
    id: 'r1',
    eje: 'CUERPO',
    objetivo: 'Al Día 90 pesaré 75 kg, partiendo de 82 kg',
    meta: null,
    avance: null,
    unidad: null,
    lineaBase: null,
    porcentaje: null,
    creadoEn: '2026-09-01T00:00:00Z',
    actualizadoEn: '2026-09-01T00:00:00Z',
    ...parcial,
  } as RocaMaestraApi;
}

describe('cifraDelObjetivo', () => {
  it('muestra el recorrido cuando hay punto de partida', () => {
    expect(cifraDelObjetivo(roca({ meta: 75, avance: 82, unidad: 'kg', lineaBase: 82 }))).toBe('82 → 75 kg');
  });

  it('funciona igual con una meta que sube', () => {
    expect(cifraDelObjetivo(roca({ meta: 15000, avance: 5000, unidad: 'S/', lineaBase: 5000 }))).toBe(
      '5000 → 15000 S/'
    );
  });

  it('sin punto de partida muestra solo el destino', () => {
    expect(cifraDelObjetivo(roca({ meta: 75, avance: 0, unidad: 'kg', lineaBase: null }))).toBe('75 kg');
  });

  it('quita los decimales de un entero: el backend manda 78.00 y "78 kg" se lee mejor', () => {
    expect(cifraDelObjetivo(roca({ meta: 78.0, avance: 84.0, unidad: 'kg', lineaBase: 84.0 }))).toBe('84 → 78 kg');
  });

  it('conserva los decimales de verdad', () => {
    expect(cifraDelObjetivo(roca({ meta: 78.5, avance: 82.25, unidad: 'kg', lineaBase: 82.25 }))).toBe(
      '82.25 → 78.5 kg'
    );
  });

  it('una meta de cero es válida desde V44: saldar una deuda se puede medir con línea base', () => {
    expect(cifraDelObjetivo(roca({ meta: 0, avance: 8000, unidad: 'S/', lineaBase: 8000 }))).toBe('8000 → 0 S/');
  });

  it('devuelve null en un objetivo cualitativo — Relaciones, que se mide 1-10 y va sin meta', () => {
    expect(cifraDelObjetivo(roca({ eje: 'RELACIONES' }))).toBeNull();
  });

  it('devuelve null si hay meta pero no unidad: un número sin unidad no se puede escribir', () => {
    expect(cifraDelObjetivo(roca({ meta: 75, avance: 82, unidad: '  ', lineaBase: 82 }))).toBeNull();
  });

  it('tolera que todavía no haya roca', () => {
    expect(cifraDelObjetivo(null)).toBeNull();
    expect(cifraDelObjetivo(undefined)).toBeNull();
  });
});
