import { describe, expect, it } from '@jest/globals';

import {
  alternarMarcado,
  contenidoCompleto,
  destinoParaGuardar,
  elementosParaGuardar,
  formularioDelDestino,
  lineasDelDestino,
  valorParaUnaEtiqueta,
} from '../contenidoYDestino';

describe('el contenido editable de la caja', () => {
  it('un elemento nuevo toma su valor de la etiqueta, sin tildes y sin repetir', () => {
    expect(valorParaUnaEtiqueta('Taza de café', new Set())).toBe('TAZA_DE_CAFE');
    expect(valorParaUnaEtiqueta('Taza de café', new Set(['TAZA_DE_CAFE']))).toBe('TAZA_DE_CAFE_2');
    expect(valorParaUnaEtiqueta('¡!', new Set())).toBe('ELEMENTO');
  });

  it('los que ya existen conservan su valor aunque cambie la etiqueta (es lo marcado en cada caja)', () => {
    const r = elementosParaGuardar([
      { clave: 'a', valor: 'LIBRETA', etiqueta: 'Libreta Renaser ' },
      { clave: 'b', valor: null, etiqueta: 'Pulsera' },
      { clave: 'c', valor: null, etiqueta: '   ' },
    ]);
    expect(r).toEqual({
      ok: true,
      elementos: [
        { valor: 'LIBRETA', etiqueta: 'Libreta Renaser' },
        { valor: 'PULSERA', etiqueta: 'Pulsera' },
      ],
    });
  });

  it('no deja guardar una lista vacía ni un elemento repetido', () => {
    expect(elementosParaGuardar([{ clave: 'a', valor: null, etiqueta: ' ' }])).toEqual({
      ok: false,
      mensaje: 'La caja necesita al menos un elemento.',
    });
    expect(
      elementosParaGuardar([
        { clave: 'a', valor: 'TAZA', etiqueta: 'Taza' },
        { clave: 'b', valor: null, etiqueta: 'taza' },
      ]),
    ).toEqual({ ok: false, mensaje: '«taza» está dos veces.' });
  });

  it('un valor nuevo no pisa uno que ya existe', () => {
    const r = elementosParaGuardar([
      { clave: 'a', valor: 'TAZA', etiqueta: 'Taza grande' },
      { clave: 'b', valor: null, etiqueta: 'Taza' },
    ]);
    expect(r.ok && r.elementos[1].valor).toBe('TAZA_2');
  });
});

describe('el checklist de una caja', () => {
  const contenido = [
    { valor: 'A', etiqueta: 'A', marcado: true },
    { valor: 'B', etiqueta: 'B', marcado: false },
  ];

  it('tocar uno lo marca o lo desmarca y deja los demás', () => {
    expect(alternarMarcado(contenido, 'B')).toEqual(['A', 'B']);
    expect(alternarMarcado(contenido, 'A')).toEqual([]);
  });

  it('está completo solo con todo marcado', () => {
    expect(contenidoCompleto(contenido)).toBe(false);
    expect(contenidoCompleto(contenido.map(e => ({ ...e, marcado: true })))).toBe(true);
    expect(contenidoCompleto([])).toBe(false);
  });
});

describe('a dónde enviarla', () => {
  it('lo que pidió cambiar el aprendiz va primero y destacado; los teléfonos se pueden tocar', () => {
    const lineas = lineasDelDestino({
      nombre: 'Ana Torres',
      celular: '+51 999 111 222',
      pais: 'Perú',
      ciudad: 'Lima',
      distrito: 'Miraflores',
      direccion: 'Av. Larco 123',
      dni: '12345678',
      otraDireccion: 'Jr. Cusco 45, Arequipa',
      quienRecibe: '  ',
    });
    expect(lineas.map(l => l.rotulo)).toEqual(['Otra dirección', 'Nombre', 'DNI', 'Celular', 'Dirección', 'Lugar']);
    expect(lineas[0].destacada).toBe(true);
    expect(lineas.find(l => l.rotulo === 'Celular')?.tipo).toBe('tel');
    expect(lineas.find(l => l.rotulo === 'Lugar')?.valor).toBe('Miraflores, Lima, Perú');
  });

  it('sin destino, sin líneas', () => {
    expect(lineasDelDestino(null)).toEqual([]);
  });

  it('el aprendiz manda cada campo recortado, y lo vacío como null', () => {
    const formulario = formularioDelDestino({ otraDireccion: 'Jr. Cusco 45', quienRecibe: null });
    expect(formulario.quienRecibe).toBe('');
    expect(destinoParaGuardar({ ...formulario, otroCelular: ' 987 ' })).toEqual({
      otraDireccion: 'Jr. Cusco 45',
      otroCelular: '987',
      quienRecibe: null,
      referencias: null,
      provincia: null,
    });
  });
});
