import { describe, expect, it } from '@jest/globals';

import { faltantesDelRadar, textoDeLoQueFalta } from '../faltantesDelRadar';

const llenas = { whatAmIDoing: 'a', whatAmIThinking: 'b', whatAmIFeeling: 'c', whatAmIAvoiding: 'd' };

describe('faltantesDelRadar', () => {
  it('con las cuatro escritas y sin energía, falta solo el nivel de energía', () => {
    const faltan = faltantesDelRadar(llenas, null);
    expect(faltan.map(f => f.pieza)).toEqual(['energia']);
    expect(textoDeLoQueFalta(faltan)).toBe('Falta: nivel de energía.');
  });

  it('en el orden de la pantalla, y un texto de solo espacios cuenta como vacío', () => {
    const faltan = faltantesDelRadar({ ...llenas, whatAmIFeeling: '   ' }, null);
    expect(textoDeLoQueFalta(faltan)).toBe('Faltan 2: ¿Qué siento?, nivel de energía.');
  });

  it('completo: nada que decir', () => {
    expect(faltantesDelRadar(llenas, 5)).toEqual([]);
    expect(textoDeLoQueFalta([])).toBeNull();
  });
});
