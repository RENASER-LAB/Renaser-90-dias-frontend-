import { describe, expect, it } from '@jest/globals';

import type { LecturaDelDiagnostico, PreguntaLeida } from '../../types/diagnostico.types';
import {
  cuentaDeLaLectura,
  dichoDeLaPregunta,
  fechaDeLaLectura,
  renglonesDeLaRespuesta,
  tieneRespuesta,
} from '../lecturaLegible';

const pregunta = (extra: Partial<PreguntaLeida> = {}): PreguntaLeida => ({
  id: 1,
  texto: '¿Tienes un negocio?',
  tipo: 'SELECCION_UNICA',
  retirada: false,
  respuesta: { texto: 'Sí.', valores: [], filas: [] },
  ...extra,
});

describe('cómo se lee una respuesta', () => {
  it('un texto es un renglón', () => {
    expect(renglonesDeLaRespuesta(pregunta())).toEqual(['Sí.']);
  });

  it('las casillas son un renglón por valor', () => {
    const p = pregunta({ respuesta: { texto: null, valores: ['Postergo', 'Dudo'], filas: [] } });
    expect(renglonesDeLaRespuesta(p)).toEqual(['Postergo', 'Dudo']);
  });

  it('la cuadrícula es una fila por área, «Mi salud… · 4 de 5» cuando se sabe el tope y «Mi salud… · 4» cuando no', () => {
    const respuesta = { texto: null, valores: [], filas: [{ etiqueta: 'Mi salud…', valor: 4 }, { etiqueta: 'Mi dinero', valor: 2 }] };
    expect(renglonesDeLaRespuesta(pregunta({ respuesta, escalaMax: 5 }))).toEqual(['Mi salud… · 4 de 5', 'Mi dinero · 2 de 5']);
    expect(renglonesDeLaRespuesta(pregunta({ respuesta }))).toEqual(['Mi salud… · 4', 'Mi dinero · 2']);
  });

  it('el consentimiento dice «Aceptó»', () => {
    const p = pregunta({ tipo: 'CASILLA', respuesta: { texto: 'Aceptó', valores: [], filas: [] } });
    expect(renglonesDeLaRespuesta(p)).toEqual(['Aceptó']);
  });

  it('sin respuesta no hay renglones, y el lector de pantalla lo dice', () => {
    const p = pregunta({ respuesta: null });
    expect(renglonesDeLaRespuesta(p)).toEqual([]);
    expect(tieneRespuesta(p)).toBe(false);
    expect(dichoDeLaPregunta(p)).toBe('¿Tienes un negocio?. Sin respuesta');
    expect(tieneRespuesta(pregunta({ respuesta: { texto: '  ', valores: [], filas: [] } }))).toBe(false);
  });

  it('una pregunta retirada se anuncia así', () => {
    expect(dichoDeLaPregunta(pregunta({ retirada: true }))).toBe('¿Tienes un negocio?. Pregunta retirada. Sí.');
  });
});

describe('la cuenta y la fecha', () => {
  const lectura = (preguntas: PreguntaLeida[]): LecturaDelDiagnostico => ({
    persona: null, ficha: 'CON_DIAGNOSTICO', estado: 'COMPLETADO', version: 1, completadoEn: null, formacion: null,
    secciones: [{ titulo: 'A', preguntas }],
  });

  it('cuenta las respondidas de las que se le hicieron', () => {
    expect(cuentaDeLaLectura(lectura([pregunta(), pregunta({ id: 2, respuesta: null })]))).toEqual({ respondidas: 1, total: 2 });
  });

  it('la fecha va en palabras y en la hora de Lima', () => {
    expect(fechaDeLaLectura('2026-11-02T15:04:00Z')).toBe('2 de noviembre de 2026');
    // 02:00 UTC del 3 de noviembre todavía es 2 de noviembre en Lima.
    expect(fechaDeLaLectura('2026-11-03T02:00:00Z')).toBe('2 de noviembre de 2026');
    expect(fechaDeLaLectura(null)).toBeNull();
    expect(fechaDeLaLectura('mañana')).toBeNull();
  });
});
