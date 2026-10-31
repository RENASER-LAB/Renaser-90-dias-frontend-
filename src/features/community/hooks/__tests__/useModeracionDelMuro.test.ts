/**
 * El «…» de una publicación del Muro en acción (pedido del dueño, 2026-10-31): ocultar la saca de la lista, eliminar pide
 * confirmación, y el 403 y el 404 se dicen o se callan como pidió el dueño.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockAlert = jest.fn<(titulo: string, mensaje?: string, botones?: { text?: string; style?: string; onPress?: () => void }[]) => void>();
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string, botones?: never) => mockAlert(titulo, mensaje, botones) },
}));
const mockLogro = jest.fn();
const mockError = jest.fn();
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => mockLogro(), error: () => mockError() } }));
jest.mock('../../../../services/http/apiClient', () => ({
  mensajeDeError: (e: unknown, porDefecto: string) => (e as { message?: string })?.message || porDefecto,
}));
const mockOcultar = jest.fn<(id: string) => Promise<void>>();
const mockEliminar = jest.fn<(id: string) => Promise<void>>();
jest.mock('../../api/wallApi', () => ({
  ocultarPublicacion: (id: string) => mockOcultar(id),
  eliminarPublicacionParaSiempre: (id: string) => mockEliminar(id),
  restaurarPublicacion: jest.fn(),
}));

import { escucharMuroModerado } from '../../events/muroModerado';
import { useModeracionDelMuro } from '../useModeracionDelMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const falla = (status: number, message = 'x') => Object.assign(new Error(message), { status });

let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof useModeracionDelMuro>;
const quitarPublicacion = jest.fn();
const anunciar = jest.fn();
const seModero = jest.fn();
let darDeBaja: () => void = () => undefined;

function montar() {
  function Sonda() {
    hook = useModeracionDelMuro({ quitarPublicacion, anunciar });
    return null;
  }
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  act(() => hook.abrir({ id: 'p1', autor: 'Ana', resumen: '' }));
}

beforeEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  darDeBaja();
  mockAlert.mockReset();
  mockOcultar.mockReset().mockResolvedValue(undefined);
  mockEliminar.mockReset().mockResolvedValue(undefined);
  mockLogro.mockReset();
  mockError.mockReset();
  quitarPublicacion.mockReset();
  anunciar.mockReset();
  seModero.mockReset();
  darDeBaja = escucharMuroModerado(seModero);
  montar();
});

describe('ocultar', () => {
  it('saca la publicación de la lista en el acto, cierra la hoja, avisa, vibra y le cuenta al resto de la app', async () => {
    await act(async () => hook.ocultar());
    expect(mockOcultar).toHaveBeenCalledWith('p1');
    expect(quitarPublicacion).toHaveBeenCalledWith('p1');
    expect(anunciar).toHaveBeenCalledWith('Publicación oculta');
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(seModero).toHaveBeenCalledTimes(1);
    expect(hook.publicacion).toBeNull();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('no manda dos pedidos con un toque doble', async () => {
    await act(async () => {
      void hook.ocultar();
      void hook.ocultar();
    });
    expect(mockOcultar).toHaveBeenCalledTimes(1);
  });

  it('un 403 dice «No tienes permiso para moderar el Muro.» y no saca nada', async () => {
    mockOcultar.mockRejectedValue(falla(403, 'Solo ADMIN/ALCHEMIST moderan el Muro'));
    await act(async () => hook.ocultar());
    expect(mockAlert).toHaveBeenCalledWith('Moderar el Muro', 'No tienes permiso para moderar el Muro.', undefined);
    expect(quitarPublicacion).not.toHaveBeenCalled();
    expect(anunciar).not.toHaveBeenCalled();
    expect(mockLogro).not.toHaveBeenCalled();
  });

  it('un 404 la saca de la lista sin error y sin anunciar lo que no hizo', async () => {
    mockOcultar.mockRejectedValue(falla(404, 'Publicacion no encontrada'));
    await act(async () => hook.ocultar());
    expect(quitarPublicacion).toHaveBeenCalledWith('p1');
    expect(mockAlert).not.toHaveBeenCalled();
    expect(anunciar).not.toHaveBeenCalled();
    expect(hook.publicacion).toBeNull();
  });

  it('cualquier otro fallo sale en un diálogo con el mensaje del servidor y la hoja sigue abierta', async () => {
    mockOcultar.mockRejectedValue(falla(500, 'El servidor no responde en este momento.'));
    await act(async () => hook.ocultar());
    expect(mockAlert).toHaveBeenCalledWith('No se pudo ocultar', 'El servidor no responde en este momento.', undefined);
    expect(quitarPublicacion).not.toHaveBeenCalled();
    expect(hook.publicacion).not.toBeNull();
    expect(hook.ocupado).toBeNull();
  });
});

describe('eliminar para siempre', () => {
  it('pide confirmación con el texto del dueño y NO manda nada hasta confirmar', () => {
    act(() => hook.eliminar());
    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [titulo, mensaje, botones] = mockAlert.mock.calls[0];
    expect(titulo).toBe('¿Eliminar esta publicación para siempre?');
    expect(mensaje).toBe('También se borran sus comentarios, reacciones y fotos. No se puede deshacer.');
    expect(botones).toEqual([
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar para siempre', style: 'destructive', onPress: expect.any(Function) },
    ]);
    expect(mockOcultar).not.toHaveBeenCalled();
    expect(mockEliminar).not.toHaveBeenCalled();
    expect(quitarPublicacion).not.toHaveBeenCalled();
  });

  it('al confirmar: oculta, borra, la saca de la lista, avisa «Publicación eliminada» y vibra', async () => {
    act(() => hook.eliminar());
    const confirmar = mockAlert.mock.calls[0][2]![1];
    await act(async () => confirmar.onPress!());
    expect(mockOcultar).toHaveBeenCalledWith('p1');
    expect(mockEliminar).toHaveBeenCalledWith('p1');
    expect(quitarPublicacion).toHaveBeenCalledWith('p1');
    expect(anunciar).toHaveBeenCalledWith('Publicación eliminada');
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(seModero).toHaveBeenCalledTimes(1);
    expect(hook.publicacion).toBeNull();
  });

  it('cancelar no toca nada y la hoja sigue abierta', () => {
    act(() => hook.eliminar());
    const cancelar = mockAlert.mock.calls[0][2]![0];
    expect(cancelar.onPress).toBeUndefined();
    expect(mockOcultar).not.toHaveBeenCalled();
    expect(hook.publicacion).not.toBeNull();
  });

  it('un 403 dice «No tienes permiso para moderar el Muro.»', async () => {
    mockOcultar.mockRejectedValue(falla(403));
    act(() => hook.eliminar());
    await act(async () => mockAlert.mock.calls[0][2]![1].onPress!());
    expect(mockAlert).toHaveBeenLastCalledWith('Moderar el Muro', 'No tienes permiso para moderar el Muro.', undefined);
    expect(quitarPublicacion).not.toHaveBeenCalled();
  });

  it('un 404 al borrar la saca de la lista sin error', async () => {
    mockOcultar.mockRejectedValue(falla(404));
    mockEliminar.mockRejectedValue(falla(404));
    act(() => hook.eliminar());
    await act(async () => mockAlert.mock.calls[0][2]![1].onPress!());
    expect(quitarPublicacion).toHaveBeenCalledWith('p1');
    expect(mockAlert).toHaveBeenCalledTimes(1); // solo la confirmación
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('si ya la ocultó y el borrado falla, sale de la lista y el diálogo dice dónde terminar de eliminarla', async () => {
    mockEliminar.mockRejectedValue(falla(500, 'No se pudo borrar la foto.'));
    act(() => hook.eliminar());
    await act(async () => mockAlert.mock.calls[0][2]![1].onPress!());
    expect(quitarPublicacion).toHaveBeenCalledWith('p1');
    const [titulo, mensaje] = mockAlert.mock.calls[1];
    expect(titulo).toBe('No se pudo eliminar');
    expect(mensaje).toContain('No se pudo borrar la foto.');
    expect(mensaje).toContain('quedó oculta');
    expect(mensaje).toContain('Publicaciones ocultas');
    expect(anunciar).not.toHaveBeenCalled();
  });
});
