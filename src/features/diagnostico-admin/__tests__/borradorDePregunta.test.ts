import { describe, expect, it } from '@jest/globals';

import {
  alternarFormacion,
  conDestino,
  conTipo,
  cuerpoDesde,
  dejaDeAlimentarUnObjetivo,
  faltasDeLaPregunta,
  formularioDesde,
  formularioNuevo,
  hayCambios,
  motivoParaNoCambiarElTipo,
  opcionNueva,
  pasarLimiteDeLaEscala,
  pasarMaximo,
  primeraFalta,
  textoDelMaximo,
} from '../utils/borradorDePregunta';
import { fichaDePrueba, pregunta, SI_NO } from './fixtures';

/** El formulario del editor: qué falta, qué viaja y cuándo hay algo sin guardar. */

const SECCIONES = fichaDePrueba();
const ctxNueva = { secciones: SECCIONES, preguntaId: null };

function nueva(parcial: Partial<ReturnType<typeof formularioNuevo>> = {}) {
  return { ...formularioNuevo(3), texto: 'Una pregunta', ...parcial };
}

describe('qué falta antes de guardar', () => {
  it('una pregunta de texto solo pide el texto', () => {
    expect(faltasDeLaPregunta(nueva({ texto: '  ' }), ctxNueva)).toEqual({ texto: 'Escribe la pregunta.' });
    expect(faltasDeLaPregunta(nueva(), ctxNueva)).toEqual({});
  });

  it('opción única y casillas piden al menos dos opciones, sin repetidas', () => {
    const base = nueva({ tipo: 'SELECCION_UNICA' });
    expect(faltasDeLaPregunta(base, ctxNueva).opciones).toBe('Escribe al menos 2 opciones.');
    expect(faltasDeLaPregunta({ ...base, opciones: [opcionNueva('Sí'), opcionNueva('  ')] }, ctxNueva).opciones).toBe('Escribe al menos 2 opciones.');
    expect(faltasDeLaPregunta({ ...base, opciones: [opcionNueva('Sí'), opcionNueva(' sí ')] }, ctxNueva).opciones).toBe('Hay opciones repetidas.');
    expect(faltasDeLaPregunta({ ...base, opciones: [opcionNueva('Sí'), opcionNueva('No')] }, ctxNueva)).toEqual({});
  });

  it('la cuadrícula pide al menos una fila y la dice «fila»', () => {
    const base = nueva({ tipo: 'CUADRICULA' });
    expect(faltasDeLaPregunta(base, ctxNueva).opciones).toBe('Escribe al menos una fila.');
    expect(faltasDeLaPregunta({ ...base, opciones: [opcionNueva('Salud')] }, ctxNueva)).toEqual({});
  });

  it('el consentimiento pide el texto de la casilla', () => {
    expect(faltasDeLaPregunta(nueva({ tipo: 'CASILLA' }), ctxNueva).opciones).toBe('Escribe el texto de la casilla.');
    expect(faltasDeLaPregunta(nueva({ tipo: 'CASILLA', opciones: [opcionNueva('Acepto')] }), ctxNueva)).toEqual({});
  });

  it('el máximo de opciones no pasa de las que hay', () => {
    const base = nueva({ tipo: 'SELECCION_MULTIPLE', opciones: [opcionNueva('A'), opcionNueva('B'), opcionNueva('C')] });
    expect(faltasDeLaPregunta({ ...base, maximoOpciones: 4 }, ctxNueva).maximo).toBe('El máximo no puede pasar de 3 opciones.');
    expect(faltasDeLaPregunta({ ...base, maximoOpciones: 3 }, ctxNueva)).toEqual({});
  });

  it('la escala pide mínimo menor que máximo y no pasa de 10', () => {
    const base = nueva({ tipo: 'ESCALA' });
    expect(faltasDeLaPregunta({ ...base, escalaMin: 5, escalaMax: 5 }, ctxNueva).escala).toMatch(/menor que el máximo/);
    expect(faltasDeLaPregunta({ ...base, escalaMin: 1, escalaMax: 11 }, ctxNueva).escala).toMatch(/entre 0 y 10/);
    expect(faltasDeLaPregunta({ ...base, escalaMin: 0, escalaMax: 10 }, ctxNueva)).toEqual({});
  });

  it('una condición que apunta a una pregunta posterior o a una opción que no existe es una falta', () => {
    // La pregunta 12 (sección 3) depende de la 11: bien. Pero la 10 (antes de la 11) no puede depender de ella.
    const ok = { ...formularioDesde(SECCIONES[2].preguntas[0]) };
    expect(faltasDeLaPregunta(ok, { secciones: SECCIONES, preguntaId: 12 })).toEqual({});
    const posterior = { ...formularioDesde(SECCIONES[1].preguntas[0]), condicionActiva: true, condicion: { preguntaId: 11, valor: 'Sí.' } };
    expect(faltasDeLaPregunta(posterior, { secciones: SECCIONES, preguntaId: 10 }).condicion).toMatch(/ya no está antes/);
    const sinOpcion = { ...ok, condicion: { preguntaId: 11, valor: 'Quizás' } };
    expect(faltasDeLaPregunta(sinOpcion, { secciones: SECCIONES, preguntaId: 12 }).condicion).toBeDefined();
  });

  it('«Se muestra solo si» prendido sin elegir pregunta y respuesta es una falta; apagado, la condición vieja no cuenta ni viaja', () => {
    const pendiente = nueva({ condicionActiva: true });
    expect(faltasDeLaPregunta(pendiente, ctxNueva).condicion).toMatch(/Elige la pregunta y la respuesta/);
    const apagada = nueva({ condicionActiva: false, condicion: { preguntaId: 999, valor: 'x' } });
    expect(faltasDeLaPregunta(apagada, ctxNueva)).toEqual({});
    expect(cuerpoDesde(apagada, null).seMuestraSi).toBeNull();
    const activa = nueva({ condicionActiva: true, condicion: { preguntaId: 11, valor: 'Sí.' } });
    expect(cuerpoDesde(activa, null).seMuestraSi).toEqual({ preguntaId: 11, valor: 'Sí.' });
  });

  it('un destino ocupado por otra pregunta avisa cuál; el de esta misma no', () => {
    const f = nueva({ tipo: 'AREA_TEXTO', alimenta: 'OBJETIVO_CUERPO' });
    expect(faltasDeLaPregunta(f, ctxNueva).alimenta).toMatch(/Ya lo alimenta «¿Qué quieres lograr con tu cuerpo\?»/);
    expect(faltasDeLaPregunta(f, { secciones: SECCIONES, preguntaId: 13 })).toEqual({});
  });

  it('un destino que no cuadra con el tipo es una falta', () => {
    expect(faltasDeLaPregunta(nueva({ tipo: 'NUMERO', alimenta: 'PRIMERA_ACCION' }), ctxNueva).alimenta).toMatch(/no se puede alimentar/);
    expect(faltasDeLaPregunta(nueva({ tipo: 'TEXTO', alimenta: 'PRIMERA_ACCION' }), ctxNueva)).toEqual({});
  });

  it('la prioridad y el trato piden un código por opción, sin repetir', () => {
    const base = nueva({ tipo: 'SELECCION_UNICA', alimenta: 'PRIORIDAD_PRINCIPAL', texto: 'Qué priorizas' });
    const dos = [opcionNueva('Mi cuerpo'), opcionNueva('Mi negocio')];
    expect(faltasDeLaPregunta({ ...base, opciones: dos }, ctxNueva).codigos).toBe('Elige a qué corresponde cada opción.');
    expect(faltasDeLaPregunta({ ...base, opciones: [{ ...dos[0], codigo: 'CUERPO' }, { ...dos[1], codigo: 'CUERPO' }] }, ctxNueva).codigos).toBe('Dos opciones no pueden corresponder a lo mismo.');
    expect(faltasDeLaPregunta({ ...base, opciones: [{ ...dos[0], codigo: 'CUERPO' }, { ...dos[1], codigo: 'TRABAJO' }] }, ctxNueva)).toEqual({});
  });

  it('primeraFalta devuelve la primera en el orden del formulario', () => {
    expect(primeraFalta({})).toBeNull();
    expect(primeraFalta({ escala: 'b', texto: 'a' })).toBe('a');
  });
});

