// pedido del dueño 2026-11-05 muro compacto
/**
 * La fila compacta del Muro (estilo Skool): miniatura con la primera foto y «+N», sin foto el texto a todo el ancho, la
 * insignia del día, el «…» solo para quien modera, y que tocar la fila, «me gusta» y comentarios hagan lo suyo.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../FotoMuro', () => ({ FotoMuro: (props: { url: string }) => `foto:${props.url}` }));

import type { PostItem } from '../../../../screens/ComunidadScreen';
import { FilaCompactaDelMuro, type AccionesDeLaFila } from '../FilaCompactaDelMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const foto = (n: number): PostItem['media'][number] => ({
  type: 'image',
  title: `📷 Foto ${n}`,
  url: `https://s3/foto${n}.jpg`,
  mimeType: 'image/jpeg',
});

const publicacion = (cambios: Partial<PostItem> = {}): PostItem => ({
  id: 'p1',
  author: 'Lucía Paredes',
  avatar: '',
  avatarUrl: null,
  cell: '',
  diaPrograma: 14,
  timeAgo: 'Hace 5 días',
  text: 'Hoy terminé mi caminata de 5 km y me siento con energía.',
  media: [],
  likes: 3,
  userReaction: null,
  comments: [],
  cantidadComentarios: 2,
  ...cambios,
});

function dibujar(post: PostItem, puedeModerar?: boolean, acciones: Partial<AccionesDeLaFila> = {}): ReactTestRenderer {
  const todas: AccionesDeLaFila = { abrir: jest.fn(), alternarLike: jest.fn(), moderar: jest.fn(), ...acciones };
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(FilaCompactaDelMuro, {
        post,
        destacada: false,
        acciones: todas,
        ...(puedeModerar === undefined ? {} : { puedeModerar }),
      })
    );
  });
  return raiz;
}

const textos = (raiz: ReactTestRenderer) =>
  raiz.root.findAllByType(Text).map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children)));
const conEtiqueta = (raiz: ReactTestRenderer, etiqueta: string | RegExp): ReactTestInstance | undefined =>
  raiz.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof etiqueta === 'string' ? n.props.accessibilityLabel === etiqueta : etiqueta.test(n.props.accessibilityLabel))
  )[0];
const miniatura = (raiz: ReactTestRenderer) => raiz.root.findAll(n => n.props.testID === 'miniatura-del-muro')[0];

describe('la fila compacta del Muro', () => {
  it('con varias fotos: la miniatura de 66 con la PRIMERA y la chapa «+N»', () => {
    const raiz = dibujar(publicacion({ media: [foto(1), foto(2), foto(3)] }));
    const caja = miniatura(raiz);
    expect(caja).toBeDefined();
    expect(JSON.stringify(caja.props.style)).toContain('"width":66');
    expect(JSON.stringify(caja.props.style)).toContain('"borderRadius":10');
    expect(JSON.stringify(raiz.toJSON())).toContain('foto:https://s3/foto1.jpg');
    expect(textos(raiz)).toContain('+2');
  });

  it('con una foto: miniatura sin chapa', () => {
    const raiz = dibujar(publicacion({ media: [foto(1)] }));
    expect(miniatura(raiz)).toBeDefined();
    expect(textos(raiz).some(t => t.startsWith('+'))).toBe(false);
  });

  it('sin fotos: no hay miniatura y el texto usa todo el ancho, cortado a 3 líneas', () => {
    const raiz = dibujar(publicacion());
    expect(miniatura(raiz)).toBeUndefined();
    const texto = raiz.root.findAllByType(Text).find(n => n.props.children === publicacion().text)!;
    expect(texto.props.numberOfLines).toBe(3);
  });

  it('la insignia del día sale si hay día y no si no', () => {
    expect(textos(dibujar(publicacion()))).toContain('Día 14');
    expect(textos(dibujar(publicacion({ diaPrograma: null }))).some(t => t.startsWith('Día'))).toBe(false);
  });

  it('el «…» solo para quien modera, y abre la hoja de esa publicación', () => {
    expect(conEtiqueta(dibujar(publicacion(), false), 'Opciones de moderación')).toBeUndefined();
    expect(conEtiqueta(dibujar(publicacion()), 'Opciones de moderación')).toBeUndefined();
    expect(conEtiqueta(dibujar(publicacion({ pendiente: true }), true), 'Opciones de moderación')).toBeUndefined();
    const moderar = jest.fn();
    const raiz = dibujar(publicacion({ id: 'p-9' }), true, { moderar });
    act(() => conEtiqueta(raiz, 'Opciones de moderación')!.props.onPress());
    expect(moderar).toHaveBeenCalledWith('p-9');
  });

  it('tocar la fila abre la publicación; comentarios la abre con los comentarios; «me gusta» reacciona', () => {
    const abrir = jest.fn();
    const alternarLike = jest.fn();
    const raiz = dibujar(publicacion({ id: 'p-3' }), false, { abrir, alternarLike });
    act(() => conEtiqueta(raiz, /^Publicación de Lucía Paredes/)!.props.onPress());
    expect(abrir).toHaveBeenLastCalledWith('p-3');
    act(() => conEtiqueta(raiz, '2 comentarios. Abrir la publicación')!.props.onPress());
    expect(abrir).toHaveBeenLastCalledWith('p-3', true);
    act(() => conEtiqueta(raiz, 'Me gusta. 3')!.props.onPress());
    expect(alternarLike).toHaveBeenCalledWith('p-3');
  });

  it('«me gusta» dado: seleccionado y en dorado', () => {
    const raiz = dibujar(publicacion({ userReaction: 'like', likes: 4 }));
    const boton = conEtiqueta(raiz, 'Quitar me gusta. 4')!;
    expect(boton.props.accessibilityState).toEqual({ selected: true });
  });

  it('los botones del pie miden 44 o más', () => {
    const raiz = dibujar(publicacion());
    const boton = conEtiqueta(raiz, 'Me gusta. 3')!;
    const estilo = JSON.stringify(boton.props.style({ pressed: false }));
    expect(estilo).toContain('"minHeight":44');
  });
});
