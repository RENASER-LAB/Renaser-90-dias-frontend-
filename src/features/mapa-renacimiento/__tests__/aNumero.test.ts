import { describe, expect, it } from '@jest/globals';

import { aNumero } from '../reglas';

/**
 * El lector de números que escribe la persona en el Mapa.
 *
 * Existe porque hasta el 2026-09-22 había DOS que se contradecían: `reglas.aNumero` borraba la coma
 * siempre (`"78,5"` → 785) y `aNumeroDeMeta` la convertía en punto (`"78,5"` → 78.5). El mismo texto
 * valía dos cosas según quién lo mirara: la Roca Maestra mostraba 78,5 kg y la validación, los hitos
 * y la cifra del mes calculaban sobre 785 kg. Ahora hay uno solo y esta tabla es su contrato.
 */
describe('aNumero · la coma', () => {
  /* El caso que estaba roto. Falla contra el código viejo, que devolvía 785. */
  it('lee la coma como decimal cuando lleva una o dos cifras detrás', () => {
    expect(aNumero('78,5')).toBe(78.5);
    expect(aNumero('78,5 kg')).toBe(78.5);
    expect(aNumero('0,5')).toBe(0.5);
    expect(aNumero('78,25')).toBe(78.25);
  });

  /* Y el que NO había que romper al arreglar el anterior: así se escribe la plata, y el docstring
     viejo de `aNumero` ya lo prometía. */
  it('lee la coma como miles cuando lleva exactamente tres cifras detrás', () => {
    expect(aNumero('15,000')).toBe(15000);
    expect(aNumero('S/ 15,000')).toBe(15000);
    expect(aNumero('1,234,567')).toBe(1234567);
  });

  it('con coma Y punto, la coma es de miles', () => {
    expect(aNumero('15,000.50')).toBe(15000.5);
  });
});

describe('aNumero · lo de siempre', () => {
  it('lee enteros y decimales con punto', () => {
    expect(aNumero('78')).toBe(78);
    expect(aNumero('78.5')).toBe(78.5);
    expect(aNumero('78.5 kg')).toBe(78.5);
  });

  it('ignora el texto alrededor del número', () => {
    expect(aNumero('llegar a 75 kg')).toBe(75);
  });

  /* Sin número el objetivo es CUALITATIVO, y eso es válido: "mejorar mi relación con mi hijo" no
     tiene cifra. `null` es la respuesta, no un error. */
  it('devuelve null cuando no hay ningún número', () => {
    expect(aNumero('')).toBeNull();
    expect(aNumero('sentirme mejor')).toBeNull();
    expect(aNumero('-')).toBeNull();
    expect(aNumero('.')).toBeNull();
    expect(aNumero(',')).toBeNull();
  });
});
