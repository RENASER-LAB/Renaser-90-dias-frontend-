import { describe, expect, it } from '@jest/globals';

import {
  diagnosticoDeEjemplo,
  filasCompletas,
  P,
  pregunta,
  respuestaBooleano,
  respuestaJson,
  respuestaNumero,
  respuestaTexto,
  seccionesDeEjemplo,
} from '../../__tests__/fixturesDelDiagnostico';
import {
  aRespuesta,
  aplicarPrecarga,
  desdeRespuesta,
  estaVacia,
  limpiarNumeroTecleado,
  numeroDelTexto,
  RESPUESTA_VACIA,
  valoresIniciales,
} from '../respuestasEnEdicion';

const preguntas = Object.fromEntries(seccionesDeEjemplo().flatMap(s => s.preguntas).map(p => [p.id, p]));

describe('serialización de respuestas', () => {
  it('texto, párrafo y opción única van en valorTexto, sin espacios sobrantes', () => {
    expect(aRespuesta(preguntas[P.nombre], { ...RESPUESTA_VACIA, texto: '  María Pérez ' })).toEqual(respuestaTexto(P.nombre, 'María Pérez'));
    expect(aRespuesta(preguntas[P.tieneNegocio], { ...RESPUESTA_VACIA, texto: 'Sí.' })).toEqual(respuestaTexto(P.tieneNegocio, 'Sí.'));
  });

  it('un número va en valorNumero y acepta la coma decimal', () => {
    expect(aRespuesta(preguntas[P.edad], { ...RESPUESTA_VACIA, texto: '34' })).toEqual(respuestaNumero(P.edad, 34));
    expect(aRespuesta(preguntas[P.negocioFacturacion], { ...RESPUESTA_VACIA, texto: '1250,5' })).toEqual(respuestaNumero(P.negocioFacturacion, 1250.5));
  });

  it('lo vacío se manda con todo en null (el servidor borra la anterior), nunca con una cadena vacía', () => {
    const vacia = { preguntaId: P.nombre, valorTexto: null, valorNumero: null, valorBooleano: null, valorEscala: null, valorJson: null };
    expect(aRespuesta(preguntas[P.nombre], { ...RESPUESTA_VACIA, texto: '   ' })).toEqual(vacia);
    expect(aRespuesta(preguntas[P.edad], { ...RESPUESTA_VACIA, texto: 'abc' })).toEqual({ ...vacia, preguntaId: P.edad });
    expect(aRespuesta(preguntas[P.queHaces], RESPUESTA_VACIA)).toEqual({ ...vacia, preguntaId: P.queHaces });
    expect(aRespuesta(preguntas[P.consentimiento], RESPUESTA_VACIA)).toEqual({ ...vacia, preguntaId: P.consentimiento });
  });

  it('las casillas van como texto JSON en el orden de las opciones, no en el de los toques', () => {
    const r = aRespuesta(preguntas[P.queHaces], { ...RESPUESTA_VACIA, valores: ['Dudo', 'Postergo'] });
    expect(r).toEqual(respuestaJson(P.queHaces, '["Postergo","Dudo"]'));
  });

  it('la cuadrícula va como texto JSON con una entrada por fila y sin filas que no existen', () => {
    const r = aRespuesta(preguntas[P.satisfaccion], { ...RESPUESTA_VACIA, filas: { ...filasCompletas(4), 'Fila inventada': 2 } });
    expect(JSON.parse(r.valorJson as string)).toEqual(filasCompletas(4));
  });

  it('la escala va en valorEscala y el consentimiento marcado en valorBooleano', () => {
    const escala = pregunta({ id: 90, tipo: 'ESCALA', escala: { min: 1, max: 5, etiquetaMin: null, etiquetaMax: null } });
    expect(aRespuesta(escala, { ...RESPUESTA_VACIA, escala: 3 }).valorEscala).toBe(3);
    expect(aRespuesta(preguntas[P.consentimiento], { ...RESPUESTA_VACIA, marcada: true })).toEqual(respuestaBooleano(P.consentimiento));
  });
});

