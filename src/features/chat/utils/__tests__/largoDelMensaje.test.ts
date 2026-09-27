/**
 * CHT-06 del e2e del 2026-09-27 (E-374): un mensaje de 1 MB entraba entero. El servidor corta en 6.000
 * (D-215) y la app, en el mismo número.
 */
import { describe, expect, it } from '@jest/globals';

import { avisoDelLargoDelMensaje, LARGO_MAXIMO_DEL_MENSAJE } from '../largoDelMensaje';

describe('el largo máximo de un mensaje', () => {
  it('es el mismo que el del servidor (Mensaje.LARGO_MAXIMO_DEL_TEXTO)', () => {
    expect(LARGO_MAXIMO_DEL_MENSAJE).toBe(6000);
  });

  it('lejos del tope no se dice nada', () => {
    expect(avisoDelLargoDelMensaje('hola')).toBeNull();
    expect(avisoDelLargoDelMensaje('a'.repeat(5499))).toBeNull();
  });

  it('cerca del tope dice cuánto va, y nunca más que el tope', () => {
    expect(avisoDelLargoDelMensaje('a'.repeat(5500))).toBe('5500 de 6000 caracteres');
    expect(avisoDelLargoDelMensaje('a'.repeat(6000))).toBe('6000 de 6000 caracteres');
    expect(avisoDelLargoDelMensaje('a'.repeat(7000))).toBe('6000 de 6000 caracteres');
  });
});
