/**
 * La tarjeta del Muro después del inventario de íconos (2026-10-05).
 *
 * Contra el código anterior falla en cada punto: el avatar era el emoji 👤, «Like» llevaba un pulgar de
 * 14 px en verde, «Comentar» el globo de chat, la chapa de reacciones vivía al final de la fila de
 * acciones (debajo del botón flotante de SER), el voto de un comentario era siempre verde, adjuntar
 * mostraba una cámara y «Enviar» era texto.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../FotoMuro', () => ({ FotoMuro: () => null }));

import { light } from '../../../../theme/tokens';
import { Icon } from '../../../../components/Icon';
import { TarjetaPublicacionMuro, type AccionesPublicacion } from '../TarjetaPublicacionMuro';
import type { PostItem } from '../../../../screens/ComunidadScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const acciones = new Proxy({}, { get: () => jest.fn() }) as unknown as AccionesPublicacion;

function publicacion(cambios: Partial<PostItem> = {}): PostItem {
  return {
    id: 'p1',
    author: 'Lucía Paredes',
    avatar: '👤',
    avatarUrl: null,
    cell: '',
    diaPrograma: 14,
    timeAgo: 'Hace 5 días',
    text: 'Hoy cumplí mis km.',
    media: [],
    likes: 3,
    userReaction: null,
    comments: [
      { id: 'c1', author: 'Ana', avatar: '👤', text: 'Bien ahí', likes: 1, userReaction: 'like', timeAgo: 'Ayer' },
      { id: 'c2', author: 'Beto', avatar: '👤', text: 'Vamos', likes: 0, userReaction: null, timeAgo: 'Ayer' },
    ],
    ...cambios,
  };
}

function dibujar(post: PostItem, comentariosAbiertos = false): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(TarjetaPublicacionMuro, {
        post,
        expandida: false,
        comentariosAbiertos,
        destacada: false,
        proporcion: undefined,
        textoComentario: '',
        fotoComentario: null,
        comentariosExpandidos: {},
        confirmacion: null,
        acciones,
      })
    );
  });
  return raiz;
}

const boton = (raiz: ReactTestRenderer, etiqueta: string | RegExp): ReactTestInstance =>
  raiz.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      (typeof etiqueta === 'string' ? n.props.accessibilityLabel === etiqueta : etiqueta.test(n.props.accessibilityLabel ?? ''))
  )[0];

const iconosDe = (nodo: ReactTestInstance) => nodo.findAll(n => n.type === Icon).map(i => i.props);
const textos = (raiz: ReactTestRenderer) =>
  raiz.root.findAll(n => typeof n.type === 'string' && n.type === 'Text').map(n => [n.props.children].flat().join(''));

describe('la tarjeta del Muro', () => {
  it('el autor lleva sus iniciales, no un emoji', () => {
    const raiz = dibujar(publicacion());
    expect(textos(raiz)).toContain('LP');
    expect(textos(raiz).join(' ')).not.toContain('👤');
  });

  it('«Me gusta»: ícono de 20 y texto de 14, gris sin reacción y dorado con ella', () => {
    const sin = boton(dibujar(publicacion()), 'Reaccionar a la publicacion');
    expect(iconosDe(sin)[0]).toEqual(expect.objectContaining({ name: 'thumbsUp', size: 20, color: light.textSoft }));
    const con = boton(dibujar(publicacion({ userReaction: 'like' })), 'Quitar reaccion');
    expect(iconosDe(con)[0]).toEqual(expect.objectContaining({ name: 'thumbsUp', size: 20, color: light.goldInk }));
    expect(con.props.accessibilityState).toEqual({ selected: true });
    const etiqueta = con.findAll(n => n.type === 'Text')[0];
    expect([etiqueta.props.children].flat().join('')).toBe('Me gusta');
    expect(JSON.stringify(etiqueta.props.style)).toContain('"fontSize":14');
  });

  it('«Comentar» usa el globo de línea (`messageCircle`), en el mismo gris', () => {
    const comentar = boton(dibujar(publicacion()), 'Ver y escribir comentarios');
    expect(iconosDe(comentar)[0]).toEqual(expect.objectContaining({ name: 'messageCircle', size: 20, color: light.textSoft }));
  });

  it('la chapa de reacciones está en el resumen, ANTES que los comentarios y que las acciones', () => {
    const raiz = dibujar(publicacion());
    const chapa = boton(raiz, /reacciones\. Toca para ver/);
    expect(iconosDe(chapa)[0]).toEqual(expect.objectContaining({ name: 'thumbsUp', size: 16 }));
    // El orden en que se dibujan: chapa → «N comentarios» → Me gusta → Comentar → Compartir. Antes la
    // chapa iba al final, después de «Compartir», contra el borde donde flota el botón de SER.
    const orden = raiz.root.findAll(() => true);
    const posicion = (nodo: ReactTestInstance) => orden.indexOf(nodo);
    const comentarios = raiz.root.findAll(n => n.type === 'Text' && /^\d+ comentarios?$/.test([n.props.children].flat().join('')))[0];
    expect(posicion(chapa)).toBeLessThan(posicion(comentarios));
    expect(posicion(comentarios)).toBeLessThan(posicion(boton(raiz, 'Reaccionar a la publicacion')));
    expect(posicion(chapa)).toBeLessThan(posicion(boton(raiz, 'Compartir la publicacion')));
  });

  it('el voto de un comentario dice si ya lo diste', () => {
    const raiz = dibujar(publicacion(), true);
    const votos = raiz.root.findAll(n => typeof n.props.onPress === 'function' && /^Me gusta este comentario/.test(n.props.accessibilityLabel ?? ''));
    expect(votos.map(v => v.props.accessibilityState)).toEqual([{ selected: true }, { selected: false }]);
    expect(votos.map(v => iconosDe(v)[0].color)).toEqual([light.goldInk, light.textSoft]);
  });

  it('adjuntar abre la galería (`image`) y enviar es el botón redondo con `send`', () => {
    const raiz = dibujar(publicacion(), true);
    expect(iconosDe(boton(raiz, 'Adjuntar una foto de la galería'))[0].name).toBe('image');
    const enviar = boton(raiz, 'Enviar comentario');
    expect(iconosDe(enviar)[0]).toEqual(expect.objectContaining({ name: 'send', size: 20 }));
    expect(enviar.findAll(n => n.type === 'Text')).toHaveLength(0);
  });
});
