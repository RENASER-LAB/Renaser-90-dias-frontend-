import { describe, expect, it } from '@jest/globals';

import { ETIQUETA_TERMINAR, muestraTerminar, rotuloDelOrbe } from '../rotuloDelOrbe';

const terminar = () => undefined;

describe('botón «Terminar» de la voz en vivo (E-458)', () => {
  it('se ve mientras la conversación en vivo está abierta, en cualquier fase', () => {
    expect(muestraTerminar('escuchando', terminar)).toBe(true);
    expect(muestraTerminar('pensando', terminar)).toBe(true);
    expect(muestraTerminar('hablando', terminar)).toBe(true);
  });

  it('no se ve en reposo ni con el flujo de siempre (sin conversación que cerrar)', () => {
    expect(muestraTerminar('reposo', terminar)).toBe(false);
    expect(muestraTerminar('escuchando', undefined)).toBe(false);
  });

  it('su etiqueta accesible dice qué hace', () => {
    expect(ETIQUETA_TERMINAR).toBe('Terminar conversación');
  });
});

describe('rotuloDelOrbe', () => {
  it('con la conversación abierta, tocar es «ya terminé»: el rótulo ya no dice que tocar termina', () => {
    expect(rotuloDelOrbe('escuchando', true, true)).toBe('Te escucho… toca cuando termines');
    expect(rotuloDelOrbe('hablando', true, true)).toBe('Toca para que se calle');
  });

  it('con el flujo de siempre queda como antes', () => {
    expect(rotuloDelOrbe('escuchando', true, false)).toBe('Te escucho… toca de nuevo para terminar');
    expect(rotuloDelOrbe('reposo', true, false)).toBe('Toca y háblame');
    expect(rotuloDelOrbe('reposo', false, false)).toBe('Toca para escribirle');
  });
});
