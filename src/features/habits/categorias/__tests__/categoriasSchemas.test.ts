import { describe, expect, it } from '@jest/globals';

import { leerCategoriaAdmin, leerCategoriasAdmin, leerCategoriasDeLaFormacion } from '../api/categoriasSchemas';

describe('las categorías de la formación, leídas con tolerancia (spec 023)', () => {
  it('lee la formación y las categorías en el orden del servidor', () => {
    const lectura = leerCategoriasDeLaFormacion({
      formation: 'DIPLOMADO',
      categories: [
        { key: 'DIPLOMADO_PRACTICA', code: 'DIPLOMADO_PRACTICA', name: 'Práctica', icon: 'target', order: 2 },
        { key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', name: ' Estudio ', icon: 'bookOpen', order: 1 },
      ],
    });
    expect(lectura?.formation).toBe('DIPLOMADO');
    expect(lectura?.categories.map(c => c.key)).toEqual(['DIPLOMADO_ESTUDIO', 'DIPLOMADO_PRACTICA']);
    expect(lectura?.categories[0]).toEqual({ key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', name: 'Estudio', icon: 'bookOpen', order: 1 });
  });

  it('una categoría rota se pierde SOLA: la lista sigue', () => {
    const lectura = leerCategoriasDeLaFormacion({
      formation: 'ESCUELA',
      categories: [{ key: 'CUERPO', code: 'BODY', name: 'Cuerpo', icon: 'activity', order: 1 }, { name: 'sin clave' }, 7, null, { key: 'X', name: '' }],
    });
    expect(lectura?.categories.map(c => c.key)).toEqual(['CUERPO']);
  });

  it('sin `code` se usa la clave; sin ícono ni orden, nulo y 0; un campo nuevo no rompe nada', () => {
    const lectura = leerCategoriasDeLaFormacion({ formation: 'CERTIFICACION', categories: [{ key: 'CERTIFICACION_ETICA', name: 'Ética', novedad: true }], otro: 1 });
    expect(lectura?.categories).toEqual([{ key: 'CERTIFICACION_ETICA', code: 'CERTIFICACION_ETICA', name: 'Ética', icon: null, order: 0 }]);
  });

  it('una formación sin categorías es una lista vacía, no un error', () => {
    expect(leerCategoriasDeLaFormacion({ formation: 'DIPLOMADO', categories: [] })).toEqual({ formation: 'DIPLOMADO', categories: [] });
    expect(leerCategoriasDeLaFormacion({ categories: [] })).toEqual({ formation: null, categories: [] });
  });

  it('lo que no es una respuesta con categorías (backend anterior, texto, nulo) se lee como null', () => {
    expect(leerCategoriasDeLaFormacion(null)).toBeNull();
    expect(leerCategoriasDeLaFormacion('hola')).toBeNull();
    expect(leerCategoriasDeLaFormacion({ formation: 'ESCUELA' })).toBeNull();
    expect(leerCategoriasDeLaFormacion({ categories: 'no' })).toBeNull();
  });
});

describe('las categorías de Administración, leídas con tolerancia (spec 023)', () => {
  const fila = {
    key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', formation: 'DIPLOMADO', name: 'Estudio', icon: 'bookOpen', order: 1,
    isActive: true, activeHabits: 2, totalHabits: 3, canBeDeactivated: false, canBeDeleted: false,
  };

  it('lee una fila completa', () => {
    expect(leerCategoriaAdmin(fila)).toEqual(fila);
  });

  it('lo que falta se deduce de los conteos y lo que no se entiende se pierde', () => {
    const sinBanderas = leerCategoriaAdmin({ key: 'A_B', formation: 'ESCUELA', name: 'Uno', activeHabits: 0, totalHabits: 0 });
    expect(sinBanderas).toMatchObject({ isActive: true, canBeDeactivated: true, canBeDeleted: true, icon: null, order: 0 });
    const conHabitos = leerCategoriaAdmin({ key: 'A_B', formation: 'ESCUELA', name: 'Uno', activeHabits: 1, totalHabits: 2 });
    expect(conHabitos).toMatchObject({ canBeDeactivated: false, canBeDeleted: false });
    expect(leerCategoriaAdmin({ name: 'sin clave' })).toBeNull();
  });

  it('una lista con una fila rota conserva las demás; algo que no es lista queda vacío', () => {
    expect(leerCategoriasAdmin([fila, { basura: true }, fila]).length).toBe(2);
    expect(leerCategoriasAdmin({ no: 'lista' })).toEqual([]);
    expect(leerCategoriasAdmin(null)).toEqual([]);
  });
});
