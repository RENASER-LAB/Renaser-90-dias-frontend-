import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { CategoriasDeLaFormacion } from '../types/categorias.types';

const mockLeer = jest.fn<() => Promise<CategoriasDeLaFormacion | null>>();
jest.mock('../api/categoriasApi', () => ({ leerCategoriasDeMiFormacion: () => mockLeer() }));

const mockSesion = { user: { id: 'u1' } as { id: string } | null, isAuthenticated: true };
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => mockSesion }));

const mockFormacion = { formacion: null as { activa: { codigo: string; nombre: string } | null } | null };
jest.mock('../../../formaciones/context/FormacionContext', () => ({ useFormacionDeLaSesion: () => mockFormacion }));

import { dimensionDeCodigo, leerEstadoDeCategorias } from '../estado/estadoDeCategorias';
import { olvidarLecturasDeCategorias, useCategoriasDeHabito, type CategoriasDeHabito } from '../hooks/useCategoriasDeHabito';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DIPLOMADO: CategoriasDeLaFormacion = {
  formation: 'DIPLOMADO',
  categories: [{ key: 'DIPLOMADO_ESTUDIO', code: 'DIPLOMADO_ESTUDIO', name: 'Estudio', icon: 'bookOpen', order: 1 }],
};

let raiz: ReactTestRenderer | null = null;
let lectura!: CategoriasDeHabito;
function Sonda() {
  lectura = useCategoriasDeHabito();
  return null;
}
async function montar() {
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

beforeEach(() => {
  olvidarLecturasDeCategorias();
  mockLeer.mockReset();
  mockSesion.user = { id: 'u1' };
  mockSesion.isAuthenticated = true;
  mockFormacion.formacion = { activa: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' } };
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('useCategoriasDeHabito (spec 023)', () => {
  it('lee las categorías de la formación una vez y las entrega listas', async () => {
    mockLeer.mockResolvedValueOnce(DIPLOMADO);
    await montar();
    expect(mockLeer).toHaveBeenCalledTimes(1);
    expect(lectura.listo).toBe(true);
    expect(lectura.delServidor).toBe(true);
    expect(lectura.formacion).toBe('DIPLOMADO');
    expect(lectura.dimensiones.map(d => d.key)).toEqual(['DIPLOMADO_ESTUDIO']);
  });

  it('mientras llega la lectura NO está listo y vale la Escuela de respaldo', async () => {
    let responder!: (c: CategoriasDeLaFormacion) => void;
    mockLeer.mockReturnValueOnce(new Promise(resolver => { responder = resolver; }));
    await montar();
    expect(lectura.listo).toBe(false);
    expect(lectura.dimensiones.map(d => d.key)).toEqual(['CUERPO', 'MENTE', 'EMOCIONES', 'ESPÍRITU']);
    await act(async () => { responder(DIPLOMADO); });
    expect(lectura.listo).toBe(true);
  });

  it('sin el endpoint (backend anterior: null) valen las cuatro de la Escuela y la pantalla sigue', async () => {
    mockLeer.mockResolvedValueOnce(null);
    await montar();
    expect(lectura.listo).toBe(true);
    expect(lectura.delServidor).toBe(false);
    expect(lectura.dimensiones.map(d => d.nombre)).toEqual(['Cuerpo', 'Mente', 'Emociones', 'Espíritu']);
  });

  it('sin red (la lectura falla) también: la Escuela de respaldo, lista', async () => {
    mockLeer.mockRejectedValueOnce(new Error('sin red'));
    await montar();
    expect(lectura.listo).toBe(true);
    expect(lectura.delServidor).toBe(false);
    expect(dimensionDeCodigo('BODY')?.key).toBe('CUERPO');
  });

  it('un fallo de red no es definitivo: `recargar` lo vuelve a pedir', async () => {
    mockLeer.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(DIPLOMADO);
    await montar();
    expect(lectura.delServidor).toBe(false);
    await act(async () => { lectura.recargar(); });
    expect(mockLeer).toHaveBeenCalledTimes(2);
    expect(lectura.delServidor).toBe(true);
    expect(lectura.formacion).toBe('DIPLOMADO');
  });

  it('al cambiar la formación activa de la sesión vuelve a leer, y no deja a la vista lo de la anterior', async () => {
    mockLeer.mockResolvedValueOnce(DIPLOMADO);
    await montar();
    expect(lectura.dimensiones.map(d => d.key)).toEqual(['DIPLOMADO_ESTUDIO']);

    mockFormacion.formacion = { activa: { codigo: 'ESCUELA', nombre: 'Escuela Renaser' } };
    let responder!: (c: CategoriasDeLaFormacion) => void;
    mockLeer.mockReturnValueOnce(new Promise(resolver => { responder = resolver; }));
    await act(async () => { raiz!.update(React.createElement(Sonda)); });
    expect(mockLeer).toHaveBeenCalledTimes(2);
    expect(lectura.listo).toBe(false);
    expect(dimensionDeCodigo('DIPLOMADO_ESTUDIO')).toBeNull();
    await act(async () => {
      responder({ formation: 'ESCUELA', categories: [{ key: 'CUERPO', code: 'BODY', name: 'Cuerpo', icon: 'activity', order: 1 }] });
    });
    expect(lectura.dimensiones.map(d => d.key)).toEqual(['CUERPO']);
  });

  it('una respuesta vieja (de la formación anterior) que llega tarde no pisa a la nueva', async () => {
    let responderVieja!: (c: CategoriasDeLaFormacion) => void;
    mockLeer.mockReturnValueOnce(new Promise(resolver => { responderVieja = resolver; }));
    await montar();
    mockFormacion.formacion = { activa: { codigo: 'ESCUELA', nombre: 'Escuela Renaser' } };
    mockLeer.mockResolvedValueOnce({ formation: 'ESCUELA', categories: [{ key: 'CUERPO', code: 'BODY', name: 'Cuerpo', icon: null, order: 1 }] });
    await act(async () => { raiz!.update(React.createElement(Sonda)); });
    await act(async () => { responderVieja(DIPLOMADO); });
    expect(leerEstadoDeCategorias().clave).toBe('u1|ESCUELA');
    expect(lectura.dimensiones.map(d => d.key)).toEqual(['CUERPO']);
  });

  it('dos que se montan juntos comparten UN pedido', async () => {
    mockLeer.mockResolvedValue(DIPLOMADO);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(React.Fragment, null, React.createElement(Sonda), React.createElement(Sonda)));
    });
    expect(mockLeer).toHaveBeenCalledTimes(1);
  });

  it('sin sesión no pide nada y vuelve a no saber nada', async () => {
    mockSesion.user = null;
    mockSesion.isAuthenticated = false;
    await montar();
    expect(mockLeer).not.toHaveBeenCalled();
    expect(lectura.listo).toBe(false);
  });

  it('otra cuenta no hereda las categorías de la anterior', async () => {
    mockLeer.mockResolvedValueOnce(DIPLOMADO);
    await montar();
    mockSesion.user = { id: 'u2' };
    let responder!: (c: CategoriasDeLaFormacion) => void;
    mockLeer.mockReturnValueOnce(new Promise(resolver => { responder = resolver; }));
    await act(async () => { raiz!.update(React.createElement(Sonda)); });
    expect(lectura.listo).toBe(false);
    expect(dimensionDeCodigo('DIPLOMADO_ESTUDIO')).toBeNull();
    await act(async () => { responder({ formation: 'ESCUELA', categories: [] }); });
  });
});
