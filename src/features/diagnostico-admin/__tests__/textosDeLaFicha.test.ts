import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../services/http/apiClient';
import type { BorradorDelDiagnostico, VistaPreviaDeImportacion } from '../types/diagnosticoAdmin.types';
import {
  hayTablaPegada,
  limpiarLoPegado,
  motivoParaNoConfirmar,
  resumenDeLaVistaPrevia,
  sePuedeConfirmar,
  textoDeLaAdvertencia,
  textoDelError,
  textoDelReemplazo,
  textoDelResultado as textoDeImportar,
} from '../utils/importacion';
import { estadoDePublicar, lineaDeLaVersion, otraPersonaPublico, textoDeLaPublicacion, versionBaseDe } from '../utils/publicar';
import {
  alternarMarca,
  resumenDeLaSeleccion,
  textoDeLaConfirmacion,
  textoDelContador,
  textoDelResultado,
  textoDeLosDependientes,
  textoDeQuitarSeccion,
} from '../utils/quitarPreguntas';
import { resumenDeContenido, textoDeLaFicha, textoDelLote } from '../utils/resumenDeLaFicha';
import { cantidad, codigoDelError, dependientesDelError, falloDe, fechaConMesCorto, motivosDelError, versionVigenteDelError } from '../utils/textos';
import { fichaDePrueba } from './fixtures';

const S = fichaDePrueba();

