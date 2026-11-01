import { describe, expect, it } from '@jest/globals';

import {
  leerBorrador,
  leerPreguntaAdmin,
  leerResultadoDeAsignar,
  leerResultadoDeImportacion,
  leerResultadoDePublicar,
  leerResultadoDeQuitar,
  leerVersiones,
  leerVistaPreviaDeImportacion,
} from '../api/diagnosticoAdminSchemas';

/** El borrador y sus respuestas se leen con tolerancia: una pregunta rota se pierde ELLA, no la pantalla. */

const PREGUNTA = {
  id: 812,
  clave: 'diag_p1',
  orden: 1,
  seccionId: 32,
  estado: 'ACTIVA',
  protegida: true,
  respuestas: 7,
  texto: '¿Cuál es tu nombre completo?',
  ayuda: '  ',
  tipo: 'TEXTO',
  requerida: true,
  opciones: [],
  escala: null,
  seMuestraSi: null,
  alimenta: null,
  formaciones: ['DIPLOMADO'],
  precarga: 'NOMBRE_COMPLETO',
};

describe('leerPreguntaAdmin', () => {
  it('lee una pregunta completa', () => {
    const p = leerPreguntaAdmin(PREGUNTA);
    expect(p).toMatchObject({
      id: 812, clave: 'diag_p1', seccionId: 32, estado: 'ACTIVA', protegida: true, respuestas: 7,
      requerida: true, formaciones: ['DIPLOMADO'], precarga: 'NOMBRE_COMPLETO', ayuda: null,
    });
  });

  it('una opción sin valor toma su etiqueta como valor, y una rota se pierde sola', () => {
    const p = leerPreguntaAdmin({ ...PREGUNTA, tipo: 'SELECCION_UNICA', opciones: [{ etiqueta: 'Sí.' }, { valor: 'CUERPO', etiqueta: 'Cuerpo' }, 7] });
    expect(p?.opciones).toEqual([{ valor: 'Sí.', etiqueta: 'Sí.' }, { valor: 'CUERPO', etiqueta: 'Cuerpo' }]);
  });

  it('un tipo que esta versión no conoce, o un cuerpo roto, devuelve null', () => {
    expect(leerPreguntaAdmin({ ...PREGUNTA, tipo: 'FIRMA' })).toBeNull();
    expect(leerPreguntaAdmin({ texto: 'sin id' })).toBeNull();
    expect(leerPreguntaAdmin(null)).toBeNull();
  });

  it('lo que falta toma un valor seguro: activa, no protegida, sin respuestas, en todas las formaciones', () => {
    const p = leerPreguntaAdmin({ id: 1, texto: 'x', tipo: 'NUMERO' }, 9);
    expect(p).toMatchObject({ estado: 'ACTIVA', protegida: false, respuestas: 0, formaciones: null, seccionId: 9, alimenta: null, seMuestraSi: null });
  });

  it('los destinos de la meta medible se leen', () => {
    expect(leerPreguntaAdmin({ ...PREGUNTA, alimenta: 'META_NEGOCIO' })?.alimenta).toBe('META_NEGOCIO');
    expect(leerPreguntaAdmin({ ...PREGUNTA, alimenta: 'UNIDAD_CUERPO' })?.alimenta).toBe('UNIDAD_CUERPO');
    expect(leerPreguntaAdmin({ ...PREGUNTA, alimenta: 'PARTIDA_RELACIONES' })?.alimenta).toBe('PARTIDA_RELACIONES');
  });

  it('un destino desconocido se lee como ninguno', () => {
    expect(leerPreguntaAdmin({ ...PREGUNTA, alimenta: 'OTRA_COSA' })?.alimenta).toBeNull();
    expect(leerPreguntaAdmin({ ...PREGUNTA, alimenta: 'PRIMERA_ACCION' })?.alimenta).toBe('PRIMERA_ACCION');
  });
});

