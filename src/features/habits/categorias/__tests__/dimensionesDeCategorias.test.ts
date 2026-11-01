import { describe, expect, it } from '@jest/globals';

import { DIMENSIONES_CONFIG } from '../../../training/data/dimensiones';
import type { CategoriaDeHabito } from '../types/categorias.types';
import {
  CATEGORIAS_DE_RESPALDO,
  claveDeDimension,
  dimensionesDeCategorias,
} from '../utils/dimensionesDeCategorias';
import { ICONOS_DE_CATEGORIA, iconoDeCategoria } from '../utils/iconosDeCategoria';

const cat = (key: string, code: string, name: string, icon: string | null, order: number): CategoriaDeHabito => ({ key, code, name, icon, order });

describe('de las categorías a las dimensiones de Training (spec 023)', () => {
  it('las cuatro de la Escuela conservan las claves de siempre', () => {
    expect(claveDeDimension({ code: 'BODY' })).toBe('CUERPO');
    expect(claveDeDimension({ code: 'MIND' })).toBe('MENTE');
    expect(claveDeDimension({ code: 'CONSCIENCE' })).toBe('EMOCIONES');
    expect(claveDeDimension({ code: 'SPIRIT' })).toBe('ESPÍRITU');
  });

  it('cualquier otra categoría usa su código como clave de dimensión', () => {
    expect(claveDeDimension({ code: 'DIPLOMADO_ESTUDIO' })).toBe('DIPLOMADO_ESTUDIO');
  });

  it('el respaldo es EXACTAMENTE lo que la Escuela veía: mismas claves, nombres, descripciones y orden', () => {
    const dimensiones = dimensionesDeCategorias(CATEGORIAS_DE_RESPALDO);
    const deSiempre = DIMENSIONES_CONFIG.filter(d => d.key !== 'VIDA Y NEGOCIO');
    expect(dimensiones.map(d => ({ key: d.key, title: d.title, nombre: d.nombre, sub: d.sub }))).toEqual(
      deSiempre.map(d => ({ key: d.key, title: d.title, nombre: d.nombre, sub: d.sub })),
    );
    expect(dimensiones.map(d => d.icono)).toEqual(['activity', 'brain', 'heart', 'sparkles']);
  });

  it('una categoría de otra formación lleva el nombre y el ícono que le puso Administración, y sin descripción', () => {
    const [estudio, practica] = dimensionesDeCategorias([
      cat('DIPLOMADO_ESTUDIO', 'DIPLOMADO_ESTUDIO', 'Estudio profundo', 'bookOpen', 1),
      cat('DIPLOMADO_PRACTICA', 'DIPLOMADO_PRACTICA', 'Práctica', null, 2),
    ]);
    expect(estudio).toEqual({ key: 'DIPLOMADO_ESTUDIO', title: 'DIPLOMADO_ESTUDIO', nombre: 'Estudio profundo', sub: '', icono: 'bookOpen', codigo: 'DIPLOMADO_ESTUDIO' });
    expect(practica.icono).toBe('listChecks');
  });

  it('respeta el orden que llegó y no repite un código', () => {
    const dimensiones = dimensionesDeCategorias([cat('B', 'B', 'Segunda', null, 2), cat('A', 'A', 'Primera', null, 1), cat('A2', 'A', 'Repetida', null, 3)]);
    expect(dimensiones.map(d => d.nombre)).toEqual(['Segunda', 'Primera']);
  });

  it('un ícono que esta versión no dibuja cae al genérico, y los permitidos son los que Icon conoce', () => {
    expect(iconoDeCategoria('inventado')).toBe('listChecks');
    expect(iconoDeCategoria(null)).toBe('listChecks');
    for (const icono of ICONOS_DE_CATEGORIA) expect(iconoDeCategoria(icono)).toBe(icono);
    expect(ICONOS_DE_CATEGORIA).toHaveLength(16);
  });
});
