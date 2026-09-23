import { describe, expect, it } from '@jest/globals';

import { conMoneda, ejemploDeNegocio, ejemploDeSalud } from '../ejemplos';
import { RESULTADOS_NEGOCIO, RESULTADOS_SALUD } from '../reglas';

/** "Ej. 20,000" -> 20000. Devuelve null si el ejemplo no es numérico (los de texto guía). */
function numero(ejemplo: string): number | null {
  const limpio = ejemplo.replace('Ej. ', '').replace(/,/g, '');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

describe('los ejemplos no pueden contradecir al objetivo', () => {
  it('en deuda el ejemplo BAJA: era el bug reportado (5k -> 15k)', () => {
    const { base, meta } = ejemploDeNegocio('deuda');
    expect(numero(meta)!).toBeLessThan(numero(base)!);
  });

  it('peso y medidas bajan', () => {
    for (const tipo of ['peso', 'medidas'] as const) {
      const { base, meta } = ejemploDeSalud(tipo);
      expect(numero(meta)!).toBeLessThan(numero(base)!);
    }
  });

  it('fuerza, resistencia, sueno y energia suben', () => {
    for (const tipo of ['fuerza', 'resistencia', 'sueno', 'energia'] as const) {
      const { base, meta } = ejemploDeSalud(tipo);
      expect(numero(meta)!).toBeGreaterThan(numero(base)!);
    }
  });

  it('en negocio sube todo menos deuda', () => {
    for (const { clave } of RESULTADOS_NEGOCIO) {
      const { base, meta } = ejemploDeNegocio(clave);
      const a = numero(base), b = numero(meta);
      if (a === null || b === null) continue;   // los de texto guía no comparan
      if (clave === 'deuda') expect(b).toBeLessThan(a);
      else expect(b).toBeGreaterThan(a);
    }
  });
});

describe('cobertura y moneda', () => {
  it('cada tipo del catalogo tiene su ejemplo, sin huecos', () => {
    for (const { clave } of RESULTADOS_SALUD) {
      expect(ejemploDeSalud(clave).base).toBeTruthy();
    }
    for (const { clave } of RESULTADOS_NEGOCIO) {
      expect(ejemploDeNegocio(clave).base).toBeTruthy();
    }
  });

  it('sin tipo elegido guia con palabras, no con un numero que podria ir al reves', () => {
    expect(numero(ejemploDeSalud(null).base)).toBeNull();
    expect(numero(ejemploDeNegocio(null).meta)).toBeNull();
  });

  it('clientes y ventas se cuentan, no se cobran: sin moneda', () => {
    expect(ejemploDeNegocio('clientes').moneda).toBe(false);
    expect(ejemploDeNegocio('ventas').moneda).toBe(false);
    expect(conMoneda('Ej. 12', 'S/', false)).toBe('Ej. 12');
  });

  it('lo que si es plata lleva la moneda elegida', () => {
    expect(ejemploDeNegocio('deuda').moneda).toBe(true);
    expect(conMoneda('Ej. 20,000', 'S/', true)).toBe('Ej. S/ 20,000');
    expect(conMoneda('Tu punto de partida', 'S/', true)).toBe('Tu punto de partida');
  });
});
