import { describe, expect, it, jest } from '@jest/globals';

import { copiarAlPortapapeles, sePuedeCopiar } from '../portapapeles';

/**
 * «Copiar» del menú de un mensaje (2026-10-05) con `expo-clipboard`, que trae código nativo: un APK o
 * un cliente de desarrollo sin el módulo no puede reventar por esto. Sin módulo no se ofrece Copiar;
 * si copiar falla, se avisa y nada más.
 */
describe('portapapeles', () => {
  it('copia con el módulo y lo confirma', async () => {
    const setStringAsync = jest.fn(async (_texto: string) => true);
    await expect(copiarAlPortapapeles('Hola', () => ({ setStringAsync }))).resolves.toBe(true);
    expect(setStringAsync).toHaveBeenCalledWith('Hola');
  });

  it('sin el módulo nativo (cargarlo revienta) devuelve false en vez de romper', async () => {
    const sinModulo = () => {
      throw new Error("Cannot find native module 'ExpoClipboard'");
    };
    await expect(copiarAlPortapapeles('Hola', sinModulo)).resolves.toBe(false);
  });

  it('se ofrece en la web siempre y en el teléfono solo con el módulo adentro', () => {
    expect(sePuedeCopiar('web', () => false)).toBe(true);
    expect(sePuedeCopiar('android', () => true)).toBe(true);
    expect(sePuedeCopiar('android', () => false)).toBe(false);
    expect(sePuedeCopiar('ios', () => {
      throw new Error('sin expo-modules');
    })).toBe(false);
  });
});
