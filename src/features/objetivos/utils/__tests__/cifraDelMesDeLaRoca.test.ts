import { describe, expect, it } from '@jest/globals';

import { cifraDelMesDeLaRoca } from '../cifraDelMesDeLaRoca';
import type { RocaParaElMes, TiposDeMedicion } from '../cifraDelMesDeLaRoca';

/** El objetivo real que se usó para encontrar el bug: 84 → 78 kg, sin haber medido todavía. */
const PESO: RocaParaElMes = { lineaBase: 84, avance: 84, meta: 78, unidad: 'kg' };

const SIN_TIPOS: TiposDeMedicion = {
  saludTipo: null,
  saludUnidad: null,
  negocioTipo: null,
  negocioPeriodo: null,
};
const MIDE_PESO: TiposDeMedicion = { ...SIN_TIPOS, saludTipo: 'peso', saludUnidad: 'kg' };

describe('cifraDelMesDeLaRoca', () => {
  /* Reparte lo que FALTA entre los meses que QUEDAN: 84 + (78 − 84) / 3 = 82. */
  it('reparte el objetivo de 90 días en la cuota de este mes', () => {
    expect(cifraDelMesDeLaRoca('CUERPO', PESO, MIDE_PESO, 1)).toBe('82 kg');
  });

  /* Y se rehace contra el valor REAL: si el mes 1 bajó menos de lo pedido, el mes 2 no repite la
     cifra vieja como si nada hubiera pasado — pide 3 kg sobre los 83 reales, no los 82 teóricos. */
  it('se recalcula contra la medición de hoy, no contra los tercios del primer día', () => {
    const conAvance: RocaParaElMes = { ...PESO, avance: 83 };
    expect(cifraDelMesDeLaRoca('CUERPO', conAvance, MIDE_PESO, 2)).toBe('80.5 kg');
  });

  /**
   * El bug que se vio en la app el 2026-09-22: la tarjeta decía "Elige primero qué vas a medir" con
   * un objetivo de 84 → 78 kg perfectamente medible. El tipo se leía del borrador LOCAL del Mapa,
   * que no sobrevive a reinstalar; ahora viene del servidor. Sin tipo no hay cifra —eso está bien—,
   * pero el caso de arriba, que antes también fallaba, ahora sí la da.
   */
  it('sin tipo de resultado no hay cifra: no se adivina que "kg" es peso', () => {
    expect(cifraDelMesDeLaRoca('CUERPO', PESO, SIN_TIPOS, 1)).toBeNull();
  });

  /* El tope de cordura: 4 % del cuerpo por mes. Arrastrando dos meses, el mes 3 pediría 20 kg de
     golpe y ese número no ayuda a nadie — mejor ninguno. */
  it('no muestra cifra cuando el ritmo necesario es irreal', () => {
    const arrastrado: RocaParaElMes = { lineaBase: 100, avance: 98, meta: 78, unidad: 'kg' };
    expect(cifraDelMesDeLaRoca('CUERPO', arrastrado, MIDE_PESO, 3)).toBeNull();
  });

  /* Un puntaje del 1 al 10 no se entrega en cuotas mensuales. */
  it('no reparte una escala subjetiva', () => {
    const escala: RocaParaElMes = { lineaBase: 4, avance: 4, meta: 8, unidad: '' };
    expect(cifraDelMesDeLaRoca('RELACIONES', escala, MIDE_PESO, 1)).toBeNull();
  });

  it('devuelve null sin roca o sin día de programa conocido', () => {
    expect(cifraDelMesDeLaRoca('CUERPO', null, MIDE_PESO, 1)).toBeNull();
    expect(cifraDelMesDeLaRoca('CUERPO', PESO, MIDE_PESO, null)).toBeNull();
  });
});
