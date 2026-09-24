import { describe, expect, it } from '@jest/globals';

import { ADELANTO_MS, BYTES_POR_MS, Dosificador } from '../dosificador';

const pedazo = (ms: number) => new Uint8Array(ms * BYTES_POR_MS);

describe('Dosificador', () => {
  it('le adelanta al reproductor como mucho ADELANTO_MS', () => {
    const dosificador = new Dosificador();
    for (let i = 0; i < 20; i++) dosificador.agregar(pedazo(40));

    const primero = dosificador.entregar(0);
    const ms = primero.reduce((total, p) => total + p.length / BYTES_POR_MS, 0);
    expect(ms).toBeGreaterThanOrEqual(ADELANTO_MS);
    expect(ms).toBeLessThan(ADELANTO_MS + 40);
    expect(dosificador.entregar(0)).toHaveLength(0);
  });

  it('a medida que pasa el tiempo entrega lo que sigue, en orden', () => {
    const dosificador = new Dosificador();
    const a = pedazo(200);
    const b = pedazo(200);
    const c = pedazo(200);
    [a, b, c].forEach(p => dosificador.agregar(p));

    expect(dosificador.entregar(0)).toEqual([a, b]);
    expect(dosificador.entregar(100)).toEqual([]);
    expect(dosificador.entregar(200)).toEqual([c]);
    expect(dosificador.estaSonando(599)).toBe(true);
    expect(dosificador.estaSonando(600)).toBe(false);
  });

  it('al interrumpir descarta lo pendiente y deja de sonar en menos de ADELANTO_MS', () => {
    const dosificador = new Dosificador();
    for (let i = 0; i < 50; i++) dosificador.agregar(pedazo(40));
    dosificador.entregar(0);

    dosificador.vaciar(100);

    expect(dosificador.entregar(100)).toHaveLength(0);
    expect(dosificador.estaSonando(100 + ADELANTO_MS)).toBe(false);
  });
});