describe('el cuerpo que viaja (PreguntaRequest)', () => {
  it('una pregunta de texto no lleva opciones ni escala ni máximo', () => {
    const f = nueva({ ayuda: ' una ayuda ', requerida: true, opciones: [opcionNueva('sobra')], maximoOpciones: 3, escalaMin: 2 });
    expect(cuerpoDesde(f, null)).toEqual({
      seccionId: 3, texto: 'Una pregunta', ayuda: 'una ayuda', tipo: 'TEXTO', requerida: true, maximoOpciones: null,
      opciones: [], escala: null, seMuestraSi: null, alimenta: null, formaciones: null, precarga: null,
    });
  });

  it('las opciones nuevas van sin valor; las que ya existían conservan el suyo aunque cambie la etiqueta', () => {
    const original = pregunta({ id: 11, tipo: 'SELECCION_UNICA', opciones: SI_NO });
    const f = formularioDesde(original);
    f.opciones[0] = { ...f.opciones[0], etiqueta: 'Sí, tengo' };
    f.opciones.push(opcionNueva('Prefiero no decirlo'));
    expect(cuerpoDesde(f, original).opciones).toEqual([
      { valor: 'Sí.', etiqueta: 'Sí, tengo' },
      { valor: 'No.', etiqueta: 'No.' },
      { etiqueta: 'Prefiero no decirlo' },
    ]);
  });

  it('una opción en blanco no viaja', () => {
    const f = nueva({ tipo: 'SELECCION_UNICA', opciones: [opcionNueva('A'), opcionNueva('  '), opcionNueva('B')] });
    expect(cuerpoDesde(f, null).opciones.map(o => o.etiqueta)).toEqual(['A', 'B']);
  });

  it('con prioridad o trato, cada opción lleva su código como valor', () => {
    const f = nueva({
      tipo: 'SELECCION_UNICA', alimenta: 'TRATO_DE_LA_PERSONA',
      opciones: [{ ...opcionNueva('Él'), codigo: 'MASCULINO' }, { ...opcionNueva('Ella'), codigo: 'FEMENINO' }, { ...opcionNueva('Elle'), codigo: 'NEUTRO' }],
    });
    expect(cuerpoDesde(f, null).opciones).toEqual([
      { valor: 'MASCULINO', etiqueta: 'Él' }, { valor: 'FEMENINO', etiqueta: 'Ella' }, { valor: 'NEUTRO', etiqueta: 'Elle' },
    ]);
    expect(cuerpoDesde(f, null).alimenta).toBe('TRATO_DE_LA_PERSONA');
  });

  it('si una pregunta con códigos deja de alimentar ese destino, sus opciones vuelven a llamarse como su etiqueta', () => {
    const original = pregunta({ id: 14, tipo: 'SELECCION_UNICA', alimenta: 'TRATO_DE_LA_PERSONA', opciones: [{ valor: 'MASCULINO', etiqueta: 'Él' }, { valor: 'FEMENINO', etiqueta: 'Ella' }] });
    const f = conDestino(formularioDesde(original), null);
    expect(cuerpoDesde(f, original).opciones).toEqual([{ etiqueta: 'Él' }, { etiqueta: 'Ella' }]);
  });

  it('el máximo solo viaja en casillas y nunca pasa de las opciones', () => {
    const casillas = nueva({ tipo: 'SELECCION_MULTIPLE', opciones: [opcionNueva('A'), opcionNueva('B')], maximoOpciones: 2 });
    expect(cuerpoDesde(casillas, null).maximoOpciones).toBe(2);
    expect(cuerpoDesde({ ...casillas, tipo: 'SELECCION_UNICA' }, null).maximoOpciones).toBeNull();
  });

  it('la escala viaja en escala y cuadrícula, con las etiquetas vacías como null', () => {
    const f = nueva({ tipo: 'CUADRICULA', opciones: [opcionNueva('Salud')], escalaMin: 1, escalaMax: 5, etiquetaMin: ' Nada ', etiquetaMax: '' });
    expect(cuerpoDesde(f, null).escala).toEqual({ min: 1, max: 5, etiquetaMin: 'Nada', etiquetaMax: null });
  });

  it('el consentimiento manda solo su casilla; la declaración va en la ayuda', () => {
    const f = nueva({ tipo: 'CASILLA', ayuda: 'Declaro que…', opciones: [opcionNueva('Acepto'), opcionNueva('sobra')] });
    expect(cuerpoDesde(f, null)).toMatchObject({ ayuda: 'Declaro que…', opciones: [{ etiqueta: 'Acepto' }] });
  });

  it('formaciones: ninguna o las tres es «todas» (null); si no, la lista en su orden', () => {
    expect(cuerpoDesde(nueva({ formaciones: [] }), null).formaciones).toBeNull();
    expect(cuerpoDesde(nueva({ formaciones: ['CERTIFICACION', 'ESCUELA', 'DIPLOMADO'] }), null).formaciones).toBeNull();
    expect(cuerpoDesde(nueva({ formaciones: ['DIPLOMADO'] }), null).formaciones).toEqual(['DIPLOMADO']);
  });

  it('la precarga del nombre se conserva al editar', () => {
    const original = pregunta({ id: 10, precarga: 'NOMBRE_COMPLETO' });
    expect(cuerpoDesde(formularioDesde(original), original).precarga).toBe('NOMBRE_COMPLETO');
  });
});

