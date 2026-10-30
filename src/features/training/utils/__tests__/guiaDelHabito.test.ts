import { describe, expect, it } from '@jest/globals';
import { guiaDelHabito } from '../guiaDelHabito';

describe('La guía de un hábito (spec 014)', () => {
  it('arma las secciones con lo que el equipo cargó', () => {
    const guia = guiaDelHabito({
      mantraTitulo: 'Respiro',
      mantraIntro: 'Inhalo calma.',
      queHacer: 'Tomar un vaso de agua tibia.',
      comoHacerlo: '1. Calienta el agua.\n2. Bébela despacio.',
    });
    expect(guia?.secciones.map(s => s.titulo)).toEqual(['Qué hacer', 'Cómo hacerlo', 'Respiro']);
    expect(guia?.secciones[1].texto).toContain('2. Bébela despacio.');
  });

  it('sin guía cargada, la sección no existe (null)', () => {
    expect(guiaDelHabito(null)).toBeNull();
    expect(guiaDelHabito(undefined)).toBeNull();
    expect(guiaDelHabito({})).toBeNull();
    expect(guiaDelHabito({ queHacer: '', comoHacerlo: '   ', mantraTitulo: null, mantraIntro: null })).toBeNull();
  });

  it('lo que no es texto o no es un objeto se descarta sin romper nada', () => {
    expect(guiaDelHabito('hola')).toBeNull();
    expect(guiaDelHabito([1, 2])).toBeNull();
    expect(guiaDelHabito({ queHacer: 7, comoHacerlo: { a: 1 } })).toBeNull();
    expect(guiaDelHabito({ queHacer: 7, comoHacerlo: 'Esto sí.' })?.secciones).toEqual([{ titulo: 'Cómo hacerlo', texto: 'Esto sí.' }]);
  });

  it('una introducción de mantra sola se rotula «Mantra»', () => {
    expect(guiaDelHabito({ mantraIntro: 'Soy suficiente.' })?.secciones).toEqual([{ titulo: 'Mantra', texto: 'Soy suficiente.' }]);
  });

  it('recorta los espacios', () => {
    expect(guiaDelHabito({ queHacer: '  Caminar.  ' })?.secciones[0].texto).toBe('Caminar.');
  });
});
