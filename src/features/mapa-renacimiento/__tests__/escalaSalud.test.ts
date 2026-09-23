import { describe, expect, it } from '@jest/globals';

import { calidadSalud } from '../reglas';
import type { ObjetivoSalud } from '../tipos';

/**
 * El caso real: se cargó "energía, 84 → 78" y el formulario lo dejó pasar. El backend clasifica
 * energía como `ESCALA` y reparte el avance en enteros del 1 al 10, así que los hitos salieron
 * "81.6 /10". Nadie había hecho nada mal a la vista — el formulario no avisaba.
 */
function objetivo(parche: Partial<ObjetivoSalud> = {}): ObjetivoSalud {
  return {
    tipoResultado: 'energia',
    lineaBase: '4',
    resultadoDia90: '8',
    unidad: '/10',
    evidencia: 'registro diario',
    motivo: 'Quiero llegar con energia a los cincuenta',
    metaRedactada: 'Al Día 90 tendré una energía de 8/10',
    metaEditadaAMano: false,
    ...parche,
  } as ObjetivoSalud;
}

const bloquea = (o: ObjetivoSalud) =>
  calidadSalud(o).filter(a => a.bloquea).map(a => a.codigo);

describe('rango de las escalas (1 a 10)', () => {
  it('rechaza el caso reportado: energia 84 -> 78', () => {
    expect(bloquea(objetivo({ lineaBase: '84', resultadoDia90: '78' }))).toContain('OUT_OF_SCALE');
  });

  it('acepta un 4 -> 8 normal', () => {
    expect(bloquea(objetivo())).not.toContain('OUT_OF_SCALE');
  });

  it('valida los dos extremos, no solo uno', () => {
    expect(bloquea(objetivo({ lineaBase: '0' }))).toContain('OUT_OF_SCALE');
    expect(bloquea(objetivo({ resultadoDia90: '11' }))).toContain('OUT_OF_SCALE');
    expect(bloquea(objetivo({ lineaBase: '1', resultadoDia90: '10' }))).not.toContain('OUT_OF_SCALE');
  });

  it('el peso NO es escala: 84 -> 78 es perfectamente válido', () => {
    const peso = objetivo({ tipoResultado: 'peso', unidad: 'kg', lineaBase: '84', resultadoDia90: '78' });
    expect(bloquea(peso)).not.toContain('OUT_OF_SCALE');
  });

  it('"otro" es escala solo si la unidad lo declara, igual que en el backend', () => {
    const conEscala = objetivo({ tipoResultado: 'otro', unidad: '/10', lineaBase: '40', resultadoDia90: '80' });
    expect(bloquea(conEscala)).toContain('OUT_OF_SCALE');

    const conUnidadLibre = objetivo({ tipoResultado: 'otro', unidad: 'flexiones', lineaBase: '40', resultadoDia90: '80' });
    expect(bloquea(conUnidadLibre)).not.toContain('OUT_OF_SCALE');
  });

  it('un campo vacio no se reporta como fuera de rango: ya lo avisa MISSING_*', () => {
    const codigos = bloquea(objetivo({ lineaBase: '' }));
    expect(codigos).toContain('MISSING_BASELINE');
    expect(codigos).not.toContain('OUT_OF_SCALE');
  });
});
