/**
 * `PuertaDelMapa` (issue #37, 2026-10-27): lo que ocupa el lugar de los objetivos de Plan mientras el Mapa de
 * Renacimiento no está activo. Se prueba qué se lee y qué se puede tocar en cada estado.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import {
  BOTON_HACER_MI_MAPA,
  BOTON_REINTENTAR,
  PuertaDelMapa,
  TEXTO_COMPROBANDO_EL_MAPA,
  TEXTO_PRIMERO_EL_MAPA,
  TEXTO_SIN_COMPROBAR_EL_MAPA,
  TITULO_PRIMERO_EL_MAPA,
} from '../PuertaDelMapa';
import type { PuertaDeObjetivos } from '../../utils/puertaDeObjetivos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: ReactTestRenderer | null = null;

function dibujar(puerta: PuertaDeObjetivos) {
  const onHacerMapa = jest.fn();
  const onReintentar = jest.fn();
  act(() => {
    raiz = TestRenderer.create(React.createElement(PuertaDelMapa, { puerta, onHacerMapa, onReintentar }));
  });
  return { onHacerMapa, onReintentar };
}

const textos = () => raiz!.root.findAll(n => (n.type as unknown) === 'Text').map(n => String(n.props.children));
const botones = () => raiz!.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
const etiquetaDe = (b: ReactTestInstance) => b.findAll(n => (n.type as unknown) === 'Text').map(n => String(n.props.children)).join('');

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('PuertaDelMapa', () => {
  it('«espera-al-mapa»: título, una línea de por qué y «Hacer mi Mapa», que abre el Mapa', () => {
    const { onHacerMapa, onReintentar } = dibujar('espera-al-mapa');
    expect(textos()).toEqual(expect.arrayContaining([TITULO_PRIMERO_EL_MAPA, TEXTO_PRIMERO_EL_MAPA]));
    expect(TITULO_PRIMERO_EL_MAPA).toBe('Primero tu Mapa de Renacimiento');
    expect(TEXTO_PRIMERO_EL_MAPA).toContain('Tu objetivo de 90 días nace de tu Mapa');

    const todos = botones();
    expect(todos.map(etiquetaDe)).toEqual([BOTON_HACER_MI_MAPA]);
    expect(BOTON_HACER_MI_MAPA).toBe('Hacer mi Mapa');
    act(() => todos[0].props.onPress());
    expect(onHacerMapa).toHaveBeenCalledTimes(1);
    expect(onReintentar).not.toHaveBeenCalled();
  });

  it('«espera-al-mapa»: el título es un encabezado para el lector de pantalla', () => {
    dibujar('espera-al-mapa');
    const encabezados = raiz!.root.findAll(n => n.props.accessibilityRole === 'header');
    expect(encabezados.length).toBeGreaterThan(0);
  });

  it('«espera-al-mapa»: nada para editar (ni «Editar», ni «Avance», ni formularios)', () => {
    dibujar('espera-al-mapa');
    const todo = textos().join(' | ');
    for (const editable of ['Editar', 'Avance', 'Guardar', 'Armar mi semana', 'Este mes']) {
      expect(todo).not.toContain(editable);
    }
    expect(raiz!.root.findAll(n => (n.type as unknown) === 'TextInput')).toHaveLength(0);
  });

  it('«comprobando»: una línea, sin botones ni promesas', () => {
    dibujar('comprobando');
    expect(textos()).toEqual([TEXTO_COMPROBANDO_EL_MAPA]);
    expect(botones()).toHaveLength(0);
  });

  it('«sin-comprobar»: lo dice y ofrece «Reintentar», sin abrir el Mapa', () => {
    const { onHacerMapa, onReintentar } = dibujar('sin-comprobar');
    expect(textos()).toEqual(expect.arrayContaining([TEXTO_SIN_COMPROBAR_EL_MAPA]));
    const todos = botones();
    expect(todos.map(etiquetaDe)).toEqual([BOTON_REINTENTAR]);
    act(() => todos[0].props.onPress());
    expect(onReintentar).toHaveBeenCalledTimes(1);
    expect(onHacerMapa).not.toHaveBeenCalled();
  });

  it('«abierta»: no dibuja nada', () => {
    dibujar('abierta');
    expect(textos()).toEqual([]);
    expect(botones()).toHaveLength(0);
    expect(raiz!.root.findAll(n => (n.type as unknown) === 'View')).toHaveLength(0);
  });
});
