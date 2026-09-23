/**
 * Dictado por voz del chat: sesgo con los hábitos de la persona y cómo se suma lo dictado.
 */
import { describe, expect, it } from '@jest/globals';

import { frasesDeContexto, MAXIMO_FRASES_DE_CONTEXTO, mensajeDeErrorDeVoz, unirDictado } from '../dictado';

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
