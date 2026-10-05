import { describe, expect, it } from '@jest/globals';
import { DURACION_MS } from '../../../../theme/movimiento';
import { RECORRIDO_DE_ENTRADA, TRAMOS_DE_LA_SACUDIDA, entradaDelBloque } from '../movimientoDelIngreso';

/**
 * El movimiento del login (2026-10-05), con los números que pidió el dueño: entrada escalonada de
 * título, campos y botón (8 px, 50 ms entre cada uno, todo por debajo de 400 ms) y una sacudida de
 * tres idas y vueltas de ~280 ms cuando el ingreso se rechaza.
 */
describe('entrada escalonada', () => {
  it('título, campos y botón entran de a uno, 50 ms entre cada uno, 8 px hacia arriba', () => {
    const bloques = [0, 1, 2].map(i => entradaDelBloque(i, false));
    expect(bloques.map(b => b.retardo)).toEqual([0, 50, 100]);
    expect(bloques.every(b => b.recorrido === RECORRIDO_DE_ENTRADA && RECORRIDO_DE_ENTRADA === 8)).toBe(true);
  });

  it('la entrada completa dura menos de 400 ms', () => {
    const ultimo = entradaDelBloque(2, false);
    expect(ultimo.retardo + ultimo.duracion).toBeLessThan(400);
  });

  it('con «reducir movimiento» es solo un fundido: sin recorrido ni escalón', () => {
    for (const i of [0, 1, 2]) {
      expect(entradaDelBloque(i, true)).toEqual({ retardo: 0, duracion: DURACION_MS.fundido, recorrido: 0 });
    }
  });
});

describe('sacudida de «no»', () => {
  it('dura 280 ms en total', () => {
    expect(TRAMOS_DE_LA_SACUDIDA.reduce((total, t) => total + t.ms, 0)).toBe(DURACION_MS.sacudida);
    expect(DURACION_MS.sacudida).toBe(280);
  });

  it('son tres idas y vueltas que se apagan y terminan donde empezaron', () => {
    const destinos = TRAMOS_DE_LA_SACUDIDA.map(t => t.hasta);
    expect(destinos[destinos.length - 1]).toBe(0);
    const extremos = destinos.slice(0, -1);
    expect(extremos).toHaveLength(5);
    // Alterna de lado en cada tramo…
    for (let i = 1; i < extremos.length; i++) {
      expect(Math.sign(extremos[i])).toBe(-Math.sign(extremos[i - 1]));
    }
    // …y nunca va más lejos que el tramo anterior.
    for (let i = 1; i < extremos.length; i++) {
      expect(Math.abs(extremos[i])).toBeLessThanOrEqual(Math.abs(extremos[i - 1]));
    }
    expect(Math.max(...extremos.map(Math.abs))).toBeLessThanOrEqual(10);
  });
});
