/**
 * El buscador del selector de aprendices de un grupo.
 *
 * El caso que motiva las tildes: el padrón son nombres en castellano y nadie los escribe
 * acentuados al buscar. Sin normalizar, escribir "jose" no encuentra a "José" y la pantalla dice
 * "no hay nadie" teniéndolo en la lista — un fallo convertido en vacío, que es justo lo que ARF-02
 * prohíbe.
 */
import { describe, expect, it } from '@jest/globals';

import { filtrarCandidatos } from '../filtrarCandidatos';

const PADRON = [
  { fullName: 'José Martínez' },
  { fullName: 'Ana Muñoz' },
  { fullName: 'Pedro Gómez' },
  { fullName: null },
];

const nombres = (r: Array<{ fullName: string | null }>) => r.map(c => c.fullName);

describe('filtrarCandidatos', () => {
  it('sin texto devuelve a todos', () => {
    expect(filtrarCandidatos(PADRON, '')).toHaveLength(4);
    expect(filtrarCandidatos(PADRON, '   ')).toHaveLength(4);
  });

  it('encuentra sin escribir la tilde', () => {
    expect(nombres(filtrarCandidatos(PADRON, 'jose'))).toEqual(['José Martínez']);
    expect(nombres(filtrarCandidatos(PADRON, 'gomez'))).toEqual(['Pedro Gómez']);
  });

  it('encuentra la eñe escrita como n', () => {
    expect(nombres(filtrarCandidatos(PADRON, 'munoz'))).toEqual(['Ana Muñoz']);
  });

  it('no distingue mayúsculas ni bordes', () => {
    expect(nombres(filtrarCandidatos(PADRON, '  ANA  '))).toEqual(['Ana Muñoz']);
  });

  it('busca por apellido, no solo por el principio', () => {
    expect(nombres(filtrarCandidatos(PADRON, 'martinez'))).toEqual(['José Martínez']);
  });

  /* Un candidato sin nombre no puede tumbar la búsqueda ni aparecer en cualquier resultado. */
  it('el candidato sin nombre no rompe ni aparece al buscar', () => {
    expect(() => filtrarCandidatos(PADRON, 'ana')).not.toThrow();
    expect(nombres(filtrarCandidatos(PADRON, 'ana'))).toEqual(['Ana Muñoz']);
  });

  it('no encuentra lo que no está, y no inventa', () => {
    expect(filtrarCandidatos(PADRON, 'zzz')).toEqual([]);
  });
});
