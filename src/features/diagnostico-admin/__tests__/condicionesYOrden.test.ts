import { describe, expect, it } from '@jest/globals';

import {
  aplanar,
  condicionEsValida,
  dependientesDe,
  dependientesEnCadena,
  describirLaCondicion,
  preguntasQuePuedenSerCondicion,
  quienAlimenta,
} from '../utils/condiciones';
import { destinoAlMover, moverEnLista, ordenNuevoDeSecciones, puedeMoverPregunta, puedeMoverSeccion } from '../utils/reordenar';
import { fichaDePrueba, pregunta, seccion } from './fixtures';

/** Quién puede ser condición de quién, y a dónde va una pregunta o una sección al subirla o bajarla. */
const S = fichaDePrueba();

describe('condiciones', () => {
  it('solo las anteriores de opción única o casillas pueden ser condición', () => {
    expect(preguntasQuePuedenSerCondicion(S, 12, 3).map(p => p.id)).toEqual([11]);
    // La 10 es la primera: no hay nada antes.
    expect(preguntasQuePuedenSerCondicion(S, 10, 2)).toEqual([]);
    // La 11 solo tiene antes a la 10, que es de texto.
    expect(preguntasQuePuedenSerCondicion(S, 11, 2)).toEqual([]);
  });

  it('una pregunta nueva ve todas las anteriores y las de su sección', () => {
    expect(preguntasQuePuedenSerCondicion(S, null, 3).map(p => p.id)).toEqual([11, 14]);
    expect(preguntasQuePuedenSerCondicion(S, null, 2).map(p => p.id)).toEqual([11]);
  });

  it('las retiradas y las sin opciones no cuentan', () => {
    const con = [seccion({ id: 2, preguntas: [pregunta({ id: 1, tipo: 'SELECCION_UNICA', estado: 'RETIRADA', opciones: [{ valor: 'a', etiqueta: 'a' }] }), pregunta({ id: 2, tipo: 'SELECCION_UNICA' })] })];
    expect(preguntasQuePuedenSerCondicion(con, null, 2)).toEqual([]);
  });

  it('una condición vale si su pregunta está antes y tiene esa opción', () => {
    expect(condicionEsValida({ preguntaId: 11, valor: 'Sí.' }, S, 12, 3)).toBe(true);
    expect(condicionEsValida({ preguntaId: 11, valor: 'Tal vez' }, S, 12, 3)).toBe(false);
    expect(condicionEsValida({ preguntaId: 999, valor: 'Sí.' }, S, 12, 3)).toBe(false);
    expect(condicionEsValida(null, S, 12, 3)).toBe(true);
  });

  it('dependientes directos y en cadena', () => {
    expect(dependientesDe(11, S).map(p => p.id)).toEqual([12]);
    const cadena = [
      seccion({ id: 2, preguntas: [
        pregunta({ id: 1, tipo: 'SELECCION_UNICA', opciones: [{ valor: 'a', etiqueta: 'a' }] }),
        pregunta({ id: 2, tipo: 'SELECCION_UNICA', opciones: [{ valor: 'b', etiqueta: 'b' }], seMuestraSi: { preguntaId: 1, valor: 'a' } }),
        pregunta({ id: 3, seMuestraSi: { preguntaId: 2, valor: 'b' } }),
      ] }),
    ];
    expect(dependientesEnCadena([1], cadena).map(p => p.id)).toEqual([2, 3]);
    expect(dependientesEnCadena([3], cadena)).toEqual([]);
  });

  it('describe la condición con la etiqueta de la opción', () => {
    expect(describirLaCondicion({ preguntaId: 11, valor: 'Sí.' }, S)).toBe('Se muestra si «¿Tienes pareja?» es «Sí.»');
    expect(describirLaCondicion({ preguntaId: 999, valor: 'x' }, S)).toBe('Se muestra según una pregunta que ya no está');
  });

  it('quién alimenta un destino, sin contar a la misma pregunta', () => {
    expect(quienAlimenta('OBJETIVO_CUERPO', S, null)?.id).toBe(13);
    expect(quienAlimenta('OBJETIVO_CUERPO', S, 13)).toBeNull();
    expect(quienAlimenta('OBJETIVO_NEGOCIO', S, null)).toBeNull();
    expect(aplanar(S)).toHaveLength(5);
  });
});

describe('subir y bajar una pregunta', () => {
  it('dentro de su sección, a la posición final', () => {
    expect(destinoAlMover(S, 11, 'arriba')).toEqual({ seccionId: 2, posicion: 0 });
    expect(destinoAlMover(S, 13, 'abajo')).toEqual({ seccionId: 3, posicion: 2 });
    expect(destinoAlMover(S, 13, 'arriba')).toEqual({ seccionId: 3, posicion: 0 });
  });

  it('en el borde pasa a la sección de al lado: al final de la anterior o al principio de la siguiente', () => {
    expect(destinoAlMover(S, 12, 'arriba')).toEqual({ seccionId: 2, posicion: 2 });
    expect(destinoAlMover(S, 11, 'abajo')).toEqual({ seccionId: 3, posicion: 0 });
  });

  it('la primera de la ficha no sube y la última no baja; la portada no recibe nada', () => {
    expect(destinoAlMover(S, 10, 'arriba')).toBeNull();
    expect(destinoAlMover(S, 14, 'abajo')).toBeNull();
    expect(puedeMoverPregunta(S, 10, 'arriba')).toBe(false);
    expect(puedeMoverPregunta(S, 10, 'abajo')).toBe(true);
    expect(destinoAlMover(S, 999, 'abajo')).toBeNull();
  });

  it('una sección vacía en medio recibe la pregunta que cruza', () => {
    const con = [
      seccion({ id: 2, preguntas: [pregunta({ id: 1 })] }),
      seccion({ id: 3, preguntas: [] }),
      seccion({ id: 4, preguntas: [pregunta({ id: 2, seccionId: 4 })] }),
    ];
    expect(destinoAlMover(con, 1, 'abajo')).toEqual({ seccionId: 3, posicion: 0 });
    expect(destinoAlMover(con, 2, 'arriba')).toEqual({ seccionId: 3, posicion: 0 });
  });
});

describe('subir y bajar una sección', () => {
  it('manda TODAS las secciones y la portada queda primera', () => {
    expect(ordenNuevoDeSecciones(S, 3, 'arriba')).toEqual([1, 3, 2]);
    expect(ordenNuevoDeSecciones(S, 2, 'abajo')).toEqual([1, 3, 2]);
  });

  it('en el borde, la portada y una sección que no existe no se mueven', () => {
    expect(ordenNuevoDeSecciones(S, 2, 'arriba')).toBeNull();
    expect(ordenNuevoDeSecciones(S, 3, 'abajo')).toBeNull();
    expect(ordenNuevoDeSecciones(S, 1, 'abajo')).toBeNull();
    expect(puedeMoverSeccion(S, 99, 'arriba')).toBe(false);
    expect(puedeMoverSeccion(S, 2, 'abajo')).toBe(true);
  });
});

describe('moverEnLista', () => {
  it('intercambia con el vecino y no se sale de los bordes', () => {
    expect(moverEnLista(['a', 'b', 'c'], 1, 'arriba')).toEqual(['b', 'a', 'c']);
    expect(moverEnLista(['a', 'b', 'c'], 1, 'abajo')).toEqual(['a', 'c', 'b']);
    expect(moverEnLista(['a', 'b', 'c'], 0, 'arriba')).toEqual(['a', 'b', 'c']);
    expect(moverEnLista(['a', 'b', 'c'], 2, 'abajo')).toEqual(['a', 'b', 'c']);
  });
});
