/**
 * Moderar el Muro desde Comunidad (pedido del dueño, 2026-10-31: «una función para Administrador y Alquimista para
 * eliminar publicaciones, que solo les salga a estos roles»): el cableado de la pantalla y la hoja del «…».
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
/* La hoja de verdad es un `Modal` con gestos; acá solo importa lo que lleva adentro. */
jest.mock('../../components/hojaDesdeAbajo/HojaDesdeAbajo', () => ({
  HojaDesdeAbajo: (props: { visible: boolean; titulo: string; subtitulo?: string; children: React.ReactNode }) =>
    props.visible
      ? require('react').createElement(
          'Hoja',
          { titulo: props.titulo, subtitulo: props.subtitulo },
          props.children,
        )
      : null,
}));

import { light } from '../../theme/tokens';
import { HojaDeModeracionDelMuro } from '../../features/community/components/HojaDeModeracionDelMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'ComunidadScreen.tsx'), 'utf8');

describe('ComunidadScreen', () => {
  it('le pasa a cada tarjeta si puede moderar, con la regla de rol + servidor', () => {
    expect(fuente).toMatch(/const puedeModerarMuro = usePuedeModerarElMuro\(\);/);
    expect(fuente).toMatch(/puedeModerar=\{puedeModerarMuro\}/);
    // El prop está entre las dependencias del renderizado de la fila: si cambia el permiso, las tarjetas se redibujan.
    expect(fuente).toMatch(/confirmacionDePublicacion,\n\s+puedeModerarMuro,/);
  });

  it('el «…» de la tarjeta abre la hoja de ESA publicación y la hoja está montada una sola vez', () => {
    expect(fuente).toMatch(/moderar: postId => \{[\s\S]*moderacion\.abrir\(\{ id: publicacion\.id/);
    expect(fuente.match(/<HojaDeModeracionDelMuro/g)).toHaveLength(1);
  });

  it('al moderar, la publicación sale de la lista y se avisa con el snackbar de ABAJO (no sobre la cabecera)', () => {
    expect(fuente).toMatch(/useModeracionDelMuro\(\{\s*quitarPublicacion,/);
    expect(fuente).toMatch(/anunciar: texto => setConfirmacionModeracion\(/);
    expect(fuente).toMatch(/<AvisoDeAbajo aviso=\{confirmacionModeracion\}/);
    // El aviso de arriba (absoluto, bajo el encabezado, semitransparente sobre los círculos de secciones) ya no existe.
    expect(fuente).not.toMatch(/top: encabezado\.relleno \+ 8/);
    expect(fuente).not.toMatch(/seccionActiva === 'muro' && confirmacionModeracion \?/);
  });
});

function dibujar(props: Partial<React.ComponentProps<typeof HojaDeModeracionDelMuro>> = {}): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(HojaDeModeracionDelMuro, {
        publicacion: { id: 'p1', autor: 'Ana Pérez', resumen: '' },
        ocupado: null,
        alCerrar: jest.fn(),
        alOcultar: jest.fn(),
        alEliminar: jest.fn(),
        ...props,
      }),
    );
  });
  return raiz;
}
const textos = (r: ReactTestRenderer) =>
  r.root.findAll(n => typeof n.type === 'string' && n.type === 'Text').map(n => [n.props.children].flat().join(''));
const fila = (r: ReactTestRenderer, nombre: string): ReactTestInstance =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel?.startsWith(nombre))[0];

describe('la hoja del «…»', () => {
  it('«Ocultar publicación», con la línea de que se puede devolver, y «Eliminar para siempre»', () => {
    const r = dibujar();
    const t = textos(r);
    expect(t).toContain('Ocultar publicación');
    expect(t).toContain('Deja de verse en el Muro. Puedes devolverla desde Administración.');
    expect(t).toContain('Eliminar para siempre');
    expect(r.root.findAll(n => n.type === 'Hoja')[0].props).toMatchObject({ titulo: 'Moderar publicación', subtitulo: 'De Ana Pérez' });
  });

  it('«Eliminar para siempre» va en rojo; «Ocultar», no', () => {
    const r = dibujar();
    const color = (etiqueta: string) =>
      JSON.stringify(r.root.findAll(n => n.type === 'Text' && [n.props.children].flat().join('') === etiqueta)[0].props.style);
    expect(color('Eliminar para siempre')).toContain(light.danger);
    expect(color('Ocultar publicación')).not.toContain(light.danger);
  });

  it('cada fila llama a lo suyo', () => {
    const alOcultar = jest.fn();
    const alEliminar = jest.fn();
    const r = dibujar({ alOcultar, alEliminar });
    act(() => fila(r, 'Ocultar publicación').props.onPress());
    act(() => fila(r, 'Eliminar para siempre').props.onPress());
    expect(alOcultar).toHaveBeenCalledTimes(1);
    expect(alEliminar).toHaveBeenCalledTimes(1);
  });

  it('con un pedido en curso las dos filas se apagan y la que trabaja lo dice', () => {
    const r = dibujar({ ocupado: 'eliminar' });
    expect(fila(r, 'Ocultar publicación').props.disabled).toBe(true);
    expect(fila(r, 'Eliminar para siempre').props.disabled).toBe(true);
    expect(textos(r)).toContain('Eliminando…');
  });

  it('cerrada (sin publicación) no dibuja nada', () => {
    expect(dibujar({ publicacion: null }).root.findAll(n => n.type === 'Hoja')).toHaveLength(0);
  });
});
