/**
 * E-507 (05/10): «esa línea horizontal negra… en Hoy, Plan, Training, menos en Comunidad». Las
 * cuatro pantallas ponían el borde seguro de abajo y la barra de pestañas lo volvía a poner (ver
 * `bordesDeUnaPestana.ts`). Contra el código anterior falla: las cuatro abrían su `SafeAreaView` sin
 * `edges`, que en `react-native-safe-area-context` significa los cuatro bordes.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { BORDES_DE_UNA_PESTANA } from '../bordesDeUnaPestana';

const PESTANAS = ['HoyScreen', 'PlanScreen', 'TrainingScreen', 'YoScreen'];

function aperturasDeSafeAreaView(pantalla: string): string[] {
  const fuente = fs.readFileSync(path.join(__dirname, '../../screens', `${pantalla}.tsx`), 'utf8');
  return fuente.match(/<SafeAreaView\b[^>]*>/g) ?? [];
}

describe('las pantallas de las pestañas no repiten el borde de abajo de la barra', () => {
  it('los bordes de una pestaña no incluyen el de abajo', () => {
    expect(BORDES_DE_UNA_PESTANA).not.toContain('bottom');
    expect(BORDES_DE_UNA_PESTANA).toEqual(expect.arrayContaining(['top', 'left', 'right']));
  });

  it.each(PESTANAS)('%s abre su SafeAreaView con los bordes de una pestaña', pantalla => {
    const aperturas = aperturasDeSafeAreaView(pantalla);
    expect(aperturas.length).toBeGreaterThan(0);
    for (const apertura of aperturas) {
      expect(apertura).toContain('edges={BORDES_DE_UNA_PESTANA}');
    }
  });
});
