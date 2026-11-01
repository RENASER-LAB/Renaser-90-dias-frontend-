import { describe, expect, it } from '@jest/globals';

import {
  TERMINOS_DE_LA_APP,
  agregarClausula,
  borradorDesde,
  cambiarClausula,
  clausulasQueCitanUnNumero,
  dicenLoMismo,
  hayCambios,
  insertarClausulaDespuesDe,
  loQueFaltaParaPublicar,
  moverClausula,
  quitarClausula,
  type BorradorDeTerminos,
} from '../utils/borradorDeTerminos';

const base: BorradorDeTerminos = { titulo: 'Términos', introduccion: 'Intro', clausulas: ['Una', 'Dos', 'Tres'], textoCasilla: 'Acepto' };

describe('editar las cláusulas (spec 027, FR-003)', () => {
  it('la numeración es la posición: quitar una renumera las que siguen', () => {
    expect(quitarClausula(base, 0).clausulas).toEqual(['Dos', 'Tres']);
  });

  it('subir y bajar intercambian con la vecina; en los extremos no hacen nada', () => {
    expect(moverClausula(base, 1, -1).clausulas).toEqual(['Dos', 'Una', 'Tres']);
    expect(moverClausula(base, 1, 1).clausulas).toEqual(['Una', 'Tres', 'Dos']);
    expect(moverClausula(base, 0, -1)).toBe(base);
    expect(moverClausula(base, 2, 1)).toBe(base);
  });

  it('agregar suma una vacía al final; insertar la pone justo después de la elegida', () => {
    expect(agregarClausula(base).clausulas).toEqual(['Una', 'Dos', 'Tres', '']);
    expect(insertarClausulaDespuesDe(base, 0).clausulas).toEqual(['Una', '', 'Dos', 'Tres']);
  });

  it('no pasa de 100 cláusulas', () => {
    const lleno = { ...base, clausulas: Array.from({ length: 100 }, () => 'x') };
    expect(agregarClausula(lleno)).toBe(lleno);
    expect(insertarClausulaDespuesDe(lleno, 3)).toBe(lleno);
  });

  it('cambiar una cláusula no toca las demás', () => {
    expect(cambiarClausula(base, 1, 'Nueva').clausulas).toEqual(['Una', 'Nueva', 'Tres']);
  });
});

describe('qué impide publicar (FR-007)', () => {
  it('un texto completo se puede publicar', () => {
    expect(loQueFaltaParaPublicar(base)).toEqual([]);
  });

  it('dice cuál cláusula está vacía, y que falta el título, las cláusulas o la casilla', () => {
    expect(loQueFaltaParaPublicar({ ...base, clausulas: ['Una', ' ', 'Tres'] })).toEqual(['La cláusula 2 está vacía.']);
    expect(loQueFaltaParaPublicar({ ...base, titulo: '' })).toEqual(['Falta el título.']);
    expect(loQueFaltaParaPublicar({ ...base, clausulas: [] })).toEqual(['Agrega al menos una cláusula.']);
    expect(loQueFaltaParaPublicar({ ...base, textoCasilla: '' })).toEqual(['Falta el texto de la casilla de aceptación.']);
  });

  it('una cláusula de más de 2000 caracteres no se publica', () => {
    expect(loQueFaltaParaPublicar({ ...base, clausulas: ['x'.repeat(2001)] })).toEqual(['La cláusula 1 pasa de 2000 caracteres.']);
  });

  it('publicar lo mismo que lo vigente no crea una versión: se detecta, sin contar los espacios de los bordes', () => {
    expect(dicenLoMismo({ ...base, clausulas: ['Una ', ' Dos', 'Tres'] }, base)).toBe(true);
    expect(dicenLoMismo(cambiarClausula(base, 0, 'Otra'), base)).toBe(false);
    expect(dicenLoMismo(base, null)).toBe(false);
  });
});

describe('las citas por número (bordes de la spec)', () => {
  it('avisa de las cláusulas que citan a otra por su número', () => {
    const conCitas = { ...base, clausulas: ['Una', 'Según la cláusula 5 se aplica', 'Ver cláusula número 2', 'Sin cita'] };
    expect(clausulasQueCitanUnNumero(conCitas)).toEqual([2, 3]);
    expect(clausulasQueCitanUnNumero(base)).toEqual([]);
  });
});

describe('el borrador que viene del servidor', () => {
  it('se copia: editarlo no cambia lo recibido', () => {
    const recibido = { title: 'T', introduction: null, clauses: ['Una'], checkboxText: 'Acepto' };
    const copia = borradorDesde(recibido);
    expect(copia).toEqual({ titulo: 'T', introduccion: '', clausulas: ['Una'], textoCasilla: 'Acepto' });
    copia.clausulas.push('Dos');
    expect(recibido.clauses).toEqual(['Una']);
  });

  it('hay cambios cuando difiere de lo guardado, o cuando no hay nada guardado', () => {
    expect(hayCambios(base, base)).toBe(false);
    expect(hayCambios(cambiarClausula(base, 0, 'x'), base)).toBe(true);
    expect(hayCambios(base, null)).toBe(true);
  });
});

describe('el texto que la app lleva por dentro (para un servidor sin términos editables)', () => {
  it('son las 23 cláusulas de siempre, con su título y su casilla', () => {
    expect(TERMINOS_DE_LA_APP.clausulas).toHaveLength(23);
    expect(TERMINOS_DE_LA_APP.titulo).toBe('Términos y condiciones');
    expect(TERMINOS_DE_LA_APP.textoCasilla).toBe('He leído y acepto los Términos y Condiciones');
    expect(TERMINOS_DE_LA_APP.introduccion).toContain('Al inscribirme en el programa Renaser');
    expect(TERMINOS_DE_LA_APP.clausulas[0]).toContain('conozco el contenido del programa');
  });
});
