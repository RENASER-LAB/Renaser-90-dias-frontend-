import { describe, expect, it } from '@jest/globals';

import { filasCompletas, P, pregunta, seccionesDeEjemplo } from '../../__tests__/fixturesDelDiagnostico';
import { armarPasos } from '../pasosDelRecorrido';
import { RESPUESTA_VACIA, type ValoresDelDiagnostico } from '../respuestasEnEdicion';
import { mensajeDeLaPregunta, primerPasoConFalta, validarPaso } from '../validacion';

const preguntas = Object.fromEntries(seccionesDeEjemplo().flatMap(s => s.preguntas).map(p => [p.id, p]));
const con = (cambios: Partial<typeof RESPUESTA_VACIA>) => ({ ...RESPUESTA_VACIA, ...cambios });

describe('qué le falta a una pregunta', () => {
  it('una obligatoria vacía dice qué hacer, con su mensaje propio por tipo', () => {
    expect(mensajeDeLaPregunta(preguntas[P.nombre], RESPUESTA_VACIA)).toBe('Escribe tu respuesta para continuar.');
    expect(mensajeDeLaPregunta(preguntas[P.edad], RESPUESTA_VACIA)).toBe('Escribe un número para continuar.');
    expect(mensajeDeLaPregunta(preguntas[P.tieneNegocio], RESPUESTA_VACIA)).toBe('Elige una opción para continuar.');
    expect(mensajeDeLaPregunta(preguntas[P.queHaces], RESPUESTA_VACIA)).toBe('Elige al menos una opción para continuar.');
    expect(mensajeDeLaPregunta(preguntas[P.satisfaccion], RESPUESTA_VACIA)).toBe('Responde todas las filas para continuar.');
  });

  it('una opcional vacía pasa', () => {
    expect(mensajeDeLaPregunta(preguntas[P.dedica], RESPUESTA_VACIA)).toBeNull();
    expect(mensajeDeLaPregunta(preguntas[P.cambio], RESPUESTA_VACIA)).toBeNull();
  });

  it('el consentimiento siempre se marca, aunque no esté como obligatorio', () => {
    expect(mensajeDeLaPregunta(preguntas[P.consentimiento], RESPUESTA_VACIA)).toBe('Marca la casilla para continuar.');
    expect(mensajeDeLaPregunta({ ...preguntas[P.consentimiento], requerida: false }, RESPUESTA_VACIA)).toBe('Marca la casilla para continuar.');
    expect(mensajeDeLaPregunta(preguntas[P.consentimiento], con({ marcada: true }))).toBeNull();
  });

  it('la cuadrícula no avanza hasta responder todas las filas, ni siquiera siendo opcional si ya empezó', () => {
    const faltaUna = Object.fromEntries(Object.entries(filasCompletas(3)).slice(1));
    expect(mensajeDeLaPregunta(preguntas[P.satisfaccion], con({ filas: faltaUna }))).toBe('Responde todas las filas para continuar.');
    expect(mensajeDeLaPregunta(preguntas[P.satisfaccion], con({ filas: filasCompletas(3) }))).toBeNull();
    const opcional = { ...preguntas[P.satisfaccion], requerida: false };
    expect(mensajeDeLaPregunta(opcional, RESPUESTA_VACIA)).toBeNull();
    expect(mensajeDeLaPregunta(opcional, con({ filas: faltaUna }))).toBe('Responde todas las filas para continuar.');
  });

  it('las casillas no pasan del máximo', () => {
    expect(mensajeDeLaPregunta(preguntas[P.queHaces], con({ valores: ['Postergo', 'Dudo'] }))).toBeNull();
    expect(mensajeDeLaPregunta(preguntas[P.queHaces], con({ valores: ['Postergo', 'Dudo', 'Me distraigo'] }))).toBe('Elige como máximo 2.');
  });

  it('un número tiene que ser un número y una fecha tiene que existir', () => {
    expect(mensajeDeLaPregunta(preguntas[P.edad], con({ texto: 'treinta' }))).toBe('Escribe solo números.');
    expect(mensajeDeLaPregunta(preguntas[P.edad], con({ texto: '34' }))).toBeNull();
    const fecha = pregunta({ id: 50, tipo: 'FECHA' });
    expect(mensajeDeLaPregunta(fecha, RESPUESTA_VACIA)).toBe('Elige una fecha para continuar.');
    expect(mensajeDeLaPregunta(fecha, con({ texto: '31/02/2026' }))).toBe('Esa fecha no es válida.');
    expect(mensajeDeLaPregunta(fecha, con({ texto: '15/06/2026' }))).toBeNull();
  });

  it('una respuesta de objetivo no pasa de su largo máximo', () => {
    expect(mensajeDeLaPregunta(preguntas[P.salud], con({ texto: 'a'.repeat(500) }))).toBeNull();
    expect(mensajeDeLaPregunta(preguntas[P.salud], con({ texto: 'a'.repeat(501) }))).toBe('Usa como máximo 500 caracteres.');
  });

  it('la escala debe estar dentro de su rango', () => {
    const escala = pregunta({ id: 60, tipo: 'ESCALA', escala: { min: 1, max: 5, etiquetaMin: null, etiquetaMax: null } });
    expect(mensajeDeLaPregunta(escala, RESPUESTA_VACIA)).toBe('Elige un número del 1 al 5.');
    expect(mensajeDeLaPregunta(escala, con({ escala: 4 }))).toBeNull();
    expect(mensajeDeLaPregunta(escala, con({ escala: 9 }))).toBe('Elige un número del 1 al 5.');
  });
});

describe('qué falta en un paso y en todo el recorrido', () => {
  const sinNegocio: ValoresDelDiagnostico = { [P.tieneNegocio]: con({ texto: 'No.' }) };
  const pasos = armarPasos(seccionesDeEjemplo(), sinNegocio);

  it('marca cada pregunta del paso que falta, por su id', () => {
    const errores = validarPaso(pasos[0], {});
    expect(Object.keys(errores).map(Number).sort()).toEqual([P.nombre, P.edad, P.ciudad].sort());
    expect(validarPaso(pasos[0], { [P.nombre]: con({ texto: 'Ana' }), [P.edad]: con({ texto: '30' }), [P.ciudad]: con({ texto: 'Lima' }) })).toEqual({});
  });

  it('las preguntas ocultas no se piden', () => {
    const todo = pasos.flatMap(p => p.preguntas.map(q => q.id));
    expect(todo).not.toContain(P.negocioQueHace);
    const faltante = primerPasoConFalta(pasos, sinNegocio);
    expect(faltante?.preguntaId).toBe(P.nombre);
  });

  it('encuentra la primera que falta en todo el recorrido (por si un borrador dejó algo atrás)', () => {
    const casiTodo: ValoresDelDiagnostico = {
      [P.nombre]: con({ texto: 'Ana' }),
      [P.edad]: con({ texto: '30' }),
      [P.ciudad]: con({ texto: 'Lima' }),
      [P.satisfaccion]: con({ filas: filasCompletas() }),
      [P.sueno]: con({ texto: '6 a 8' }),
      [P.tieneNegocio]: con({ texto: 'No.' }),
      [P.queHaces]: con({ valores: ['Dudo'] }),
      [P.situacion]: con({ texto: 'algo' }),
    };
    const faltante = primerPasoConFalta(pasos, casiTodo);
    expect(faltante?.preguntaId).toBe(P.relaciones);
    expect(pasos[faltante?.indice ?? 0].preguntas.map(p => p.id)).toContain(P.relaciones);
  });
});
