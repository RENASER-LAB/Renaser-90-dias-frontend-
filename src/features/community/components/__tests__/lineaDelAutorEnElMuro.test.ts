/**
 * La línea bajo el nombre en la tarjeta del Muro (E2E del 03/11, issue #115): sin grupo decía «· Hace 1 minuto», con un punto suelto adelante. El
 * «·» solo separa cosas que existen.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../FotoMuro', () => ({ FotoMuro: () => null }));

import type { PostItem } from '../../../../screens/ComunidadScreen';
import { lineaDelAutor } from '../../utils/lineaDelAutor';
import { TarjetaPublicacionMuro, type AccionesPublicacion } from '../TarjetaPublicacionMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('lineaDelAutor', () => {
  it('sin grupo, solo «Hace 1 minuto»: el punto no aparece', () => {
    expect(lineaDelAutor('', 'Hace 1 minuto')).toBe('Hace 1 minuto');
    expect(lineaDelAutor('   ', 'Hace 1 minuto')).toBe('Hace 1 minuto');
    expect(lineaDelAutor(null, 'Hace 1 minuto')).toBe('Hace 1 minuto');
    expect(lineaDelAutor(undefined, 'Hace 1 minuto')).toBe('Hace 1 minuto');
  });

  it('con grupo, el punto separa las dos cosas', () => {
    expect(lineaDelAutor('Grupo Fénix', 'Hace 1 minuto')).toBe('Grupo Fénix · Hace 1 minuto');
  });

  it('sin hora, solo el grupo; sin nada, nada', () => {
    expect(lineaDelAutor('Grupo Fénix', '')).toBe('Grupo Fénix');
    expect(lineaDelAutor('', '')).toBe('');
  });
});

const publicacion = (cambios: Partial<PostItem> = {}): PostItem => ({
  id: 'p1',
  author: 'Lucía Paredes',
  avatar: '👤',
  avatarUrl: null,
  cell: '',
  diaPrograma: 14,
  timeAgo: 'Hace 1 minuto',
  text: '',
  media: [],
  likes: 0,
  userReaction: null,
  comments: [],
  ...cambios,
});

function textos(post: PostItem): string[] {
  const todas = new Proxy({}, { get: () => jest.fn() }) as unknown as AccionesPublicacion;
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
        acciones: todas,
      }),
    );
  });
  return raiz.root
    .findAll(n => n.type === 'Text')
    .map(n => ([] as unknown[]).concat(n.props.children).filter(x => typeof x === 'string' || typeof x === 'number').join(''));
}

describe('la tarjeta del Muro', () => {
  it('sin grupo dice «Hace 1 minuto», sin ningún punto suelto', () => {
    const t = textos(publicacion());
    expect(t).toContain('Hace 1 minuto');
    expect(t.some(linea => linea.trim().startsWith('·'))).toBe(false);
  });

  it('con grupo dice «Grupo Fénix · Hace 1 minuto»', () => {
    expect(textos(publicacion({ cell: 'Grupo Fénix' }))).toContain('Grupo Fénix · Hace 1 minuto');
  });
});
