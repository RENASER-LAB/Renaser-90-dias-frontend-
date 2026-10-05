/**
 * Los 17 emojis de hábito pasaron a íconos de línea por clave (rediseño de Training, 2026-10-05).
 *
 * Contra el código anterior falla: `iconoDeHabito` devolvía emojis (😴 para Despertar Y para Dormir,
 * porque el catálogo les da la misma clave `SLEEP`) y no existía `iconoDeLineaDeHabito`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { ICONOS_ELEGIBLES, iconoDeHabito, iconoDeLineaDeHabito } from '../iconosDeHabito';

const ICONOS = fs.readFileSync(path.resolve(__dirname, '../../../../components/Icon.tsx'), 'utf-8');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('iconoDeLineaDeHabito', () => {
  it('Despertar y Dormir ya no son el mismo dibujo: amanecer por la clave de sistema, luna por la del ícono', () => {
    expect(iconoDeLineaDeHabito({ iconKey: 'SLEEP', systemKey: 'WAKE_UP' })).toBe('sunrise');
    expect(iconoDeLineaDeHabito({ iconKey: 'SLEEP', systemKey: 'SLEEP' })).toBe('moon');
    expect(iconoDeLineaDeHabito({ iconKey: 'SLEEP', systemKey: null })).toBe('moon');
  });

  it('las 17 claves tienen un ícono de línea distinto, que existe en Icon.tsx', () => {
    expect(ICONOS_ELEGIBLES).toHaveLength(17);
    const iconos = ICONOS_ELEGIBLES.map(i => i.icono);
    expect(new Set(iconos).size).toBe(17);
    for (const { clave, icono, nombre } of ICONOS_ELEGIBLES) {
      expect({ clave, existe: ICONOS.includes(`case '${icono}':`) }).toEqual({ clave, existe: true });
      expect(EMOJI.test(icono + nombre)).toBe(false);
      expect(nombre).not.toBe(clave);
    }
  });

  it('sin clave propia cae en la de la dimensión o la categoría, nunca queda sin ícono', () => {
    expect(iconoDeLineaDeHabito({ iconKey: null }, 'body')).toBe('body');
    expect(iconoDeLineaDeHabito({ iconKey: 'NUEVA', category: 'SPIRIT' })).toBe('spark');
    expect(iconoDeLineaDeHabito({})).toBe('target');
  });

  it('el emoji queda solo para Plan, mientras pasa a íconos de línea', () => {
    expect(iconoDeHabito('WATER', '🎯')).toBe('💧');
  });
});
