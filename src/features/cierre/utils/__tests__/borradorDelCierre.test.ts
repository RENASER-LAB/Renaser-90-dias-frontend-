import { describe, expect, it } from '@jest/globals';

import type { AccionDelCierre, CierreDelDia } from '../../types/cierre.types';
import {
  NOTA_MAXIMA,
  borradorInicial,
  conRespuesta,
  cuerpoDelCierre,
  loQueFalta,
  pendientesDe,
  puedeGuardar,
  recortarNota,
  textoDeLoQueFalta,
} from '../borradorDelCierre';

/** El borrador de la hoja (spec 017): qué se pregunta, cuándo se puede guardar y qué se manda. */

const accion = (id: string, titulo: string, extra: Partial<AccionDelCierre> = {}): AccionDelCierre => ({
  id,
  titulo,
  horaInicio: null,
  cumplida: false,
  cumplidaEn: null,
  cierre: null,
  ...extra,
});
const dia = (acciones: AccionDelCierre[], extra: Partial<CierreDelDia> = {}): CierreDelDia => ({
  fecha: '2026-10-29',
  estado: 'ABIERTO',
  cerradoEn: null,
  nota: null,
  acciones,
  puedeCerrar: true,
  semana: null,
  ...extra,
});

const propuesta = accion('a', 'Enviar la propuesta', { cumplida: true, cumplidaEn: '2026-10-29T15:20:00Z' });
const facturas = accion('b', 'Revisar las facturas', { horaInicio: '20:30' });
const llamar = accion('c', 'Llamar a mi mentor');

describe('lo que se pregunta', () => {
  it('lo cumplido no se pregunta: solo las pendientes entran al borrador', () => {
    const v = dia([propuesta, facturas, llamar]);
    expect(pendientesDe(v).map(a => a.id)).toEqual(['b', 'c']);
    expect(Object.keys(borradorInicial(v).porAccion)).toEqual(['b', 'c']);
  });

  it('un día ya cerrado abre con lo guardado de cada pendiente', () => {
    const v = dia([
      facturas,
      accion('c', 'Llamar a mi mentor', { cierre: { motivo: 'SIN_ENERGIA', manana: 'MAS_CORTA', nota: 'Estaba cansado' } }),
    ], { estado: 'CERRADO', nota: 'Una nota vieja' });
    const b = borradorInicial(v);
    expect(b.porAccion.b).toEqual({ motivo: null, manana: null, nota: '' });
    expect(b.porAccion.c).toEqual({ motivo: 'SIN_ENERGIA', manana: 'MAS_CORTA', nota: 'Estaba cansado' });
    expect(b.notaDelDia).toBe('Una nota vieja');
  });

  it('un valor guardado que esta versión no conoce no se marca como elegido', () => {
    const v = dia([accion('b', 'X', { cierre: { motivo: 'OTRO_NUEVO', manana: 'OTRA_HORA', nota: null } })]);
    expect(borradorInicial(v).porAccion.b).toEqual({ motivo: null, manana: 'OTRA_HORA', nota: '' });
  });
});

describe('«Guardar mi cierre»', () => {
  it('está apagado hasta tener los DOS chips de cada pendiente', () => {
    const v = dia([propuesta, facturas, llamar]);
    let b = borradorInicial(v);
    expect(puedeGuardar(v, b)).toBe(false);
    b = conRespuesta(b, 'b', { motivo: 'SIN_TIEMPO' });
    expect(puedeGuardar(v, b)).toBe(false);
    b = conRespuesta(b, 'b', { manana: 'OTRA_HORA' });
    expect(loQueFalta(v, b).map(a => a.id)).toEqual(['c']);
    expect(puedeGuardar(v, b)).toBe(false);
    b = conRespuesta(conRespuesta(b, 'c', { motivo: 'PARA_DESPUES' }), 'c', { manana: 'DEJARLA' });
    expect(puedeGuardar(v, b)).toBe(true);
  });

  it('dice qué falta nombrando la acción', () => {
    const v = dia([propuesta, facturas]);
    expect(textoDeLoQueFalta(loQueFalta(v, borradorInicial(v)))).toBe(
      'Elige qué pasó y qué harás mañana con «Revisar las facturas».',
    );
  });

  it('con varias pendientes las nombra a todas', () => {
    const v = dia([facturas, llamar, accion('d', 'Escribir el informe')]);
    expect(textoDeLoQueFalta(loQueFalta(v, borradorInicial(v)))).toBe(
      'Elige qué pasó y qué harás mañana con «Revisar las facturas», «Llamar a mi mentor» y «Escribir el informe».',
    );
  });

  it('sin nada que decir (todo cumplido o sin acciones) se puede guardar de una vez y no dice nada', () => {
    for (const v of [dia([]), dia([propuesta])]) {
      expect(puedeGuardar(v, borradorInicial(v))).toBe(true);
      expect(textoDeLoQueFalta(loQueFalta(v, borradorInicial(v)))).toBeNull();
    }
  });
});

describe('lo que se manda en el PUT', () => {
  it('una respuesta por pendiente, sin las cumplidas, con la nota limpia y sin el campo si está vacía', () => {
    const v = dia([propuesta, facturas, llamar]);
    let b = borradorInicial(v);
    b = conRespuesta(b, 'b', { motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: '  Se alargó la reunión  ' });
    b = conRespuesta(b, 'c', { motivo: 'SIN_ENERGIA', manana: 'PEDIR_AYUDA', nota: '   ' });
    expect(cuerpoDelCierre('2026-10-29', v, b)).toEqual({
      fecha: '2026-10-29',
      acciones: [
        { id: 'b', motivo: 'SIN_TIEMPO', manana: 'OTRA_HORA', nota: 'Se alargó la reunión' },
        { id: 'c', motivo: 'SIN_ENERGIA', manana: 'PEDIR_AYUDA' },
      ],
    });
  });

  it('sin acciones, manda la nota del día si la hay', () => {
    const v = dia([]);
    const b = { ...borradorInicial(v), notaDelDia: ' Un día tranquilo ' };
    expect(cuerpoDelCierre('2026-10-29', v, b)).toEqual({ fecha: '2026-10-29', acciones: [], nota: 'Un día tranquilo' });
    expect(cuerpoDelCierre('2026-10-29', v, borradorInicial(v))).toEqual({ fecha: '2026-10-29', acciones: [] });
  });

  it('con pendientes la hoja no muestra la nota del día, así que se vuelve a mandar la que ya había: guardar no la borra', () => {
    const v = dia([facturas], { nota: 'De antes' });
    const b = conRespuesta(borradorInicial(v), 'b', { motivo: 'SIN_TIEMPO', manana: 'DEJARLA' });
    expect(cuerpoDelCierre('2026-10-29', v, b).nota).toBe('De antes');
  });

  it('nunca manda una pendiente a medias (el botón ya estaba apagado)', () => {
    const v = dia([facturas]);
    const b = conRespuesta(borradorInicial(v), 'b', { motivo: 'SIN_TIEMPO' });
    expect(cuerpoDelCierre('2026-10-29', v, b).acciones).toEqual([]);
  });
});

describe('las notas', () => {
  it('se cortan al tope del servidor contando como una persona (un emoji es uno)', () => {
    expect(NOTA_MAXIMA).toBe(500);
    expect(recortarNota('a'.repeat(499))).toHaveLength(499);
    expect(Array.from(recortarNota('😀'.repeat(600)))).toHaveLength(500);
  });
});
