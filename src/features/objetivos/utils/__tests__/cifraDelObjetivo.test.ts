import { describe, expect, it } from '@jest/globals';

import type { RocaMaestraApi } from '../../types/objetivos.types';
import { cifraDeEscala, cifraDelObjetivo, primeraClausula } from '../cifraDelObjetivo';

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
      '5\u00a0000 → 15\u00a0000 S/'
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
    expect(cifraDelObjetivo(roca({ meta: 0, avance: 8000, unidad: 'S/', lineaBase: 8000 }))).toBe(
      '8\u00a0000 → 0 S/'
    );
  });

  it('agrupa los miles con espacio duro, nunca con coma: la app lee la coma como decimal', () => {
    const cifra = cifraDelObjetivo(roca({ meta: 1000000, avance: 250000, unidad: 'USD', lineaBase: 250000 }));
    expect(cifra).toBe('250\u00a0000 → 1\u00a0000\u00a0000 USD');
    expect(cifra).not.toContain(',');
  });

  it('no agrupa cuando no hay miles', () => {
    expect(cifraDelObjetivo(roca({ meta: 999, avance: 100, unidad: 'km', lineaBase: 100 }))).toBe('100 → 999 km');
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

describe('cifraDeEscala', () => {
  it('muestra la escala de Relaciones en las dos puntas', () => {
    expect(cifraDeEscala(5, 8)).toBe('5/10 → 8/10');
  });

  it('media escala no dice nada: sin una de las dos puntas, null', () => {
    expect(cifraDeEscala(5, null)).toBeNull();
    expect(cifraDeEscala(null, 8)).toBeNull();
    expect(cifraDeEscala(null, null)).toBeNull();
  });
});

describe('primeraClausula', () => {
  it('se queda con la primera frase de una meta redactada', () => {
    expect(
      primeraClausula(
        'Al Día 90 mi conexión con pareja pasará de 5/10 a 8/10, Una conversacion sin pantallas, con evidencia en la agenda, porque lo elijo'
      )
    ).toBe('Al Día 90 mi conexión con pareja pasará de 5/10 a 8/10');
  });

  it('sin coma devuelve el texto entero: no hay nada mejor que hacer', () => {
    expect(primeraClausula('  Recuperar la confianza con mi hijo  ')).toBe('Recuperar la confianza con mi hijo');
  });

  it('una coma al inicio no deja la tarjeta vacía', () => {
    expect(primeraClausula(', algo raro')).toBe(', algo raro');
  });
});
