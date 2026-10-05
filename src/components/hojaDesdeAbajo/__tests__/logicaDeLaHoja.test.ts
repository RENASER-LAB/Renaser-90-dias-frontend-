import { describe, expect, it } from '@jest/globals';
import {
  FRACCION_PARA_CERRAR,
  amortiguar,
  decidirAlSoltar,
  opacidadDelVelo,
  posicionAlArrastrar,
} from '../logicaDeLaHoja';

/**
 * Las reglas de la hoja desde abajo (selectores de la Ficha Inicial, 2026-10-05): son las que hacen
 * que arrastrarla se sienta como una hoja del teléfono. Un número mal puesto acá no se ve en una
 * captura; se siente en la mano.
 */

const ALTO = 600;

describe('decidirAlSoltar', () => {
  it('un golpe corto y rápido hacia abajo la cierra aunque no llegue al cuarto de su alto', () => {
    // 60 px en 120 ms = 0.5 px/ms, muy por encima de 0.11.
    expect(decidirAlSoltar({ desplazamiento: 60, msTranscurridos: 120, velocidadFinal: 0.6, altoHoja: ALTO })).toBe('cerrar');
  });

  it('el mismo recorrido hecho despacio la devuelve a su lugar', () => {
    expect(decidirAlSoltar({ desplazamiento: 60, msTranscurridos: 1200, velocidadFinal: 0.02, altoHoja: ALTO })).toBe('volver');
  });

  it('bajarla un cuarto de su alto la cierra aunque se suelte quieta', () => {
    const umbral = ALTO * FRACCION_PARA_CERRAR;
    expect(decidirAlSoltar({ desplazamiento: umbral, msTranscurridos: 3000, velocidadFinal: 0, altoHoja: ALTO })).toBe('cerrar');
    expect(decidirAlSoltar({ desplazamiento: umbral - 1, msTranscurridos: 3000, velocidadFinal: 0, altoHoja: ALTO })).toBe('volver');
  });

  it('si al soltar el dedo iba hacia arriba, vuelve aunque la haya bajado mucho (se arrepintió)', () => {
    expect(decidirAlSoltar({ desplazamiento: 400, msTranscurridos: 500, velocidadFinal: -0.4, altoHoja: ALTO })).toBe('volver');
  });

  it('un temblor de 10 px al apoyar el dedo no la cierra, aunque sea rápido', () => {
    expect(decidirAlSoltar({ desplazamiento: 10, msTranscurridos: 50, velocidadFinal: 0.2, altoHoja: ALTO })).toBe('volver');
  });

  it('subirla nunca la cierra', () => {
    expect(decidirAlSoltar({ desplazamiento: -30, msTranscurridos: 50, velocidadFinal: 1, altoHoja: ALTO })).toBe('volver');
  });
});

describe('posicionAlArrastrar', () => {
  it('hacia abajo sigue al dedo 1:1', () => {
    expect(posicionAlArrastrar(120, ALTO)).toBe(120);
  });

  it('hacia arriba sube con resistencia: cada vez menos, sin llegar nunca a su alto', () => {
    const poco = posicionAlArrastrar(-20, ALTO);
    const mucho = posicionAlArrastrar(-400, ALTO);
    const muchisimo = posicionAlArrastrar(-5000, ALTO);
    expect(poco).toBeLessThan(0);
    expect(Math.abs(poco)).toBeLessThan(20);
    expect(Math.abs(mucho)).toBeGreaterThan(Math.abs(poco));
    expect(Math.abs(mucho)).toBeLessThan(400 / 2);
    expect(Math.abs(muchisimo)).toBeLessThan(ALTO);
  });

  it('la resistencia es la de `apple-design` (constante 0.55)', () => {
    expect(amortiguar(100, 600)).toBeCloseTo((100 * 600 * 0.55) / (600 + 0.55 * 100), 6);
    expect(amortiguar(0, 600)).toBe(0);
  });
});

describe('opacidadDelVelo', () => {
  it('el fondo se aclara en proporción a cuánto bajó la hoja', () => {
    expect(opacidadDelVelo(0, ALTO)).toBe(1);
    expect(opacidadDelVelo(ALTO / 2, ALTO)).toBeCloseTo(0.5, 6);
    expect(opacidadDelVelo(ALTO, ALTO)).toBe(0);
  });

  it('no se pasa de los bordes (hoja estirada hacia arriba, o todavía sin medir)', () => {
    expect(opacidadDelVelo(-40, ALTO)).toBe(1);
    expect(opacidadDelVelo(ALTO * 2, ALTO)).toBe(0);
    expect(opacidadDelVelo(100, 0)).toBe(0);
  });
});
