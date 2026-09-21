import { describe, expect, it } from '@jest/globals';

import { safeParsePaths } from '../safeParsePaths';

/**
 * `safeParsePaths` es el parche seguro que pide AGENTS.md §3 al deserializar una firma.
 *
 * Desde que `SignatureCanvas` tiene modo dual (2026-09-21) su contrato importa más que antes: el
 * campo `data` de una `SignatureData` ya no es siempre JSON. En una firma electrónica `data` es el
 * NOMBRE pelado de la persona, y ese mismo texto puede llegar acá al rehidratar una firma vieja o
 * una guardada sin `type`. Si esto lanzara, la pantalla del Pacto se caería al abrirse — que es
 * exactamente la clase de fallo que el parche existe para evitar.
 */
describe('safeParsePaths', () => {
  it('devuelve los trazos cuando el dato es el JSON que escribe el lienzo', () => {
    const trazos = ['M 10.0 20.0 L 11.0 21.0', 'M 30.0 40.0'];
    expect(safeParsePaths(JSON.stringify(trazos))).toEqual(trazos);
  });

  it('devuelve [] para un nombre propio — el `data` de una firma electrónica', () => {
    expect(safeParsePaths('Ricardo Ismael')).toEqual([]);
  });

  it('no lanza con JSON roto ni con JSON que no es una lista', () => {
    expect(safeParsePaths('[{"a":')).toEqual([]);
    expect(safeParsePaths('{"type":"typed"}')).toEqual([]);
    expect(safeParsePaths('42')).toEqual([]);
  });

  it('trata como "sin firma" lo vacío, lo nulo y lo indefinido', () => {
    expect(safeParsePaths('')).toEqual([]);
    expect(safeParsePaths('   ')).toEqual([]);
    expect(safeParsePaths(null)).toEqual([]);
    expect(safeParsePaths(undefined)).toEqual([]);
  });
});