function borrador(parcial: Partial<BorradorDelDiagnostico> = {}): BorradorDelDiagnostico {
  return {
    publicada: { version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' } },
    hayCambiosSinPublicar: true,
    puedePublicar: { ok: true, motivos: [] },
    secciones: S,
    retiradas: [],
    totales: { secciones: 2, preguntas: 5 },
    noEntendidas: 0,
    ...parcial,
  };
}

describe('quitar preguntas', () => {
  it('cuenta las marcadas y las que tienen respuestas', () => {
    expect(resumenDeLaSeleccion([10, 13, 14], S)).toEqual({ marcadas: 3, conRespuestas: 2 });
    expect(resumenDeLaSeleccion([], S)).toEqual({ marcadas: 0, conRespuestas: 0 });
  });

  it('el contador dice «3 marcadas · 2 con respuestas»', () => {
    expect(textoDelContador({ marcadas: 3, conRespuestas: 2 })).toBe('3 marcadas · 2 con respuestas');
    expect(textoDelContador({ marcadas: 1, conRespuestas: 0 })).toBe('1 marcada');
    expect(textoDelContador({ marcadas: 0, conRespuestas: 0 })).toBe('Marca las preguntas que quieres quitar');
  });

  it('marcar y desmarcar', () => {
    expect(alternarMarca([1], 2)).toEqual([1, 2]);
    expect(alternarMarca([1, 2], 1)).toEqual([2]);
  });

  it('la confirmación dice cuántas se retiran y, sin versión publicada, que las demás se eliminan seguro', () => {
    const sinPublicar = textoDeLaConfirmacion({ marcadas: 3, conRespuestas: 2 }, false);
    expect(sinPublicar.titulo).toBe('¿Quitar 3 preguntas?');
    expect(sinPublicar.mensaje).toContain('2 tienen respuestas y se retirarán');
    expect(sinPublicar.mensaje).toContain('1 no tiene respuestas y nunca se publicaron: se eliminan');
    const publicada = textoDeLaConfirmacion({ marcadas: 1, conRespuestas: 0 }, true);
    expect(publicada.titulo).toBe('¿Quitar esta pregunta?');
    expect(publicada.mensaje).toContain('se eliminan si nunca se publicaron, y se retiran si ya se publicaron');
  });

  it('el resultado: «2 eliminadas · 1 retirada»', () => {
    expect(textoDelResultado({ eliminadas: 2, retiradas: 1, conRespuestas: 1 })).toBe('2 eliminadas · 1 retirada');
    expect(textoDelResultado({ eliminadas: 1, retiradas: 0, conRespuestas: 0 })).toBe('1 eliminada');
    expect(textoDelResultado({ eliminadas: 0, retiradas: 0, conRespuestas: 0 })).toBe('No se quitó nada');
  });

  it('los dependientes se nombran', () => {
    expect(textoDeLosDependientes([11], S, [12])).toBe('«Cuéntanos de tu pareja» se muestra según una de las que quieres quitar.');
    // Sin la lista del servidor, se calcula con las condiciones del borrador.
    expect(textoDeLosDependientes([11], S, [])).toContain('Cuéntanos de tu pareja');
    expect(textoDeLosDependientes([10], S, [])).toBe('Hay preguntas que se muestran según las que quieres quitar.');
  });

  it('quitar una sección dice qué pasa con sus preguntas', () => {
    expect(textoDeQuitarSeccion(S[2]).mensaje).toContain('Se quitan sus 3 preguntas');
    expect(textoDeQuitarSeccion(S[2]).mensaje).toContain('2 tienen respuestas');
    expect(textoDeQuitarSeccion(S[0]).mensaje).toBe('No tiene preguntas.');
  });
});

describe('importar', () => {
  const v = (parcial: Partial<VistaPreviaDeImportacion> = {}): VistaPreviaDeImportacion => ({
    secciones: 6, preguntas: 29, filas: [], errores: [], advertencias: [], preguntasQueSeRetirarian: 0, conRespuestas: 0, ...parcial,
  });

  it('el resumen y los errores por fila', () => {
    expect(resumenDeLaVistaPrevia(v())).toBe('6 secciones · 29 preguntas');
    expect(resumenDeLaVistaPrevia({ secciones: 1, preguntas: 1 })).toBe('1 sección · 1 pregunta');
    expect(textoDelError({ fila: 14, columna: null, mensaje: 'Falta el tipo' })).toBe('Fila 14: Falta el tipo');
    expect(textoDelError({ fila: 14, columna: 'Tipo', mensaje: 'No se conoce' })).toBe('Fila 14, columna «Tipo»: No se conoce');
    expect(textoDelError({ fila: 0, columna: null, mensaje: 'Está vacío' })).toBe('Archivo: Está vacío');
    expect(textoDeLaAdvertencia({ fila: 8, mensaje: 'Pregunta repetida' })).toBe('Fila 8: Pregunta repetida');
  });

  it('con errores no se puede confirmar, y se dice por qué', () => {
    expect(sePuedeConfirmar(v())).toBe(true);
    expect(sePuedeConfirmar(null)).toBe(false);
    const con = v({ errores: [{ fila: 2, columna: null, mensaje: 'x' }, { fila: 3, columna: null, mensaje: 'y' }] });
    expect(sePuedeConfirmar(con)).toBe(false);
    expect(motivoParaNoConfirmar(con)).toBe('Corrige los 2 errores de la tabla y vuelve a revisarla.');
    expect(motivoParaNoConfirmar(v({ errores: [{ fila: 2, columna: null, mensaje: 'x' }] }))).toBe('Corrige el error de la tabla y vuelve a revisarla.');
    expect(motivoParaNoConfirmar(v({ preguntas: 0 }))).toBe('La tabla no trae ninguna pregunta.');
    expect(sePuedeConfirmar(v({ preguntas: 0 }))).toBe(false);
    expect(motivoParaNoConfirmar(v())).toBeNull();
  });

  it('reemplazar dice cuántas se retiran y cuántas tienen respuestas', () => {
    expect(textoDelReemplazo(v())).toBe('La ficha actual no tiene preguntas que se vayan a quitar.');
    expect(textoDelReemplazo(v({ preguntasQueSeRetirarian: 4, conRespuestas: 0 }))).toBe('4 preguntas de la ficha actual se quitarán.');
    expect(textoDelReemplazo(v({ preguntasQueSeRetirarian: 4, conRespuestas: 2 }))).toContain('2 tienen respuestas y se retiran');
  });

  it('el resultado de importar', () => {
    expect(textoDeImportar({ secciones: 6, preguntas: 29, eliminadas: 0, retiradas: 0 })).toBe('Importadas 6 secciones · 29 preguntas');
    expect(textoDeImportar({ secciones: 6, preguntas: 29, eliminadas: 2, retiradas: 1 })).toBe('Importadas 6 secciones · 29 preguntas · 2 eliminadas · 1 retirada');
  });

  it('lo pegado se limpia (BOM y saltos de Windows) y debe traer cabecera y una fila', () => {
    expect(limpiarLoPegado('﻿a\tb\r\nc\td\r\n')).toBe('a\tb\nc\td\n');
    expect(hayTablaPegada('')).toBe(false);
    expect(hayTablaPegada('Sección\tPregunta')).toBe(false);
    expect(hayTablaPegada('Sección\tPregunta\nA\tB')).toBe(true);
  });
});

describe('publicar', () => {
  it('la línea de la versión vigente', () => {
    expect(textoDeLaPublicacion(borrador().publicada)).toBe('Publicado el 31 oct por Ana · versión 3');
    expect(textoDeLaPublicacion(null)).toBe('Todavía sin publicar');
    expect(textoDeLaPublicacion({ version: 1, publicadaEn: null, publicadaPor: null })).toBe('Publicado por alguien del equipo · versión 1');
  });

  it('la versión base es la que se cargó (0 si nunca se publicó)', () => {
    expect(versionBaseDe(borrador())).toBe(3);
    expect(versionBaseDe(borrador({ publicada: null }))).toBe(0);
    expect(versionBaseDe(null)).toBe(0);
  });

  it('el botón se apaga con el motivo del servidor o si no hay nada nuevo', () => {
    expect(estadoDePublicar(borrador())).toEqual({ habilitado: true, motivos: [] });
    expect(estadoDePublicar(borrador({ puedePublicar: { ok: false, motivos: ['Falta el texto de la declaración de responsabilidad'] } }))).toEqual({
      habilitado: false, motivos: ['Falta el texto de la declaración de responsabilidad'],
    });
    expect(estadoDePublicar(borrador({ puedePublicar: { ok: false, motivos: [] } })).motivos).toEqual(['Todavía no se puede publicar.']);
    expect(estadoDePublicar(borrador({ hayCambiosSinPublicar: false }))).toEqual({ habilitado: false, motivos: ['No hay cambios sin publicar.'] });
    // Sin ninguna versión publicada todavía hay algo que publicar.
    expect(estadoDePublicar(borrador({ publicada: null, hayCambiosSinPublicar: false })).habilitado).toBe(true);
    expect(estadoDePublicar(null).habilitado).toBe(false);
  });

  it('detecta que otra persona publicó desde que se cargó', () => {
    expect(otraPersonaPublico(3, borrador())).toBe(false);
    expect(otraPersonaPublico(2, borrador())).toBe(true);
    expect(otraPersonaPublico(3, null)).toBe(false);
  });

  it('la línea del historial', () => {
    expect(lineaDeLaVersion({ version: 3, publicadaEn: '2026-10-31T15:04:00Z', publicadaPor: { id: 'u1', nombre: 'Ana' }, preguntas: 29 })).toBe(
      'Versión 3 · 31 oct · Ana · 29 preguntas',
    );
  });
});

describe('la lista y el lote', () => {
  it('resume el contenido', () => {
    expect(resumenDeContenido(borrador({ totales: { secciones: 6, preguntas: 29 } }))).toBe('29 preguntas · 6 secciones');
    expect(resumenDeContenido(borrador({ totales: { secciones: 0, preguntas: 1 } }))).toBe('1 pregunta · 2 secciones');
  });

  it('«12 asignadas · 2 omitidas»', () => {
    expect(textoDelLote({ asignadas: 12, omitidas: [{ id: 'a', nombre: 'A', motivo: 'm' }, { id: 'b', nombre: 'B', motivo: 'm' }] }, 'CON_DIAGNOSTICO')).toBe('12 asignadas · 2 omitidas');
    expect(textoDelLote({ asignadas: 1, omitidas: [{ id: 'a', nombre: 'A', motivo: 'm' }] }, 'CON_DIAGNOSTICO')).toBe('1 asignada · 1 omitida');
    expect(textoDelLote({ asignadas: 3, omitidas: [] }, 'ESTANDAR')).toBe('3 cambiadas');
  });

  it('la ficha de una persona en palabras', () => {
    expect(textoDeLaFicha('ESTANDAR', 'NO_APLICA')).toBe('Estándar');
    expect(textoDeLaFicha('CON_DIAGNOSTICO', 'EN_CURSO')).toBe('Con diagnóstico · lo está respondiendo');
    expect(textoDeLaFicha('CON_DIAGNOSTICO', 'COMPLETADO')).toBe('Con diagnóstico · ya lo completó');
    expect(textoDeLaFicha('CON_DIAGNOSTICO', 'PENDIENTE')).toBe('Con diagnóstico · todavía no empieza');
  });
});

describe('errores del servidor', () => {
  it('lee el código y los datos del cuerpo del error', () => {
    const e = new ApiError(409, 'Tiene dependientes', { codigo: 'TIENE_DEPENDIENTES', dependientes: [12, 'x', 15], motivos: ['a', ''], versionVigente: 4 });
    expect(codigoDelError(e)).toBe('TIENE_DEPENDIENTES');
    expect(dependientesDelError(e)).toEqual([12, 15]);
    expect(motivosDelError(e)).toEqual(['a']);
    expect(versionVigenteDelError(e)).toBe(4);
    expect(codigoDelError(new Error('x'))).toBeNull();
    expect(dependientesDelError(new ApiError(409, 'x', null))).toEqual([]);
  });

  it('clasifica el fallo de una lectura', () => {
    expect(falloDe(new ApiError(403, 'x'))).toBe('sin_permiso');
    expect(falloDe(new ApiError(0, 'x'))).toBe('sin_red');
    expect(falloDe(new ApiError(404, 'x'))).toBe('no_disponible');
    expect(falloDe(new ApiError(500, 'x'))).toBe('error');
    expect(falloDe(new Error('x'))).toBe('error');
  });

  it('fechas y cantidades', () => {
    expect(fechaConMesCorto('2026-10-31T15:04:00Z')).toBe('31 oct');
    expect(fechaConMesCorto('basura')).toBeNull();
    expect(fechaConMesCorto(null)).toBeNull();
    expect(cantidad(1, 'fila', 'filas')).toBe('1 fila');
    expect(cantidad(2, 'fila', 'filas')).toBe('2 filas');
  });
});
