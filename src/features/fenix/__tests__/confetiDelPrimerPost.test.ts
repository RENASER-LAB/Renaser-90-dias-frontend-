/** Spec 045 FR-007 (D7): el confeti, solo en el primer post, corto, en la paleta de la marca y nunca con «reducir movimiento». */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../theme/ThemeContext', () => ({ useTheme: () => ({}) }));

import { CONFETI_MS, PIEZAS_DE_CONFETI, coloresDelConfeti, piezasDeConfeti } from '../components/Confeti';
import { dark, light } from '../../../theme/tokens';
import { llevaConfeti, planDeLaPantalla, textosDeLaPantalla } from '../utils/pantallaDeCelebracion';

const primerPost = { principal: 'primerPost' as const, otros: [], rachaActual: null, puntosHoy: null, fase: null };

describe('el confeti del primer post', () => {
  it('spec 045 FR-013, D10: los colores salen del tema, en claro y en oscuro (nunca fijos)', () => {
    expect(coloresDelConfeti(light)).toContain(light.gold);
    expect(coloresDelConfeti(dark)).toContain(dark.gold);
    expect(coloresDelConfeti(dark)).toContain(dark.cardBgAlt);
    expect(coloresDelConfeti(dark)).not.toEqual(coloresDelConfeti(light));
  });

  it('spec 045 FR-007: una ráfaga de 1,4 s con 36 piezas chicas en los colores de la marca', () => {
    expect(CONFETI_MS).toBe(1400);
    const COLORES_DEL_CONFETI = coloresDelConfeti(light);
    const piezas = piezasDeConfeti(390, 800, COLORES_DEL_CONFETI);
    expect(piezas).toHaveLength(PIEZAS_DE_CONFETI);
    expect(PIEZAS_DE_CONFETI).toBe(36);
    for (const p of piezas) {
      expect(p.ancho).toBeGreaterThanOrEqual(6);
      expect(p.ancho).toBeLessThanOrEqual(10);
      expect(p.retraso).toBeLessThanOrEqual(220);
      expect(COLORES_DEL_CONFETI).toContain(p.color);
    }
  });

  it('spec 045 FR-007: solo en el primer post (D7) y sin confeti con «reducir movimiento»', () => {
    expect(llevaConfeti(primerPost, planDeLaPantalla(false))).toBe(true);
    expect(llevaConfeti(primerPost, planDeLaPantalla(true))).toBe(false);
    expect(llevaConfeti({ principal: 'todosLosHabitos' }, planDeLaPantalla(false))).toBe(false);
    expect(llevaConfeti({ principal: 'racha7' }, planDeLaPantalla(false))).toBe(false);
  });

  it('spec 045 FR-007: dice «¡Tu primera publicación!» y «Ya eres parte del grupo.», sin contadores', () => {
    const t = textosDeLaPantalla(primerPost);
    expect(t.titulo).toBe('¡Tu primera publicación!');
    expect(t.bajada).toBe('Ya eres parte del grupo.');
    expect(t.contadores).toEqual([]);
  });
});
