import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { DatosEntrenamiento } from '../../api/cargarEntrenamiento';

jest.mock('../../../habits/categorias/hooks/useCategoriasDeHabito', () => {
  /* Spec 023: sin sesión en la prueba, las categorías valen las de la Escuela (el respaldo) y ya están listas. */
  const estado = { clave: null, listo: true, formacion: null, delServidor: false, categorias: [], dimensiones: [], recargar: () => undefined };
  return { useCategoriasDeHabito: () => estado };
});
const mockCargar = jest.fn<() => Promise<DatosEntrenamiento>>();
jest.mock('../../api/cargarEntrenamiento', () => ({ cargarEntrenamiento: () => mockCargar() }));
jest.mock('../../../../services/http/apiClient', () => ({
  mensajeDeError: (_e: unknown, porDefecto: string) => porDefecto,
}));

import { useTraining } from '../useTraining';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATOS: DatosEntrenamiento = {
  tracks: [],
  catalogo: [],
  planHabits: [],
  rocas: [
    {
      id: 'roca-1',
      titulo: 'Llamar a tres clientes',
      completada: false,
    } as DatosEntrenamiento['rocas'][number],
  ],
  rocasConEvidencia: new Set(),
};

type Estado = ReturnType<typeof useTraining>;
const montados: ReactTestRenderer[] = [];
afterEach(() => { act(() => { montados.splice(0).forEach(raiz => raiz.unmount()); }); });

/** Monta el hook y anota cada estado que la pantalla hubiera dibujado. */
async function montar() {
  const estados: Estado[] = [];
  function Sonda() {
    estados.push(useTraining());
    return null;
  }
  await act(async () => {
    montados.push(TestRenderer.create(React.createElement(Sonda)));
  });
  return estados;
}

/**
 * V-2 (26/09/2026): después de completar o sellar, Training se refresca SIN volver a tapar la
 * pantalla con el esqueleto. Antes cada acción dejaba ~3 s de esqueleto.
 */
describe('useTraining: refresco silencioso', () => {
  beforeEach(() => {
    mockCargar.mockReset();
  });

  it('la primera carga sí muestra el esqueleto', async () => {
    mockCargar.mockResolvedValue(DATOS);
    const estados = await montar();

    expect(estados[0].loading).toBe(true);
    expect(estados[estados.length - 1].loading).toBe(false);
    expect(estados[estados.length - 1].habits).toHaveLength(1);
  });

  it('recargar con datos en pantalla NO vuelve a prender `loading`', async () => {
    mockCargar.mockResolvedValue(DATOS);
    const estados = await montar();
    const desde = estados.length;

    await act(async () => {
      await estados[estados.length - 1].recargar();
    });

    expect(estados.slice(desde).some(e => e.loading)).toBe(false);
    expect(mockCargar).toHaveBeenCalledTimes(2);
  });

  it('si el refresco silencioso falla, queda lo que había y no aparece el error', async () => {
    mockCargar.mockResolvedValueOnce(DATOS).mockRejectedValueOnce(new Error('sin red'));
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const estados = await montar();

    await act(async () => {
      await estados[estados.length - 1].recargar();
    });

    const ultimo = estados[estados.length - 1];
    expect(ultimo.error).toBeNull();
    expect(ultimo.habits).toHaveLength(1);
    aviso.mockRestore();
  });

  it('si la PRIMERA carga falla, sí se muestra el error', async () => {
    mockCargar.mockRejectedValue(new Error('sin red'));
    const estados = await montar();

    expect(estados[estados.length - 1].error).toBe('No pudimos actualizar tus hábitos. Revisa tu conexión e inténtalo de nuevo.');
  });
});
