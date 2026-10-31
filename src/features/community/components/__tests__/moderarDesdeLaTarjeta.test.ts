/**
 * El «…» de moderación en la tarjeta del Muro (pedido del dueño, 2026-10-31): solo existe con `puedeModerar`, tiene
 * nombre para el lector de pantalla, 48 de área táctil y abre la hoja de ESA publicación.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../FotoMuro', () => ({ FotoMuro: () => null }));

import { Icon } from '../../../../components/Icon';
import type { PostItem } from '../../../../screens/ComunidadScreen';
import { TarjetaPublicacionMuro, type AccionesPublicacion } from '../TarjetaPublicacionMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const publicacion = (cambios: Partial<PostItem> = {}): PostItem => ({
  id: 'p1',
  author: 'Lucía Paredes',
  avatar: '👤',
  avatarUrl: null,
  cell: '',
  diaPrograma: 14,
  timeAgo: 'Hace 5 días',
  text: '',
  media: [],
  likes: 0,
  userReaction: null,
  comments: [],
  ...cambios,
});

function dibujar(post: PostItem, puedeModerar: boolean | undefined, acciones: Partial<AccionesPublicacion> = {}): ReactTestRenderer {
  const todas = new Proxy(acciones, { get: (objetivo, clave) => (objetivo as never)[clave] ?? jest.fn() }) as unknown as AccionesPublicacion;
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(TarjetaPublicacionMuro, {
        post,
        expandida: false,
        comentariosAbiertos: false,
        destacada: false,
        proporcion: undefined,
        textoComentario: '',
        fotoComentario: null,
        comentariosExpandidos: {},
        confirmacion: null,
        ...(puedeModerar === undefined ? {} : { puedeModerar }),
        acciones: todas,
      })
    );
  });
  return raiz;
}

const NOMBRE = 'Opciones de moderación';
const botonModerar = (raiz: ReactTestRenderer): ReactTestInstance | undefined =>
  raiz.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === NOMBRE)[0];

describe('el «…» de moderación de la tarjeta', () => {
  it('con permiso: un botón con nombre, ícono `ellipsis` de 24 y área de 48', () => {
    const raiz = dibujar(publicacion(), true);
    const boton = botonModerar(raiz)!;
    expect(boton).toBeDefined();
    expect(boton.props.accessibilityRole).toBe('button');
    const icono = boton.findAll(n => n.type === Icon)[0];
    expect(icono.props).toEqual(expect.objectContaining({ name: 'ellipsis', size: 24 }));
    // El área táctil es de 48 y no suma alto a la cabecera (márgenes negativos).
    const caja = boton.findAll(n => n.props.style)
      .map(n => JSON.stringify(n.props.style))
      .find(estilo => estilo.includes('"width":48'));
    expect(caja).toContain('"height":48');
  });

  it('sin permiso —el aprendiz, el mentor, el líder, el autor— no existe', () => {
    expect(botonModerar(dibujar(publicacion(), false))).toBeUndefined();
    // Sin el prop (cualquier otro lugar que use la tarjeta) tampoco.
    expect(botonModerar(dibujar(publicacion(), undefined))).toBeUndefined();
    // Y ninguna otra pieza de la tarjeta pasa a ser un «…».
    const iconos = dibujar(publicacion(), false).root.findAll(n => n.type === Icon).map(n => n.props.name);
    expect(iconos).not.toContain('ellipsis');
  });

  it('una publicación que todavía se está subiendo no se modera (no tiene id del servidor)', () => {
    expect(botonModerar(dibujar(publicacion({ pendiente: true }), true))).toBeUndefined();
  });

  it('tocarlo abre la hoja de ESA publicación', () => {
    const moderar = jest.fn();
    const raiz = dibujar(publicacion({ id: 'p-77' }), true, { moderar });
    act(() => botonModerar(raiz)!.props.onPress());
    expect(moderar).toHaveBeenCalledTimes(1);
    expect(moderar).toHaveBeenCalledWith('p-77');
  });
});
