import { describe, expect, it } from '@jest/globals';

import { cifraEscrita } from '../planMensualApi';

/** Espacio DURO: es el que usa `formatearNumero` para que el número no se parta en dos renglones. */
const DURO = '\u00A0';

/**
 * Lo único del objetivo mensual que sigue calculándose en la app: cómo se escribe el número.
 *
 * El resto —cuánto, con qué tope, y si va cifra o no— lo resuelve el servidor desde el 2026-09-22.
 * Ver la cabecera de `planMensualApi.ts`.
 */
describe('cifraEscrita', () => {
  it('pone la unidad física detrás, como los hitos del Mapa', () => {
    expect(cifraEscrita(81.6, 'kg', false)).toBe('81.6 kg');
    expect(cifraEscrita(45, 'cm', false)).toBe('45 cm');
  });

  it('pone la moneda delante', () => {
    expect(cifraEscrita(10000, 'S/', true)).toBe(`S/ 10${DURO}000`);
    expect(cifraEscrita(1500, 'USD', true)).toBe(`USD 1${DURO}500`);
  });

  it('pega la escala al número, sin espacio', () => {
    expect(cifraEscrita(7, '/10', false)).toBe('7/10');
    // Y no le hace caso al "adelante": "/10 7" no significa nada.
    expect(cifraEscrita(7, '/10', true)).toBe('7/10');
  });

  it('sin unidad deja el número solo', () => {
    expect(cifraEscrita(12, '', false)).toBe('12');
    expect(cifraEscrita(12, '   ', false)).toBe('12');
  });

  it('separa los miles con espacio duro, como el resto de la app', () => {
    expect(cifraEscrita(1234567, 'S/', true)).toBe(`S/ 1${DURO}234${DURO}567`);
  });
});
