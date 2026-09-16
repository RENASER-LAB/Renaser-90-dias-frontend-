import { describe, expect, it } from '@jest/globals';

import { modoDeArranque, modoGuardadoValido } from '../modoDeTema';

/**
 * La regla que protegen estas pruebas: **la elección explícita de la persona le gana al tema del
 * sistema, y si no hay elección manda el sistema.**
 *
 * Se prueba la decisión pura y no `AsyncStorage`, que es la convención del repo: ninguna de las 22
 * suites que había antes de esta simula almacenamiento ni red. Por eso la regla vive en
 * `modoDeTema.ts` y el `getItem`/`setItem` —que no tiene ramas— quedó aparte, en
 * `preferenciaDeTema.ts`; importar ese otro archivo desde una prueba hace reventar la suite, porque
 * el módulo nativo de AsyncStorage no está enlazado en Jest.
 */
describe('modoGuardadoValido', () => {
  it('acepta los dos únicos modos que la app sabe pintar', () => {
    expect(modoGuardadoValido('light')).toBe('light');
    expect(modoGuardadoValido('dark')).toBe('dark');
  });

  it('trata como "nunca eligió" lo que no sea exactamente uno de esos dos', () => {
    // `null` es el caso normal: la clave todavía no existe.
    expect(modoGuardadoValido(null)).toBeNull();
    // El resto es basura que pudo dejar una versión anterior de la app o una escritura a medias.
    // No se intenta adivinar: adivinar acá deja a alguien con un tema que no pidió.
    expect(modoGuardadoValido('')).toBeNull();
    expect(modoGuardadoValido('DARK')).toBeNull();
    expect(modoGuardadoValido('oscuro')).toBeNull();
    expect(modoGuardadoValido('{"modo":"dark"}')).toBeNull();
  });
});

describe('modoDeArranque', () => {
  it('respeta la elección explícita aunque el sistema diga lo contrario', () => {
    // Este es el caso que motivó todo: alguien prende "Modo oscuro" en Yo con el teléfono en
    // claro, cierra la app y la vuelve a abrir. Tiene que seguir en oscuro.
    expect(modoDeArranque('dark', 'light')).toBe('dark');
    // Y al revés: quien eligió claro con el teléfono en oscuro también manda.
    expect(modoDeArranque('light', 'dark')).toBe('light');
  });

  it('sigue al sistema mientras nadie haya elegido a mano', () => {
    expect(modoDeArranque(null, 'dark')).toBe('dark');
    expect(modoDeArranque(null, 'light')).toBe('light');
  });

  it('cae al sistema si lo guardado quedó ilegible, en vez de inventar un modo', () => {
    expect(modoDeArranque('oscuro', 'dark')).toBe('dark');
    expect(modoDeArranque('', 'light')).toBe('light');
  });
});