describe('cambios, tipo y destino', () => {
  it('hayCambios compara lo escrito, no los ids locales', () => {
    const original = pregunta({ id: 11, tipo: 'SELECCION_UNICA', opciones: SI_NO });
    const a = formularioDesde(original);
    expect(hayCambios(formularioDesde(original), a)).toBe(false);
    expect(hayCambios({ ...a, texto: 'otra' }, a)).toBe(true);
    expect(hayCambios({ ...a, formaciones: ['DIPLOMADO'] }, a)).toBe(true);
    expect(hayCambios({ ...a, opciones: [...a.opciones, opcionNueva('Tal vez')] }, a)).toBe(true);
  });

  it('cambiar el tipo suelta el destino que ya no cuadra', () => {
    const f = nueva({ tipo: 'AREA_TEXTO', alimenta: 'OBJETIVO_CUERPO' });
    expect(conTipo(f, 'TEXTO').alimenta).toBe('OBJETIVO_CUERPO');
    expect(conTipo(f, 'NUMERO').alimenta).toBeNull();
  });

  it('pasar a consentimiento deja la casilla lista', () => {
    expect(conTipo(nueva(), 'CASILLA').opciones).toHaveLength(1);
  });

  it('no se cambia el tipo de una protegida ni de una con respuestas', () => {
    expect(motivoParaNoCambiarElTipo(null)).toBeNull();
    expect(motivoParaNoCambiarElTipo(pregunta({ id: 1 }))).toBeNull();
    expect(motivoParaNoCambiarElTipo(pregunta({ id: 1, protegida: true }))).toMatch(/alimentan Plan/);
    expect(motivoParaNoCambiarElTipo(pregunta({ id: 1, respuestas: 1 }))).toBe('Ya la respondió 1 persona: no se puede cambiar su tipo.');
    expect(motivoParaNoCambiarElTipo(pregunta({ id: 1, respuestas: 5 }))).toBe('Ya la respondieron 5 personas: no se puede cambiar su tipo.');
  });

  it('dejar de alimentar un objetivo pide avisar; cambiar de objetivo también; otros destinos no', () => {
    const cuerpo = pregunta({ id: 13, tipo: 'AREA_TEXTO', alimenta: 'OBJETIVO_CUERPO' });
    const f = formularioDesde(cuerpo);
    expect(dejaDeAlimentarUnObjetivo(cuerpo, f)).toBe(false);
    expect(dejaDeAlimentarUnObjetivo(cuerpo, { ...f, alimenta: null })).toBe(true);
    expect(dejaDeAlimentarUnObjetivo(cuerpo, { ...f, alimenta: 'OBJETIVO_NEGOCIO' })).toBe(true);
    expect(dejaDeAlimentarUnObjetivo(null, f)).toBe(false);
    const trato = pregunta({ id: 14, tipo: 'SELECCION_UNICA', alimenta: 'TRATO_DE_LA_PERSONA' });
    expect(dejaDeAlimentarUnObjetivo(trato, { ...formularioDesde(trato), alimenta: null })).toBe(false);
  });

  it('alternar formaciones: las tres marcadas quedan como las tres (el cuerpo las lee como «todas»)', () => {
    expect(alternarFormacion([], 'DIPLOMADO')).toEqual(['DIPLOMADO']);
    expect(alternarFormacion(['DIPLOMADO'], 'ESCUELA')).toEqual(['ESCUELA', 'DIPLOMADO']);
    expect(alternarFormacion(['ESCUELA', 'DIPLOMADO'], 'DIPLOMADO')).toEqual(['ESCUELA']);
  });

  it('los extremos de la escala se mueven de a uno sin cruzarse ni pasar de 0 a 10', () => {
    expect(pasarLimiteDeLaEscala({ escalaMin: 1, escalaMax: 5 }, 'max', 1)).toEqual({ escalaMin: 1, escalaMax: 6 });
    expect(pasarLimiteDeLaEscala({ escalaMin: 1, escalaMax: 10 }, 'max', 1)).toEqual({ escalaMin: 1, escalaMax: 10 });
    expect(pasarLimiteDeLaEscala({ escalaMin: 1, escalaMax: 2 }, 'max', -1)).toEqual({ escalaMin: 1, escalaMax: 2 });
    expect(pasarLimiteDeLaEscala({ escalaMin: 1, escalaMax: 5 }, 'min', -1)).toEqual({ escalaMin: 0, escalaMax: 5 });
    expect(pasarLimiteDeLaEscala({ escalaMin: 0, escalaMax: 5 }, 'min', -1)).toEqual({ escalaMin: 0, escalaMax: 5 });
    expect(pasarLimiteDeLaEscala({ escalaMin: 4, escalaMax: 5 }, 'min', 1)).toEqual({ escalaMin: 4, escalaMax: 5 });
  });

  it('el máximo sube y baja entre «sin límite» y el número de opciones', () => {
    expect(pasarMaximo(null, 1, 4)).toBe(2);
    expect(pasarMaximo(2, 1, 4)).toBe(3);
    expect(pasarMaximo(4, 1, 4)).toBe(4);
    expect(pasarMaximo(2, -1, 4)).toBe(1);
    expect(pasarMaximo(1, -1, 4)).toBeNull();
    expect(pasarMaximo(null, -1, 4)).toBeNull();
    expect(textoDelMaximo(null)).toBe('Sin límite');
    expect(textoDelMaximo(3)).toBe('3');
  });
});
