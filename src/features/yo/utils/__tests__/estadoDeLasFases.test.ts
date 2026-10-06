/**
 * El animal de cada fase en Yo (pedido del dueño, 2026-10-06): mono, gorila, caballo, águila, uno por
 * fase y en ese orden. Lo que se vigila es que cada fase muestre SU animal y que las fases que todavía
 * no llegan no se pinten nunca como logradas.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { CLAVES_DE_FASE, FASES_EN_ORDEN } from '../../../home/hooks/useResumenHome';
import { ANIMAL_DE_FASE } from '../../data/animalesDeFase';
import { estadoDeLasFases, hayQueCelebrar } from '../estadoDeLasFases';

describe('el animal de cada fase', () => {
  it('cada fase tiene su animal, en el orden mono, gorila, caballo, águila', () => {
    expect(CLAVES_DE_FASE.map(c => ANIMAL_DE_FASE[c].nombre)).toEqual(['Mono', 'Gorila', 'Caballo', 'Águila']);
  });

  it.each(CLAVES_DE_FASE.map((clave, i) => [clave, i + 1] as const))(
    'en %s la fase actual es la %i y es la única marcada como actual',
    (clave, numero) => {
      const fases = estadoDeLasFases(clave);
      const actuales = fases.filter(f => f.estado === 'actual');
      expect(actuales.map(f => f.numero)).toEqual([numero]);
      expect(actuales[0]!.animal).toBe(ANIMAL_DE_FASE[clave]);
    },
  );

  it('las fases futuras nunca salen como logradas, y las pasadas nunca como futuras', () => {
    const fases = estadoDeLasFases('PHASE_2_DEVELOPMENT');
    expect(fases.map(f => f.estado)).toEqual(['lograda', 'actual', 'futura', 'futura']);
  });

  it('en la primera fase no hay nada logrado todavía', () => {
    expect(estadoDeLasFases('PHASE_1_REBIRTH').map(f => f.estado)).toEqual(['actual', 'futura', 'futura', 'futura']);
  });

  it('en la última las otras tres están logradas', () => {
    expect(estadoDeLasFases('PHASE_4_ASCENSION').map(f => f.estado)).toEqual(['lograda', 'lograda', 'lograda', 'actual']);
  });

  it.each([null, undefined, '', 'PHASE_9_NUEVA'])('con la fase %p no se revela ningún avance', fase => {
    expect(estadoDeLasFases(fase).every(f => f.estado === 'futura')).toBe(true);
  });

  it('usa las mismas fases que el resto de la app, sin una lista propia', () => {
    expect(estadoDeLasFases('PHASE_3_ALCHEMIST_WARRIOR').map(f => f.nombre)).toEqual(FASES_EN_ORDEN.map(f => f.nombre));
  });
});

describe('cuándo se celebra una fase nueva', () => {
  it('sólo cuando la actual es posterior a la última vista', () => {
    expect(hayQueCelebrar(1, 2)).toBe(true);
    expect(hayQueCelebrar(2, 2)).toBe(false);
    expect(hayQueCelebrar(3, 2)).toBe(false);
  });

  it('la primera vez que se abre Yo (nada guardado) no celebra una fase que ya venía', () => {
    expect(hayQueCelebrar(null, 3)).toBe(false);
  });

  it('sin fase conocida no celebra', () => {
    expect(hayQueCelebrar(1, null)).toBe(false);
  });
});

describe('las imágenes de las fases', () => {
  const carpeta = path.join(__dirname, '../../../../../assets/fases');

  it('hay cuatro WebP y ninguna pesa 150 KB', () => {
    const archivos = fs.readdirSync(carpeta).filter(f => f.endsWith('.webp'));
    expect(archivos).toHaveLength(4);
    for (const a of archivos) expect(fs.statSync(path.join(carpeta, a)).size).toBeLessThan(150 * 1024);
  });
});
