import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { AppState } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const usuarioDePrueba: { actual: { id: string; formacion: unknown } | null } = { actual: null };
jest.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: usuarioDePrueba.actual, isAuthenticated: usuarioDePrueba.actual !== null }),
}));
jest.mock('../api/formacionesApi', () => ({ leerMiFormacion: jest.fn(), elegirMiFormacion: jest.fn() }));

import { elegirMiFormacion, leerMiFormacion } from '../api/formacionesApi';
import { FormacionProvider, useFormacionDeLaSesion, type ContextoDeFormacion } from '../context/FormacionContext';
import type { FormacionDeLaSesion } from '../types/formaciones.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const leer = leerMiFormacion as jest.MockedFunction<typeof leerMiFormacion>;
const elegirEnElServidor = elegirMiFormacion as jest.MockedFunction<typeof elegirMiFormacion>;

function sesion(codigo: string, nombre: string, parcial: Partial<FormacionDeLaSesion> = {}): FormacionDeLaSesion {
  const opcion = { codigo, nombre };
  return { activa: opcion, disponibles: [opcion], puedeElegir: false, veTodas: false, sinFormacion: false, duracionDias: 90, fases: [], ...parcial };
}

let raiz: ReactTestRenderer | null = null;
let contexto: ContextoDeFormacion;

function Sonda() {
  contexto = useFormacionDeLaSesion();
  return null;
}
const montar = () => {
  act(() => {
    raiz = TestRenderer.create(React.createElement(FormacionProvider, null, React.createElement(Sonda)));
  });
};

let alVolverAlFrente: ((estado: string) => void) | null = null;
beforeEach(() => {
  leer.mockReset();
  elegirEnElServidor.mockReset();
  alVolverAlFrente = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, oyente: (e: string) => void) => {
    alVolverAlFrente = oyente;
    return { remove: () => undefined };
  }) as never);
});
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  usuarioDePrueba.actual = null;
  jest.restoreAllMocks();
});

describe('FormacionProvider', () => {
  it('parte de lo que dice la sesión', () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: sesion('DIPLOMADO', 'Diplomado Renaser', { duracionDias: 365 }) };
    montar();
    expect(contexto.formacion?.activa?.codigo).toBe('DIPLOMADO');
    expect(contexto.formacion?.duracionDias).toBe(365);
  });

  it('sin formación en la sesión (backend anterior) no inventa ninguna', () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: null };
    montar();
    expect(contexto.formacion).toBeNull();
  });

  it('al volver al frente relee: un traslado se nota sin cerrar la app', async () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: sesion('ESCUELA', 'Escuela Renaser') };
    montar();
    leer.mockResolvedValueOnce(sesion('DIPLOMADO', 'Diplomado Renaser'));
    await act(async () => {
      alVolverAlFrente?.('active');
    });
    expect(leer).toHaveBeenCalledTimes(1);
    expect(contexto.formacion?.activa?.codigo).toBe('DIPLOMADO');
  });

  it('pasar a segundo plano no pide nada, y si la lectura falla se queda lo que había', async () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: sesion('ESCUELA', 'Escuela Renaser') };
    montar();
    await act(async () => {
      alVolverAlFrente?.('background');
    });
    expect(leer).not.toHaveBeenCalled();
    leer.mockRejectedValueOnce(new Error('sin red'));
    await act(async () => {
      await contexto.recargar();
    });
    expect(contexto.formacion?.activa?.codigo).toBe('ESCUELA');
  });

  it('elegir llama al servidor y deja la formación nueva', async () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: sesion('ESCUELA', 'Escuela Renaser', { puedeElegir: true }) };
    montar();
    elegirEnElServidor.mockResolvedValueOnce(sesion('DIPLOMADO', 'Diplomado Renaser', { puedeElegir: true }));
    await act(async () => {
      await contexto.elegir('DIPLOMADO');
    });
    expect(elegirEnElServidor).toHaveBeenCalledWith('DIPLOMADO');
    expect(contexto.formacion?.activa?.codigo).toBe('DIPLOMADO');
  });

  it('si el servidor rechaza el cambio, el error le llega a quien lo pidió y nada cambia', async () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: sesion('ESCUELA', 'Escuela Renaser', { puedeElegir: true }) };
    montar();
    elegirEnElServidor.mockRejectedValueOnce(new Error('No tienes asignada esa formación.'));
    await act(async () => {
      await expect(contexto.elegir('CERTIFICACION')).rejects.toThrow('No tienes asignada esa formación.');
    });
    expect(contexto.formacion?.activa?.codigo).toBe('ESCUELA');
  });

  it('una lectura vieja no pisa a una más nueva', async () => {
    usuarioDePrueba.actual = { id: 'u1', formacion: sesion('ESCUELA', 'Escuela Renaser') };
    montar();
    let soltarLaVieja: (f: FormacionDeLaSesion) => void = () => undefined;
    leer.mockReturnValueOnce(new Promise<FormacionDeLaSesion>(resolver => { soltarLaVieja = resolver; }));
    leer.mockResolvedValueOnce(sesion('CERTIFICACION', 'Certificación Renaser'));
    await act(async () => {
      void contexto.recargar();
      await contexto.recargar();
    });
    await act(async () => {
      soltarLaVieja(sesion('DIPLOMADO', 'Diplomado Renaser'));
    });
    expect(contexto.formacion?.activa?.codigo).toBe('CERTIFICACION');
  });

  it('sin formación en el contexto (fuera del proveedor) todo son no-ops', async () => {
    let fuera: ContextoDeFormacion | null = null;
    const Fuera = () => {
      fuera = useFormacionDeLaSesion();
      return null;
    };
    act(() => {
      raiz = TestRenderer.create(React.createElement(Fuera));
    });
    expect(fuera!.formacion).toBeNull();
    await expect(fuera!.elegir('ESCUELA')).resolves.toBeUndefined();
  });
});
