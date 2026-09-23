/**
 * Lo que el orbe del acompañante dice en voz alta.
 */
import { describe, expect, it } from '@jest/globals';

import { MAXIMO_CARACTERES_HABLADOS, recortarParaHablar, textoParaHablar } from '../voz';

describe('textoParaHablar', () => {
  it('saca negritas, viñetas y títulos, que en voz alta serían ruido', () => {
    const md = '## Hoy\n- **Meditar**: vence a las 8:30\n- Leer';

    expect(textoParaHablar(md)).toBe('Hoy Meditar: vence a las 8:30 Leer');
  });

  it('de un link lee el texto, no la dirección', () => {
    expect(textoParaHablar('Mira [la lección](https://renaser.app/x) y https://otro.com listo')).toBe(
      'Mira la lección y listo'
    );
  });
});

describe('recortarParaHablar', () => {
  it('un texto corto se dice entero', () => {
    expect(recortarParaHablar('Te faltan Meditar y Leer.')).toBe('Te faltan Meditar y Leer.');
  });

  it('uno largo se corta en una frase y avisa que el resto está en el chat', () => {
    const largo = 'Primera frase. '.repeat(60);

    const dicho = recortarParaHablar(largo);

    expect(dicho.length).toBeLessThan(MAXIMO_CARACTERES_HABLADOS + 60);
    expect(dicho).toMatch(/frase\. El resto te lo dejé escrito en el chat\.$/);
  });
});
