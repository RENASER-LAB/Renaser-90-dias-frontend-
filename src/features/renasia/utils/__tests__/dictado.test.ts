/**
 * Dictado por voz del chat: sesgo con los hábitos de la persona y cómo se suma lo dictado.
 */
import { describe, expect, it } from '@jest/globals';

import {
  frasesDeContexto,
  LARGO_MAXIMO_PREGUNTA,
  MAXIMO_FRASES_DE_CONTEXTO,
  mensajeDeErrorDeVoz,
  recortarPregunta,
  sumarTramo,
  unirDictado,
} from '../dictado';

describe('frasesDeContexto', () => {
  it('limpia espacios y saca repetidos sin distinguir mayúsculas', () => {
    expect(frasesDeContexto(['  Tomar agua ', 'tomar AGUA', 'Meditar', ''])).toEqual(['Tomar agua', 'Meditar']);
  });

  it('no pasa del techo de frases', () => {
    const muchos = Array.from({ length: 50 }, (_, i) => `Hábito ${i}`);

    expect(frasesDeContexto(muchos)).toHaveLength(MAXIMO_FRASES_DE_CONTEXTO);
  });
});

describe('unirDictado', () => {
  it('suma lo dictado a lo escrito, con un espacio', () => {
    expect(unirDictado('Hola,', 'ya tomé agua')).toBe('Hola, ya tomé agua');
  });

  it('sin nada escrito, queda solo lo dictado', () => {
    expect(unirDictado('', '  ya medité ')).toBe('ya medité');
  });

  it('un dictado vacío no borra lo que ya había', () => {
    expect(unirDictado('Lo que escribí', '   ')).toBe('Lo que escribí');
  });
});

describe('mensajeDeErrorDeVoz', () => {
  it('cancelar o no hablar no es un error que haya que mostrar', () => {
    expect(mensajeDeErrorDeVoz('aborted')).toBeNull();
    expect(mensajeDeErrorDeVoz('no-speech')).toBeNull();
  });

  it('sin permiso explica cómo activarlo', () => {
    expect(mensajeDeErrorDeVoz('not-allowed')).toContain('permiso del micrófono');
  });

  it('un código desconocido igual da un mensaje apto para mostrar', () => {
    expect(mensajeDeErrorDeVoz('algo-nuevo')).toContain('escribe tu mensaje');
  });
});

describe('sumarTramo (dictado continuo, 2026-09-26)', () => {
  it('suma los tramos finales en orden: quien habla largo no pierde lo primero', () => {
    const primero = sumarTramo('', 'Hoy me levanté tarde');
    expect(sumarTramo(primero, 'y no pude hacer la ducha fría')).toBe(
      'Hoy me levanté tarde y no pude hacer la ducha fría'
    );
  });

  it('si el motor manda todo lo dicho hasta ahí, no lo repite', () => {
    expect(sumarTramo('Hoy me levanté tarde', 'Hoy me levanté tarde y no pude')).toBe('Hoy me levanté tarde y no pude');
  });

  it('un tramo vacío no cambia nada', () => {
    expect(sumarTramo('Hola', '   ')).toBe('Hola');
  });
});

describe('recortarPregunta', () => {
  it('deja pasar lo que entra y recorta lo que se pasa del techo del backend', () => {
    expect(recortarPregunta('corto')).toBe('corto');
    expect(recortarPregunta('a'.repeat(LARGO_MAXIMO_PREGUNTA + 10))).toHaveLength(LARGO_MAXIMO_PREGUNTA);
  });
});
