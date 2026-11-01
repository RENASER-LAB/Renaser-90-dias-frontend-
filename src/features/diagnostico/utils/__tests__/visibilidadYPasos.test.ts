import { describe, expect, it } from '@jest/globals';

import {
  P,
  pregunta,
  respuestasCompletas,
  seccionesDeEjemplo,
} from '../../__tests__/fixturesDelDiagnostico';
import type { SeccionDelDiagnostico } from '../../types/diagnostico.types';
import {
  armarPasos,
  descripcionDelAvance,
  indiceInicial,
  pasoDeLaPregunta,
  PESO_MAXIMO_DE_UN_PASO,
  pesoDeLaPregunta,
  primeraQueFalta,
  PREGUNTAS_MAXIMAS_POR_PASO,
  rellenoPorSeccion,
} from '../pasosDelRecorrido';
import { RESPUESTA_VACIA, valoresIniciales, type ValoresDelDiagnostico } from '../respuestasEnEdicion';
import { coincideConLaCondicion, idsVisibles, seccionesVisibles } from '../visibilidad';
import { diagnosticoDeEjemplo } from '../../__tests__/fixturesDelDiagnostico';

const secciones = seccionesDeEjemplo();

const conNegocio = (si: boolean | null): ValoresDelDiagnostico =>
  si === null ? {} : { [P.tieneNegocio]: { ...RESPUESTA_VACIA, texto: si ? 'Sí.' : 'No.' } };

describe('preguntas condicionales', () => {
  it('con «Sí.» aparecen las preguntas del negocio; con «No.» o sin responder, no', () => {
    const hijas = [P.negocioQueHace, P.negocioFacturacion, P.negocioUtilidad, P.negocioPersonas];
    for (const id of hijas) expect(idsVisibles(secciones, conNegocio(true)).has(id)).toBe(true);
    for (const id of hijas) expect(idsVisibles(secciones, conNegocio(false)).has(id)).toBe(false);
    for (const id of hijas) expect(idsVisibles(secciones, conNegocio(null)).has(id)).toBe(false);
  });

  it('una sección que se queda sin preguntas visibles se salta, sin huecos', () => {
    expect(seccionesVisibles(secciones, conNegocio(false)).map(s => s.clave)).not.toContain('tu-negocio');
    expect(seccionesVisibles(secciones, conNegocio(true)).map(s => s.clave)).toContain('tu-negocio');
  });

  it('es recursiva: si el padre está oculto, el hijo también aunque su condición se cumpla', () => {
    const cadena: SeccionDelDiagnostico[] = [
      {
        clave: 's',
        titulo: 'S',
        descripcion: null,
        preguntas: [
          pregunta({ id: 1, tipo: 'SELECCION_UNICA', opciones: [{ valor: 'a', etiqueta: 'a' }] }),
          pregunta({ id: 2, tipo: 'SELECCION_UNICA', opciones: [{ valor: 'b', etiqueta: 'b' }], seMuestraSi: { preguntaId: 1, valor: 'a' } }),
          pregunta({ id: 3, tipo: 'TEXTO', seMuestraSi: { preguntaId: 2, valor: 'b' } }),
        ],
      },
    ];
    const valores: ValoresDelDiagnostico = { 2: { ...RESPUESTA_VACIA, texto: 'b' } };
    // 2 quedó respondida («b»), pero 1 no es «a»: 2 y 3 están ocultas.
    expect([...idsVisibles(cadena, valores)]).toEqual([1]);
    expect([...idsVisibles(cadena, { ...valores, 1: { ...RESPUESTA_VACIA, texto: 'a' } })].sort()).toEqual([1, 2, 3]);
  });

  it('las respuestas de una pregunta oculta se conservan: no cuentan, pero siguen ahí si vuelve a mostrarse', () => {
    const valores: ValoresDelDiagnostico = {
      ...conNegocio(true),
      [P.negocioQueHace]: { ...RESPUESTA_VACIA, texto: 'Panadería' },
    };
    const sinNegocio: ValoresDelDiagnostico = { ...valores, [P.tieneNegocio]: { ...RESPUESTA_VACIA, texto: 'No.' } };
    expect(idsVisibles(secciones, sinNegocio).has(P.negocioQueHace)).toBe(false);
    expect(sinNegocio[P.negocioQueHace].texto).toBe('Panadería');
    const denuevo: ValoresDelDiagnostico = { ...sinNegocio, [P.tieneNegocio]: { ...RESPUESTA_VACIA, texto: 'Sí.' } };
    expect(idsVisibles(secciones, denuevo).has(P.negocioQueHace)).toBe(true);
    expect(denuevo[P.negocioQueHace].texto).toBe('Panadería');
  });

  it('en casillas la condición se cumple si la respuesta la INCLUYE', () => {
    const padre = pregunta({ id: 7, tipo: 'SELECCION_MULTIPLE', opciones: [{ valor: 'x', etiqueta: 'x' }, { valor: 'y', etiqueta: 'y' }] });
    expect(coincideConLaCondicion(padre, { ...RESPUESTA_VACIA, valores: ['x', 'y'] }, 'y')).toBe(true);
    expect(coincideConLaCondicion(padre, { ...RESPUESTA_VACIA, valores: ['x'] }, 'y')).toBe(false);
  });

  it('una condición que nombra una pregunta que no está, o un ciclo, deja la pregunta oculta sin colgarse', () => {
    const rara: SeccionDelDiagnostico[] = [
      {
        clave: 's',
        titulo: 'S',
        descripcion: null,
        preguntas: [
          pregunta({ id: 1, tipo: 'TEXTO', seMuestraSi: { preguntaId: 99, valor: 'a' } }),
          pregunta({ id: 2, tipo: 'TEXTO', seMuestraSi: { preguntaId: 3, valor: 'a' } }),
          pregunta({ id: 3, tipo: 'TEXTO', seMuestraSi: { preguntaId: 2, valor: 'a' } }),
          pregunta({ id: 4, tipo: 'TEXTO' }),
        ],
      },
    ];
    const todos: ValoresDelDiagnostico = {
      1: { ...RESPUESTA_VACIA, texto: 'a' },
      2: { ...RESPUESTA_VACIA, texto: 'a' },
      3: { ...RESPUESTA_VACIA, texto: 'a' },
    };
    expect([...idsVisibles(rara, todos)]).toEqual([4]);
  });
});

