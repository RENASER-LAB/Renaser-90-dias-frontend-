/**
 * «Publicaciones ocultas» de Administración (pedido del dueño, 2026-10-31): la lista de `GET /wall/hidden` con su
 * cursor, «Devolver al Muro» y «Eliminar para siempre», y el 403 y el 404.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockAlert = jest.fn<(titulo: string, mensaje?: string, botones?: { text?: string; style?: string; onPress?: () => void }[]) => void>();
jest.mock('../../../../components/Alerta', () => ({
  Alert: { alert: (titulo: string, mensaje?: string, botones?: never) => mockAlert(titulo, mensaje, botones) },
}));
const mockLogro = jest.fn();
jest.mock('../../../../utils/tacto', () => ({ tacto: { logro: () => mockLogro(), error: jest.fn() } }));
jest.mock('../../../../services/http/apiClient', () => ({
  mensajeDeError: (e: unknown, porDefecto: string) => (e as { message?: string })?.message || porDefecto,
}));
const mockLeer = jest.fn<(cursor?: string) => Promise<{ posts: unknown[]; nextCursor: string | null }>>();
const mockRestaurar = jest.fn<(id: string) => Promise<void>>();
const mockEliminar = jest.fn<(id: string) => Promise<void>>();
jest.mock('../../../community/api/wallApi', () => ({
  obtenerPublicacionesOcultas: (cursor?: string) => mockLeer(cursor),
  restaurarPublicacion: (id: string) => mockRestaurar(id),
  eliminarPublicacionParaSiempre: (id: string) => mockEliminar(id),
  ocultarPublicacion: jest.fn(),
}));

import { escucharMuroModerado } from '../../../community/events/muroModerado';
import { usePublicacionesOcultas } from '../usePublicacionesOcultas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const falla = (status: number, message = 'x') => Object.assign(new Error(message), { status });
const fila = (id: string) => ({ id, authorName: 'Ana', text: `texto ${id}`, media: [], createdAt: '2026-10-30T18:00:00Z' });

let raiz: ReactTestRenderer | null = null;
let hook!: ReturnType<typeof usePublicacionesOcultas>;
const seModero = jest.fn();
let darDeBaja: () => void = () => undefined;

async function montar() {
  function Sonda() {
    hook = usePublicacionesOcultas();
    return null;
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
}

const ids = () => (hook.filas ?? []).map(f => f.id);

beforeEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  darDeBaja();
  mockAlert.mockReset();
  mockLogro.mockReset();
  seModero.mockReset();
  mockLeer.mockReset().mockResolvedValue({ posts: [fila('a'), fila('b')], nextCursor: null });
  mockRestaurar.mockReset().mockResolvedValue(undefined);
  mockEliminar.mockReset().mockResolvedValue(undefined);
  darDeBaja = escucharMuroModerado(seModero);
});

describe('la lista', () => {
  it('lee la primera página al abrirse', async () => {
    await montar();
    expect(mockLeer).toHaveBeenCalledWith(undefined);
    expect(ids()).toEqual(['a', 'b']);
    expect(hook.cargando).toBe(false);
    expect(hook.hayMas).toBe(false);
  });

  it('con cursor, «ver más» trae la página siguiente y no repite ninguna', async () => {
    mockLeer.mockResolvedValueOnce({ posts: [fila('a'), fila('b')], nextCursor: 'c1' });
    await montar();
    expect(hook.hayMas).toBe(true);
    mockLeer.mockResolvedValueOnce({ posts: [fila('b'), fila('c')], nextCursor: null });
    await act(async () => hook.traerMas());
    expect(mockLeer).toHaveBeenLastCalledWith('c1');
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(hook.hayMas).toBe(false);
  });

  it('un fallo al traer más no borra lo que ya se ve y se puede reintentar', async () => {
    mockLeer.mockResolvedValueOnce({ posts: [fila('a')], nextCursor: 'c1' });
    await montar();
    mockLeer.mockRejectedValueOnce(falla(500));
    await act(async () => hook.traerMas());
    expect(ids()).toEqual(['a']);
    expect(hook.falloAlTraerMas).toBe(true);
    expect(hook.hayMas).toBe(true);
  });

  it('un 403 al leer dice que no hay permiso; sin red y los demás errores también se distinguen', async () => {
    mockLeer.mockRejectedValueOnce(falla(403));
    await montar();
    expect(hook.fallo).toBe('sin_permiso');
    expect(hook.filas).toBeNull();
    mockLeer.mockRejectedValueOnce(falla(0));
    await act(async () => hook.recargar());
    expect(hook.fallo).toBe('sin_red');
    mockLeer.mockRejectedValueOnce(falla(500));
    await act(async () => hook.recargar());
    expect(hook.fallo).toBe('error');
    await act(async () => hook.recargar());
    expect(hook.fallo).toBeNull();
    expect(ids()).toEqual(['a', 'b']);
  });

  it('una lista vacía es una lista, no un error', async () => {
    mockLeer.mockResolvedValue({ posts: [], nextCursor: null });
    await montar();
    expect(hook.filas).toEqual([]);
    expect(hook.fallo).toBeNull();
  });
});

describe('devolver al Muro', () => {
  it('la saca de la lista, avisa, vibra y le cuenta al Muro para que la vuelva a leer', async () => {
    await montar();
    await act(async () => hook.devolver('a'));
    expect(mockRestaurar).toHaveBeenCalledWith('a');
    expect(ids()).toEqual(['b']);
    expect(hook.aviso?.texto).toBe('Publicación devuelta al Muro');
    expect(mockLogro).toHaveBeenCalledTimes(1);
    expect(seModero).toHaveBeenCalledTimes(1);
    expect(hook.ocupadas).toEqual({});
  });

  it('un 404 la saca sin error; un 403 dice que no hay permiso y la deja', async () => {
    await montar();
    mockRestaurar.mockRejectedValueOnce(falla(404));
    await act(async () => hook.devolver('a'));
    expect(ids()).toEqual(['b']);
    expect(mockAlert).not.toHaveBeenCalled();
    expect(hook.aviso).toBeNull();
    mockRestaurar.mockRejectedValueOnce(falla(403));
    await act(async () => hook.devolver('b'));
    expect(ids()).toEqual(['b']);
    expect(mockAlert).toHaveBeenCalledWith('Moderar el Muro', 'No tienes permiso para moderar el Muro.', undefined);
  });

  it('un fallo del servidor sale en un diálogo con su mensaje y la fila se queda', async () => {
    await montar();
    mockRestaurar.mockRejectedValueOnce(falla(500, 'El servidor no responde en este momento.'));
    await act(async () => hook.devolver('a'));
    expect(mockAlert).toHaveBeenCalledWith('No se pudo devolver', 'El servidor no responde en este momento.', undefined);
    expect(ids()).toEqual(['a', 'b']);
  });

  it('dos toques seguidos sobre la misma publicación mandan un solo pedido', async () => {
    await montar();
    await act(async () => {
      void hook.devolver('a');
      void hook.devolver('a');
    });
    expect(mockRestaurar).toHaveBeenCalledTimes(1);
  });
});

describe('eliminar para siempre', () => {
  it('pide confirmación y no manda nada hasta confirmar', async () => {
    await montar();
    act(() => hook.eliminar('a'));
    const [titulo, mensaje, botones] = mockAlert.mock.calls[0];
    expect(titulo).toBe('¿Eliminar esta publicación para siempre?');
    expect(mensaje).toBe('También se borran sus comentarios, reacciones y fotos. No se puede deshacer.');
    expect(botones?.map(b => [b.text, b.style])).toEqual([['Cancelar', 'cancel'], ['Eliminar para siempre', 'destructive']]);
    expect(mockEliminar).not.toHaveBeenCalled();
    expect(ids()).toEqual(['a', 'b']);
  });

  it('al confirmar manda solo DELETE …/permanent (ya está oculta), la saca y avisa', async () => {
    await montar();
    act(() => hook.eliminar('a'));
    await act(async () => mockAlert.mock.calls[0][2]![1].onPress!());
    expect(mockEliminar).toHaveBeenCalledWith('a');
    expect(ids()).toEqual(['b']);
    expect(hook.aviso?.texto).toBe('Publicación eliminada');
    expect(seModero).toHaveBeenCalledTimes(1);
  });

  it('un 403 dice que no hay permiso; un 404 la saca sin error', async () => {
    await montar();
    mockEliminar.mockRejectedValueOnce(falla(403));
    act(() => hook.eliminar('a'));
    await act(async () => mockAlert.mock.calls[0][2]![1].onPress!());
    expect(mockAlert).toHaveBeenLastCalledWith('Moderar el Muro', 'No tienes permiso para moderar el Muro.', undefined);
    expect(ids()).toEqual(['a', 'b']);
    mockAlert.mockClear();
    mockEliminar.mockRejectedValueOnce(falla(404));
    act(() => hook.eliminar('b'));
    await act(async () => mockAlert.mock.calls[0][2]![1].onPress!());
    expect(mockAlert).toHaveBeenCalledTimes(1); // solo la confirmación
    expect(ids()).toEqual(['a']);
  });
});