describe('lo guardado → lo que se edita', () => {
  it('cada tipo recupera lo que se guardó', () => {
    expect(desdeRespuesta(preguntas[P.nombre], respuestaTexto(P.nombre, 'Ana')).texto).toBe('Ana');
    expect(desdeRespuesta(preguntas[P.edad], respuestaNumero(P.edad, 34)).texto).toBe('34');
    expect(desdeRespuesta(preguntas[P.queHaces], respuestaJson(P.queHaces, '["Dudo"]')).valores).toEqual(['Dudo']);
    expect(desdeRespuesta(preguntas[P.satisfaccion], respuestaJson(P.satisfaccion, '{"Mi salud":4}')).filas).toEqual({ 'Mi salud': 4 });
    expect(desdeRespuesta(preguntas[P.consentimiento], respuestaBooleano(P.consentimiento)).marcada).toBe(true);
  });

  it('un JSON roto o de otra forma queda vacío, sin romper', () => {
    expect(desdeRespuesta(preguntas[P.queHaces], respuestaJson(P.queHaces, '{no es json')).valores).toEqual([]);
    expect(desdeRespuesta(preguntas[P.queHaces], respuestaJson(P.queHaces, '{"a":1}')).valores).toEqual([]);
    expect(desdeRespuesta(preguntas[P.satisfaccion], respuestaJson(P.satisfaccion, '["x"]')).filas).toEqual({});
    expect(desdeRespuesta(preguntas[P.satisfaccion], respuestaJson(P.satisfaccion, '{"Mi salud":"mucho"}')).filas).toEqual({});
  });

  it('ida y vuelta: lo que se guarda se vuelve a leer igual', () => {
    const editada = { ...RESPUESTA_VACIA, valores: ['Postergo', 'Me distraigo'] };
    const vuelta = desdeRespuesta(preguntas[P.queHaces], aRespuesta(preguntas[P.queHaces], editada));
    expect(vuelta.valores).toEqual(['Postergo', 'Me distraigo']);
  });
});

describe('estaVacia', () => {
  it('cada tipo mira su propio campo', () => {
    expect(estaVacia(preguntas[P.nombre], { ...RESPUESTA_VACIA, texto: ' ' })).toBe(true);
    expect(estaVacia(preguntas[P.nombre], { ...RESPUESTA_VACIA, texto: 'a' })).toBe(false);
    expect(estaVacia(preguntas[P.queHaces], { ...RESPUESTA_VACIA, valores: ['Dudo'] })).toBe(false);
    expect(estaVacia(preguntas[P.satisfaccion], { ...RESPUESTA_VACIA, filas: { 'Mi salud': 1 } })).toBe(false);
    expect(estaVacia(preguntas[P.consentimiento], { ...RESPUESTA_VACIA, marcada: true })).toBe(false);
  });
});

describe('números tecleados', () => {
  it('se leen con punto o coma y no aceptan letras', () => {
    expect(numeroDelTexto('12')).toBe(12);
    expect(numeroDelTexto('12,5')).toBe(12.5);
    expect(numeroDelTexto('-3')).toBe(-3);
    expect(numeroDelTexto('12abc')).toBeNull();
    expect(numeroDelTexto('')).toBeNull();
    expect(numeroDelTexto('1.2.3')).toBeNull();
  });

  it('al teclear solo quedan dígitos, un signo al principio y un separador', () => {
    expect(limpiarNumeroTecleado('12a3')).toBe('123');
    expect(limpiarNumeroTecleado('1.2,3')).toBe('1.23');
    expect(limpiarNumeroTecleado('--5')).toBe('-5');
    expect(limpiarNumeroTecleado('5-')).toBe('5');
  });
});

describe('precarga y valores iniciales', () => {
  it('la precarga llena lo que no se respondió, para confirmarlo', () => {
    const v = valoresIniciales(diagnosticoDeEjemplo());
    expect(v[P.nombre].texto).toBe('María Pérez');
    expect(v[P.ciudad].texto).toBe('Arequipa');
    expect(v[P.edad]).toBeUndefined();
  });

  it('lo ya respondido manda sobre la precarga', () => {
    const v = valoresIniciales(diagnosticoDeEjemplo({ respuestas: [respuestaTexto(P.nombre, 'Ana María Pérez')] }));
    expect(v[P.nombre].texto).toBe('Ana María Pérez');
  });

  it('en una opción única solo entra si es una de las opciones', () => {
    expect(aplicarPrecarga(preguntas[P.prioridad], 'TRABAJO').texto).toBe('TRABAJO');
    expect(aplicarPrecarga(preguntas[P.prioridad], 'otra cosa').texto).toBe('');
    expect(aplicarPrecarga(preguntas[P.queHaces], 'Dudo')).toEqual(RESPUESTA_VACIA);
  });
});