describe('leerBorrador', () => {
  const BORRADOR = {
    publicada: { version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' } },
    hayCambiosSinPublicar: true,
    puedePublicar: { ok: false, motivos: ['Falta el texto de la declaración de responsabilidad'] },
    secciones: [
      { id: 32, clave: 'conociendote', titulo: 'Conociéndote', orden: 2, esPortada: false, preguntas: [{ ...PREGUNTA, orden: 2 }, { ...PREGUNTA, id: 813, orden: 1 }, { id: 9, texto: 'x', tipo: 'FIRMA' }] },
      { id: 31, clave: 'portada', titulo: 'Diagnóstico', descripcion: 'Tiempo estimado: 15 minutos', orden: 1, esPortada: true, preguntas: [] },
      'basura',
    ],
    retiradas: [{ ...PREGUNTA, id: 900, estado: 'ACTIVA' }],
    totales: { secciones: 6, preguntas: 29 },
  };

  it('ordena secciones y preguntas, y marca como retiradas las de la lista de retiradas', () => {
    const b = leerBorrador(BORRADOR)!;
    expect(b.secciones.map(s => s.id)).toEqual([31, 32]);
    expect(b.secciones[1].preguntas.map(p => p.id)).toEqual([813, 812]);
    expect(b.retiradas).toHaveLength(1);
    expect(b.retiradas[0].estado).toBe('RETIRADA');
    expect(b.secciones[0]).toMatchObject({ esPortada: true, descripcion: 'Tiempo estimado: 15 minutos' });
  });

  it('cuenta lo que no entendió en vez de esconderlo en silencio', () => {
    expect(leerBorrador(BORRADOR)!.noEntendidas).toBe(1);
  });

  it('trae la versión publicada, los motivos y los totales', () => {
    const b = leerBorrador(BORRADOR)!;
    expect(b.publicada).toEqual({ version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' } });
    expect(b.hayCambiosSinPublicar).toBe(true);
    expect(b.puedePublicar).toEqual({ ok: false, motivos: ['Falta el texto de la declaración de responsabilidad'] });
    expect(b.totales).toEqual({ secciones: 6, preguntas: 29 });
  });

  it('sin publicar, sin totales y sin «puedePublicar»: se calculan y no se bloquea', () => {
    const b = leerBorrador({ secciones: [{ id: 5, titulo: 'A', orden: 1, preguntas: [{ id: 1, texto: 'x', tipo: 'TEXTO' }] }] })!;
    expect(b.publicada).toBeNull();
    expect(b.totales).toEqual({ secciones: 1, preguntas: 1 });
    expect(b.puedePublicar.ok).toBe(true);
  });

  it('«ok: false» sin motivos igual apaga el botón', () => {
    expect(leerBorrador({ puedePublicar: { ok: false } })!.puedePublicar).toEqual({ ok: false, motivos: [] });
  });

  it('algo que no es un borrador es null', () => {
    expect(leerBorrador('x')).toBeNull();
    expect(leerBorrador(null)).toBeNull();
  });
});

describe('las demás respuestas', () => {
  it('quitar: los números que faltan son 0', () => {
    expect(leerResultadoDeQuitar({ eliminadas: 2, retiradas: 1, conRespuestas: 1 })).toEqual({ eliminadas: 2, retiradas: 1, conRespuestas: 1 });
    expect(leerResultadoDeQuitar(null)).toEqual({ eliminadas: 0, retiradas: 0, conRespuestas: 0 });
  });

  it('publicar: la versión nueva y quién', () => {
    expect(leerResultadoDePublicar({ version: 4, publicadaEn: '2026-11-01T10:00:00Z', publicadaPor: { id: 7, nombre: 'Ana' } })).toEqual({
      version: 4, publicadaEn: '2026-11-01T10:00:00Z', publicadaPor: { id: '7', nombre: 'Ana' },
    });
    expect(leerResultadoDePublicar({})).toBeNull();
  });

  it('versiones: una rota se pierde sola', () => {
    const v = leerVersiones([{ version: 4, publicadaEn: null, publicadaPor: null, preguntas: 30 }, { nada: true }]);
    expect(v).toEqual([{ version: 4, publicadaEn: null, publicadaPor: null, preguntas: 30 }]);
    expect(leerVersiones('x')).toEqual([]);
  });

  it('vista previa de la importación: filas, errores por fila, advertencias y conteos', () => {
    const v = leerVistaPreviaDeImportacion({
      secciones: 6, preguntas: 29,
      filas: [{ numero: 2, seccion: 'A', clave: 'p1', texto: 'x', tipo: 'Texto corto' }, 5],
      errores: [{ fila: 14, columna: 'Tipo', mensaje: 'Tipo desconocido' }, { fila: 3 }],
      advertencias: [{ fila: 8, mensaje: 'Pregunta repetida' }],
      preguntasQueSeRetirarian: 4, conRespuestas: 2,
    })!;
    expect(v.filas).toHaveLength(1);
    expect(v.errores).toEqual([{ fila: 14, columna: 'Tipo', mensaje: 'Tipo desconocido' }]);
    expect(v.advertencias).toEqual([{ fila: 8, mensaje: 'Pregunta repetida' }]);
    expect(v).toMatchObject({ secciones: 6, preguntas: 29, preguntasQueSeRetirarian: 4, conRespuestas: 2 });
  });

  it('resultado de importar y de asignar', () => {
    expect(leerResultadoDeImportacion({ secciones: 6, preguntas: 29, eliminadas: 1, retiradas: 2 })).toEqual({ secciones: 6, preguntas: 29, eliminadas: 1, retiradas: 2 });
    expect(leerResultadoDeAsignar({ asignadas: 12, omitidas: [{ id: 'u9', nombre: 'Luis', motivo: 'Ya respondió' }, { id: 4 }, null] })).toEqual({
      asignadas: 12,
      omitidas: [
        { id: 'u9', nombre: 'Luis', motivo: 'Ya respondió' },
        { id: '4', nombre: 'Persona sin nombre', motivo: 'No se pudo cambiar su ficha.' },
      ],
    });
    expect(leerResultadoDeAsignar(undefined)).toEqual({ asignadas: 0, omitidas: [] });
  });
});