describe('pasos cortos', () => {
  const pasos = armarPasos(secciones, conNegocio(null));

  it('cada paso tiene de 1 a 3 preguntas y nunca pasa del peso máximo', () => {
    for (const paso of pasos) {
      expect(paso.preguntas.length).toBeGreaterThanOrEqual(1);
      expect(paso.preguntas.length).toBeLessThanOrEqual(PREGUNTAS_MAXIMAS_POR_PASO);
      const peso = paso.preguntas.reduce((suma, p) => suma + pesoDeLaPregunta(p), 0);
      expect(peso).toBeLessThanOrEqual(PESO_MAXIMO_DE_UN_PASO);
    }
  });

  it('una pregunta pesada (párrafo, cuadrícula, consentimiento) va sola', () => {
    for (const paso of pasos) {
      if (paso.preguntas.some(p => ['AREA_TEXTO', 'CUADRICULA', 'CASILLA'].includes(p.tipo))) {
        expect(paso.preguntas).toHaveLength(1);
      }
    }
    expect(pasos[pasoDeLaPregunta(pasos, P.satisfaccion)].preguntas.map(p => p.id)).toEqual([P.satisfaccion]);
    expect(pasos[pasoDeLaPregunta(pasos, P.consentimiento)].preguntas.map(p => p.id)).toEqual([P.consentimiento]);
  });

  it('las preguntas livianas se juntan: nombre, edad y ciudad en un solo paso', () => {
    expect(pasos[0].preguntas.map(p => p.id)).toEqual([P.nombre, P.edad, P.ciudad]);
    expect(pasos[1].preguntas.map(p => p.id)).toEqual([P.dedica]);
  });

  it('nunca mezcla secciones y la descripción se dice solo en el primer paso de la sección', () => {
    for (const paso of pasos) {
      const seccion = secciones.find(s => s.clave === paso.seccion.clave);
      expect(paso.preguntas.every(p => seccion?.preguntas.some(q => q.id === p.id))).toBe(true);
    }
    const deConociendote = pasos.filter(p => p.seccion.clave === 'conociendote');
    expect(deConociendote.map(p => p.primeroDeLaSeccion)).toEqual([true, false]);
  });

  it('el consentimiento es el último paso y el de «Sí.» abre pasos nuevos sin huecos', () => {
    expect(pasos[pasos.length - 1].preguntas[0].id).toBe(P.consentimiento);
    const conSi = armarPasos(secciones, conNegocio(true));
    expect(conSi.length).toBeGreaterThan(pasos.length);
    expect(conSi.every(p => p.preguntas.length > 0)).toBe(true);
    expect(conSi.some(p => p.seccion.clave === 'tu-negocio')).toBe(true);
  });

  it('una pregunta que depende de otra del mismo paso abre un paso nuevo: el paso no cambia mientras se contesta', () => {
    const mismaSeccion: SeccionDelDiagnostico[] = [
      {
        clave: 's',
        titulo: 'S',
        descripcion: null,
        preguntas: [
          pregunta({ id: 1, tipo: 'SELECCION_UNICA', opciones: [{ valor: 'Sí.', etiqueta: 'Sí.' }] }),
          pregunta({ id: 2, tipo: 'TEXTO', seMuestraSi: { preguntaId: 1, valor: 'Sí.' } }),
        ],
      },
    ];
    const antes = armarPasos(mismaSeccion, {});
    const despues = armarPasos(mismaSeccion, { 1: { ...RESPUESTA_VACIA, texto: 'Sí.' } });
    expect(antes).toHaveLength(1);
    expect(despues.map(p => p.preguntas.map(q => q.id))).toEqual([[1], [2]]);
    // El paso 0 es el mismo antes y después de contestar.
    expect(despues[0].preguntas.map(q => q.id)).toEqual(antes[0].preguntas.map(q => q.id));
  });

  it('una lista larga de opciones pesa más y deja de compartir paso', () => {
    const larga = pregunta({ id: 5, tipo: 'SELECCION_UNICA', opciones: Array.from({ length: 6 }, (_, i) => ({ valor: `${i}`, etiqueta: `${i}` })) });
    const corta = pregunta({ id: 6, tipo: 'SELECCION_UNICA', opciones: [{ valor: 'a', etiqueta: 'a' }] });
    expect(pesoDeLaPregunta(larga)).toBe(PESO_MAXIMO_DE_UN_PASO);
    expect(pesoDeLaPregunta(corta)).toBe(1);
  });
});

