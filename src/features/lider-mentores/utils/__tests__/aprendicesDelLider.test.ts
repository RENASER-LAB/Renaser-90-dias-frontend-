import { describe, expect, it } from '@jest/globals';

import type { AprendizDeLaLista } from '../../types/aprendicesDelLider.types';
import {
  dichoDelAprendiz,
  esRutaConSesion,
  grupoEnPalabras,
  lineaDelAprendiz,
  textoSinFilas,
  urlDeLaFoto,
} from '../aprendicesDelLider';

/** Los textos de «Todos los aprendices» (2026-10-31): lo que dice cada fila, sin montar nada. */

const ANA: AprendizDeLaLista = {
  personaId: 'u1',
  nombre: 'Ana Pérez',
  fotoPath: null,
  grupoId: 'g1',
  grupoNombre: 'Grupo Fénix',
  mentorNombre: 'Luisa',
  diaPrograma: 12,
};

describe('la línea de cada fila', () => {
  it('el grupo y el día', () => {
    expect(lineaDelAprendiz(ANA)).toBe('Grupo Fénix · Día 12');
  });

  it('sin grupo lo dice, y sin día no inventa uno', () => {
    expect(lineaDelAprendiz({ ...ANA, grupoId: null, grupoNombre: null })).toBe('Sin grupo · Día 12');
    expect(lineaDelAprendiz({ ...ANA, diaPrograma: null })).toBe('Grupo Fénix');
    expect(lineaDelAprendiz({ ...ANA, grupoId: null, grupoNombre: null, diaPrograma: null })).toBe('Sin grupo');
  });

  it('con grupo pero sin nombre de grupo no dice «Sin grupo»', () => {
    expect(grupoEnPalabras({ grupoId: 'g1', grupoNombre: null })).toBe('Grupo sin nombre');
  });

  it('lo que oye quien no ve: quién es, su línea y qué abre', () => {
    expect(dichoDelAprendiz(ANA)).toBe('Ana Pérez. Grupo Fénix · Día 12. Ver su ficha.');
  });
});

describe('la foto', () => {
  it('una URL completa se pasa como foto; una ruta del servidor se pide con la sesión; nada, las iniciales', () => {
    expect(urlDeLaFoto('https://cdn.renaser.app/a.jpg')).toBe('https://cdn.renaser.app/a.jpg');
    expect(urlDeLaFoto('/api/v1/chat/conversations/1/foto')).toBeNull();
    expect(esRutaConSesion('/api/v1/chat/conversations/1/foto')).toBe(true);
    expect(esRutaConSesion('https://cdn.renaser.app/a.jpg')).toBe(false);
    expect(urlDeLaFoto(null)).toBeNull();
    expect(esRutaConSesion(null)).toBe(false);
    expect(esRutaConSesion('')).toBe(false);
  });
});

describe('cuando no hay filas', () => {
  it('sin búsqueda, que no hay aprendices; con ella, sin resultados para lo escrito', () => {
    expect(textoSinFilas('')).toBe('Todavía no hay aprendices.');
    expect(textoSinFilas('   ')).toBe('Todavía no hay aprendices.');
    expect(textoSinFilas(' José ')).toBe('Sin resultados para «José».');
  });
});
