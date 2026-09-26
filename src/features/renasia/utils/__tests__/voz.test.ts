/**
 * Lo que el orbe del acompañante dice en voz alta.
 */
import { describe, expect, it } from '@jest/globals';

import { crearAgrupador, MAXIMO_CARACTERES_HABLADOS, recortarParaHablar, separarOraciones, textoParaHablar } from '../voz';

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

describe('crearAgrupador', () => {
  it('dice la primera oración sola y junta el resto en un solo audio al terminar', () => {
    const dicho: string[] = [];
    const agrupador = crearAgrupador(texto => dicho.push(texto));

    agrupador.oracion('¡Bien hecho!');
    agrupador.oracion('Te faltan Leer y Tomar agua.');
    agrupador.oracion('Leer vence a las ocho y media.');
    expect(dicho).toEqual(['¡Bien hecho!']);

    agrupador.terminar('¿Lo hacemos ahora?');
    expect(dicho).toEqual(['¡Bien hecho!', 'Te faltan Leer y Tomar agua. Leer vence a las ocho y media. ¿Lo hacemos ahora?']);
  });

  it('si lo junto se hace largo, lo manda sin esperar el final', () => {
    const dicho: string[] = [];
    const agrupador = crearAgrupador(texto => dicho.push(texto), 30);

    agrupador.oracion('Hola.');
    agrupador.oracion('Esta oración ya es bastante larga.');
    expect(dicho).toEqual(['Hola.', 'Esta oración ya es bastante larga.']);
  });

  it('nunca lee el respaldo de la propuesta', () => {
    const dicho: string[] = [];
    const agrupador = crearAgrupador(texto => dicho.push(texto));

    agrupador.oracion('Propuesta: Cambiar Meditar a las 7:00');
    agrupador.terminar('Listo.');
    expect(dicho).toEqual(['Listo.']);
  });

  it('nunca lee el respaldo del pedido de foto', () => {
    const dicho: string[] = [];
    const agrupador = crearAgrupador(texto => dicho.push(texto));

    agrupador.terminar(
      "Foto para registrar 'JUGO VERDE': si no ves el boton de la camara, subela desde Hoy.",
      'Te dejé abajo el botón para la foto.'
    );
    expect(dicho).toEqual(['Te dejé abajo el botón para la foto.']);
  });
});
