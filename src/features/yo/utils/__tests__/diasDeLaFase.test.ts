import { describe, expect, it } from '@jest/globals';

import { diasDeLaFase } from '../diasDeLaFase';

describe('diasDeLaFase', () => {
  it('el día 15 del programa es el día 8 de 27 de la Fase 2', () => {
    expect(diasDeLaFase('PHASE_2_DEVELOPMENT', 15)).toEqual({ dia: 8, total: 27 });
  });

  it('en los bordes de cada fase: primer y último día', () => {
    expect(diasDeLaFase('PHASE_1_REBIRTH', 1)).toEqual({ dia: 1, total: 7 });
    expect(diasDeLaFase('PHASE_1_REBIRTH', 7)).toEqual({ dia: 7, total: 7 });
    expect(diasDeLaFase('PHASE_3_ALCHEMIST_WARRIOR', 35)).toEqual({ dia: 1, total: 30 });
    expect(diasDeLaFase('PHASE_4_ASCENSION', 90)).toEqual({ dia: 26, total: 26 });
  });

  it('un día fuera de la fase se acota: la barra no desborda', () => {
    expect(diasDeLaFase('PHASE_2_DEVELOPMENT', 40)).toEqual({ dia: 27, total: 27 });
    expect(diasDeLaFase('PHASE_2_DEVELOPMENT', 0)).toEqual({ dia: 1, total: 27 });
  });

  it('sin fase conocida o sin día no se inventa nada', () => {
    expect(diasDeLaFase(null, 5)).toBeNull();
    expect(diasDeLaFase('PHASE_9', 5)).toBeNull();
    expect(diasDeLaFase('PHASE_2_DEVELOPMENT', null)).toBeNull();
    expect(diasDeLaFase('PHASE_2_DEVELOPMENT', Number.NaN)).toBeNull();
  });
});
