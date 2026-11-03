import { describe, expect, it } from '@jest/globals';

import { contextoDeLaEvidencia } from '../contextoDeLaEvidencia';

/**
 * Issue #115 (5): la hoja de evidencia de una acción de Cuerpo decía «Vida y negocio · Innegociable». «Vida y negocio» es solo el cajón técnico
 * con el que Training agrupa las acciones de los objetivos; lo que la persona conoce es el eje.
 */
describe('contextoDeLaEvidencia', () => {
  it('una acción dice su EJE, no «Vida y negocio»', () => {
    expect(contextoDeLaEvidencia({ dimension: 'VIDA Y NEGOCIO', tag: 'Innegociable', eje: 'CUERPO' })).toBe('Cuerpo · Innegociable');
    expect(contextoDeLaEvidencia({ dimension: 'VIDA Y NEGOCIO', tag: 'Innegociable', eje: 'TRABAJO' })).toBe('Negocio y dinero · Innegociable');
    expect(contextoDeLaEvidencia({ dimension: 'VIDA Y NEGOCIO', tag: 'Delegable', eje: 'RELACIONES' })).toBe('Relaciones · Delegable');
  });

  it('un eje que no se conoce deja lo de siempre', () => {
    expect(contextoDeLaEvidencia({ dimension: 'VIDA Y NEGOCIO', tag: 'Innegociable', eje: 'OTRO' })).toBe('Vida y negocio · Innegociable');
    expect(contextoDeLaEvidencia({ dimension: 'VIDA Y NEGOCIO', tag: 'Innegociable' })).toBe('Vida y negocio · Innegociable');
  });

  it('un hábito sigue diciendo su dimensión, aunque traiga un eje', () => {
    expect(contextoDeLaEvidencia({ dimension: 'CUERPO', tag: 'Opcional' })).toBe('Cuerpo · Opcional');
    expect(contextoDeLaEvidencia({ dimension: 'MENTE', tag: 'Innegociable', eje: 'TRABAJO' })).toBe('Mente · Innegociable');
  });
});
