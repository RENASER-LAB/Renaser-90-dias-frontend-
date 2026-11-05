// pedido del dueño 2026-11-05 muro compacto (#130)
/**
 * La publicación abierta desde la fila compacta del Muro cuenta los comentarios igual que la fila: el feed trae
 * `commentCount` (`cantidadComentarios`) pero no la lista, que llega vacía hasta abrir los comentarios. Antes la tarjeta
 * decía «0 comentarios» de una publicación con uno, mientras la fila decía «1».
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../FotoMuro', () => ({ FotoMuro: () => null }));
jest.mock('../../../formaciones/hooks/useFormacionDeLaComunidad', () => ({
  useFormacionDeLaComunidad: () => ({
    mostrarRotulos: false,
    mostrarSelector: false,
    veTodas: false,
    eleccion: null,
    rotuloDe: (codigo: string) => codigo,
    nombreDe: (codigo: string) => codigo,
  }),
}));

import type { PostItem } from '../../../../screens/ComunidadScreen';
import { TarjetaPublicacionMuro, textoDeComentarios, type AccionesPublicacion } from '../TarjetaPublicacionMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const acciones = new Proxy({}, { get: () => jest.fn() }) as unknown as AccionesPublicacion;

const publicacion = (cambios: Partial<PostItem> = {}): PostItem => ({
  id: 'p1',
  author: 'Lucía Paredes',
  avatar: '👤',
  avatarUrl: null,
  cell: '',
  diaPrograma: 14,
  timeAgo: 'Hace 5 días',
  text: 'Hoy terminé mi caminata.',
  media: [],
  likes: 1,
  userReaction: null,
  comments: [],
  ...cambios,
});

let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

function textos(post: PostItem): string[] {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(TarjetaPublicacionMuro, {
        post,
        expandida: true,
        comentariosAbiertos: false,
        destacada: false,
        proporcion: undefined,
        textoComentario: '',
        fotoComentario: null,
        comentariosExpandidos: {},
        confirmacion: null,
        puedeModerar: false,
        acciones,
      }),
    );
  });
  return raiz!.root
    .findAll(n => (n.type as unknown) === Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));
}

describe('los comentarios de la publicación abierta', () => {
  it('con la lista sin leer, cuenta lo que dice el servidor', () => {
    const t = textos(publicacion({ cantidadComentarios: 1 }));
    expect(t).toContain('1 comentario');
    expect(t).not.toContain('0 comentarios');
  });

  it('con la lista ya leída por delante del conteo, cuenta la lista', () => {
    const comentario = { id: 'c1', author: 'Ana', text: 'Bien', timeAgo: 'Hace 1 min', likes: 0 } as unknown as PostItem['comments'][number];
    expect(textos(publicacion({ cantidadComentarios: 0, comments: [comentario, { ...comentario, id: 'c2' }] }))).toContain('2 comentarios');
  });

  it('sin conteo ni lista, dice 0', () => {
    expect(textos(publicacion())).toContain('0 comentarios');
  });

  it('el texto, en singular y plural', () => {
    expect(textoDeComentarios(1)).toBe('1 comentario');
    expect(textoDeComentarios(3)).toBe('3 comentarios');
  });
});
