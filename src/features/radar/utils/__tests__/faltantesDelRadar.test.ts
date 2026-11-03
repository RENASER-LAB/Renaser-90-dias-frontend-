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
    expect(textoDeLoQueFalta(faltan)).toBe('Faltan 2: ¿Qué estoy sintiendo?, nivel de energía.');
  });

  it('usa los enunciados nuevos de las preguntas y no suma un punto detrás de un «?»', () => {
    expect(textoDeLoQueFalta(faltantesDelRadar({ ...llenas, whatAmIAvoiding: '' }, 5))).toBe('Falta: ¿Qué estoy evitando?');
    expect(textoDeLoQueFalta(faltantesDelRadar({ ...llenas, whatAmIDoing: '' }, 5))).toBe(
      'Falta: ¿Dónde estoy y qué estoy haciendo ahora?',
    );
    expect(textoDeLoQueFalta(faltantesDelRadar({ ...llenas, whatAmIThinking: '' }, null))).toBe(
      'Faltan 2: ¿Qué estoy pensando?, nivel de energía.',
    );
  });

  it('completo: nada que decir', () => {
    expect(faltantesDelRadar(llenas, 5)).toEqual([]);
    expect(textoDeLoQueFalta([])).toBeNull();
  });
});
