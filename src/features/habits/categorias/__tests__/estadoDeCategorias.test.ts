import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  categoriaDeCodigo,
  dimensionDeCodigo,
  dimensionPorClave,
  dimensionesVigentes,
  empezarLecturaDeCategorias,
  leerEstadoDeCategorias,
  reiniciarEstadoDeCategorias,
  suscribirEstadoDeCategorias,
  terminarLecturaDeCategorias,
} from '../estado/estadoDeCategorias';

const DIPLOMADO = [
  { key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', name: 'Estudio', icon: 'bookOpen', order: 1 },
  { key: 'DIPLOMADO_PRACTICA', code: 'DIPLOMADO_PRACTICA', name: 'Práctica', icon: null, order: 2 },
];

afterEach(() => reiniciarEstadoDeCategorias());

describe('las categorías vigentes de la sesión (spec 023)', () => {
  it('antes de saber nada valen las cuatro de la Escuela, sin estar listo', () => {
    const estado = leerEstadoDeCategorias();
    expect(estado.listo).toBe(false);
    expect(dimensionesVigentes().map(d => d.key)).toEqual(['CUERPO', 'MENTE', 'EMOCIONES', 'ESPÍRITU']);
    expect(categoriaDeCodigo('BODY')?.name).toBe('Cuerpo');
  });

  it('con la respuesta del servidor valen SUS categorías, y las de la Escuela dejan de valer', () => {
    empezarLecturaDeCategorias('u1|DIPLOMADO');
    terminarLecturaDeCategorias('u1|DIPLOMADO', { formation: 'DIPLOMADO', categories: DIPLOMADO });
    const estado = leerEstadoDeCategorias();
    expect(estado).toMatchObject({ listo: true, delServidor: true, formacion: 'DIPLOMADO' });
    expect(dimensionesVigentes().map(d => d.key)).toEqual(['DIPLOMADO_ESTUDIO', 'DIPLOMADO_PRACTICA']);
    expect(dimensionDeCodigo('BODY')).toBeNull();
    expect(dimensionDeCodigo('DIPLOMADO_ESTUDIO')?.nombre).toBe('Estudio');
    expect(dimensionPorClave('DIPLOMADO_PRACTICA')?.icono).toBe('listChecks');
  });

  it('una formación sin categorías configuradas queda vacía: no se le inventan las de la Escuela', () => {
    empezarLecturaDeCategorias('u1|DIPLOMADO');
    terminarLecturaDeCategorias('u1|DIPLOMADO', { formation: 'DIPLOMADO', categories: [] });
    expect(leerEstadoDeCategorias()).toMatchObject({ listo: true, delServidor: true });
    expect(dimensionesVigentes()).toEqual([]);
  });

  it('sin respuesta (404, sin red) valen las cuatro de la Escuela y ya está listo', () => {
    empezarLecturaDeCategorias('u1|ESCUELA');
    terminarLecturaDeCategorias('u1|ESCUELA', null);
    expect(leerEstadoDeCategorias()).toMatchObject({ listo: true, delServidor: false });
    expect(dimensionesVigentes()).toHaveLength(4);
  });

  it('quien no pertenece a ninguna formación (sin categorías y sin formación) se queda con las de respaldo', () => {
    empezarLecturaDeCategorias('admin|');
    terminarLecturaDeCategorias('admin|', { formation: null, categories: [] });
    expect(leerEstadoDeCategorias()).toMatchObject({ listo: true, delServidor: false, formacion: null });
    expect(dimensionesVigentes()).toHaveLength(4);
  });

  it('una lectura que llega tarde, de otra cuenta o formación, no pisa a la vigente', () => {
    empezarLecturaDeCategorias('u1|ESCUELA');
    empezarLecturaDeCategorias('u1|DIPLOMADO');
    terminarLecturaDeCategorias('u1|ESCUELA', null);
    expect(leerEstadoDeCategorias()).toMatchObject({ clave: 'u1|DIPLOMADO', listo: false });
  });

  it('empezar otra lectura no deja a la vista nada de la anterior', () => {
    empezarLecturaDeCategorias('u1|DIPLOMADO');
    terminarLecturaDeCategorias('u1|DIPLOMADO', { formation: 'DIPLOMADO', categories: DIPLOMADO });
    empezarLecturaDeCategorias('u2|ESCUELA');
    expect(dimensionDeCodigo('DIPLOMADO_ESTUDIO')).toBeNull();
    expect(leerEstadoDeCategorias()).toMatchObject({ clave: 'u2|ESCUELA', listo: false, formacion: null });
  });

  it('avisa a quien se suscribió, y deja de avisar al soltarse', () => {
    const oyente = jest.fn();
    const soltar = suscribirEstadoDeCategorias(oyente);
    empezarLecturaDeCategorias('u1|ESCUELA');
    terminarLecturaDeCategorias('u1|ESCUELA', null);
    expect(oyente).toHaveBeenCalledTimes(2);
    soltar();
    reiniciarEstadoDeCategorias();
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});
