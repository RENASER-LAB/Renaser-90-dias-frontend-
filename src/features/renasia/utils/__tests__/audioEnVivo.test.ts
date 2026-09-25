import { describe, expect, it } from '@jest/globals';

import { BYTES_POR_ENVIO, BYTES_POR_MS, LoteDeMicrofono, MARGEN_DE_ECO_MS, Parlante } from '../audioEnVivo';

describe('Parlante', () => {
  it('antes de sonar nada, el micrófono está abierto', () => {
    const parlante = new Parlante();

    expect(parlante.microfonoAbierto(0)).toBe(true);
    expect(parlante.estaSonando(0)).toBe(false);
  });

  it('suma lo que se le entrega: dos pedazos de 200 ms suenan 400 ms', () => {
    const parlante = new Parlante();
    parlante.sonar(200 * BYTES_POR_MS, 1000);
    parlante.sonar(200 * BYTES_POR_MS, 1010);

    expect(parlante.estaSonando(1399)).toBe(true);
    expect(parlante.estaSonando(1400)).toBe(false);
  });

  it('semidúplex: el micrófono va en silencio mientras suena y durante el margen de eco', () => {
    const parlante = new Parlante();
    parlante.sonar(1000 * BYTES_POR_MS, 0);

    expect(parlante.microfonoAbierto(500)).toBe(false);
    expect(parlante.microfonoAbierto(1000 + MARGEN_DE_ECO_MS - 1)).toBe(false);
    expect(parlante.microfonoAbierto(1000 + MARGEN_DE_ECO_MS)).toBe(true);
  });

  it('callar lo deja en silencio y abre el micrófono pasado el margen', () => {
    const parlante = new Parlante();
    parlante.sonar(5000 * BYTES_POR_MS, 0);

    parlante.callar(1000);

    expect(parlante.estaSonando(1000)).toBe(false);
    expect(parlante.microfonoAbierto(1000 + MARGEN_DE_ECO_MS - 1)).toBe(false);
    expect(parlante.microfonoAbierto(1000 + MARGEN_DE_ECO_MS)).toBe(true);
  });
});

describe('LoteDeMicrofono', () => {
  it('junta pedazos de 32 ms hasta pasar los 100 ms y los entrega en orden', () => {
    const lote = new LoteDeMicrofono();
    const pedazo = (valor: number) => new Uint8Array(1024).fill(valor);

    expect(lote.agregar(pedazo(1))).toBeNull();
    expect(lote.agregar(pedazo(2))).toBeNull();
    expect(lote.agregar(pedazo(3))).toBeNull();
    const listo = lote.agregar(pedazo(4));

    expect(listo).not.toBeNull();
    expect(listo!.length).toBeGreaterThanOrEqual(BYTES_POR_ENVIO);
    expect([listo![0], listo![1024], listo![2048], listo![3072]]).toEqual([1, 2, 3, 4]);
    expect(lote.agregar(pedazo(5))).toBeNull();
  });
});
