/**
 * Lo que el orbe del acompañante dice en voz alta.
 */
import { describe, expect, it } from '@jest/globals';

import { elegirIdiomaDeVoz, MAXIMO_CARACTERES_HABLADOS, recortarParaHablar, separarOraciones, textoParaHablar } from '../voz';

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

describe('separarOraciones', () => {
  it('entrega las oraciones cerradas y guarda lo que sigue llegando', () => {
    expect(separarOraciones('¡Hola! ¿Cómo va todo? Te fal')).toEqual({
      completas: ['¡Hola!', '¿Cómo va todo?'],
      resto: 'Te fal',
    });
  });

  it('una oración sin cerrar todavía no se dice', () => {
    expect(separarOraciones('Te faltan Meditar y Leer')).toEqual({ completas: [], resto: 'Te faltan Meditar y Leer' });
  });

  it('un salto de línea también cierra (listas)', () => {
    expect(separarOraciones('Te faltan:\n- Meditar\n- Le').completas).toEqual(['Te faltan:', '- Meditar']);
  });
});

describe('elegirIdiomaDeVoz', () => {
  it('prefiere español latinoamericano sobre el de España', () => {
    expect(elegirIdiomaDeVoz(['en-US', 'es-ES', 'es-US'])).toBe('es-US');
  });

  it('acepta el formato con guion bajo que devuelven algunos motores', () => {
    expect(elegirIdiomaDeVoz(['es_MX'])).toBe('es-MX');
  });

  it('si solo hay español de España, usa ese', () => {
    expect(elegirIdiomaDeVoz(['en-US', 'es-ES'])).toBe('es-ES');
  });

  it('sin ninguna voz en español, no inventa una', () => {
    expect(elegirIdiomaDeVoz(['en-US', 'pt-BR'])).toBeNull();
  });
});