describe('retomar, avance y preguntas que faltan', () => {
  const pasos = armarPasos(secciones, conNegocio(null));

  it('el paso guardado se acota al recorrido', () => {
    expect(indiceInicial(null, 10)).toBe(0);
    expect(indiceInicial(4, 10)).toBe(4);
    expect(indiceInicial(99, 10)).toBe(9);
    expect(indiceInicial(-3, 10)).toBe(0);
    expect(indiceInicial(2, 0)).toBe(0);
  });

  it('con lo respondido, los pasos son los mismos que vio la persona (retomar cae en el mismo paso)', () => {
    const valores = valoresIniciales(diagnosticoDeEjemplo({ respuestas: respuestasCompletas(true) }));
    const pasosConNegocio = armarPasos(secciones, valores);
    expect(pasosConNegocio.some(p => p.seccion.clave === 'tu-negocio')).toBe(true);
    expect(armarPasos(secciones, valores).map(p => p.clave)).toEqual(pasosConNegocio.map(p => p.clave));
  });

  it('la barra tiene un tramo por sección y el paso en curso cuenta a medias', () => {
    const tramos = rellenoPorSeccion(pasos, 0);
    expect(tramos).toHaveLength(5); // sin la sección del negocio
    expect(tramos[0]).toBe(0.5); // paso 1 de 2 de «Conociéndote»
    expect(tramos.slice(1).every(t => t === 0)).toBe(true);
    const mas = rellenoPorSeccion(pasos, 2);
    expect(mas[0]).toBe(1);
    expect(mas[1]).toBeGreaterThan(0);
    expect(rellenoPorSeccion(pasos, pasos.length - 1).every(t => t > 0)).toBe(true);
    expect(rellenoPorSeccion([], 0)).toEqual([]);
  });

  it('la portada no cuenta: el primer paso es el 1', () => {
    expect(descripcionDelAvance(pasos, 0)).toBe(`Paso 1 de ${pasos.length}, conociéndote`);
  });

  it('encuentra el paso de la primera pregunta que falta, en el orden del recorrido', () => {
    expect(primeraQueFalta(pasos, [P.relaciones, P.nombre])).toEqual({ indice: 0, preguntaId: P.nombre });
    expect(primeraQueFalta(pasos, [P.consentimiento])?.indice).toBe(pasos.length - 1);
    expect(primeraQueFalta(pasos, [P.negocioQueHace])).toBeNull(); // oculta: no se pide
    expect(primeraQueFalta(pasos, [])).toBeNull();
  });
});
