import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * El cierre del Mapa de Renacimiento (V11) y la flecha de volver de sus pasos, sin versales
 * espaciadas (decisión del dueño del 2026-10-05).
 *
 * Contra el código anterior falla: el cierre decía «FELICIDADES» (espaciado 2) y «PRÓXIMAMENTE ·
 * REAFIRMA TU COMPROMISO», el botón «Comenzar mis 75 días» iba espaciado, y volver era el texto
 * «← ANTERIOR» en versalitas de 10,5, sin ícono, en un área de 44.
 */

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

import { AperturaScreen } from '../screens/AperturaScreen';
import { CierreScreen } from '../screens/CierreScreen';
import { PrioridadScreen } from '../screens/PrioridadScreen';
import type { PropsPaso } from '../screens/props';
import { textosConLosDiasQueQuedan } from '../textosDeApertura';
import { mapaVacio } from '../tipos';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PANTALLAS = { AperturaScreen, CierreScreen, PrioridadScreen } as const;

function montar(nombre: keyof typeof PANTALLAS): ReactTestRenderer {
  const estado = {
    mapa: mapaVacio(),
    actualizar: () => undefined,
    siguiente: () => undefined,
    anterior: () => undefined,
  };
  const props: PropsPaso = {
    estado: estado as never,
    onSalir: () => undefined,
    dias: textosConLosDiasQueQuedan({ diaPrograma: 15, inscrito: true, loading: false }),
  };
  let r!: ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(PANTALLAS[nombre], props));
  });
  return r;
}

/** Los textos de la pantalla con su estilo final. */
function textos(r: ReactTestRenderer): { texto: string; estilo: TextStyle }[] {
  return r.root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => ({
      texto: React.Children.toArray(n.props.children).filter(h => typeof h === 'string' || typeof h === 'number').join(''),
      estilo: (StyleSheet.flatten(n.props.style) ?? {}) as TextStyle,
    }))
    .filter(x => x.texto.trim() !== '');
}

/** Dos o más palabras seguidas en mayúsculas: una versal. «SER» o «DNI» sueltas no cuentan. */
const VERSAL = /[A-ZÁÉÍÓÚÑ]{2,}[^a-záéíóúñ]+[A-ZÁÉÍÓÚÑ]{2,}|\b[A-ZÁÉÍÓÚÑ]{5,}\b/;

/** El botón «volver» (por su nombre para el lector de pantalla). */
function botonVolver(r: ReactTestRenderer, nombre: string): ReactTestInstance {
  const candidatos = r.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === nombre);
  expect(candidatos.length).toBeGreaterThan(0);
  return candidatos[0];
}

describe('el cierre del Mapa, en tipo oración y sin espaciar', () => {
  it('dice «Felicidades» y «Próximamente · Reafirma tu compromiso», sin versales', () => {
    const lista = textos(montar('CierreScreen'));
    const todo = lista.map(x => x.texto);
    expect(todo).toContain('Felicidades');
    expect(todo).toContain('Próximamente · Reafirma tu compromiso');
    for (const { texto } of lista) expect({ texto, versal: VERSAL.test(texto) }).toEqual({ texto, versal: false });
  });

  it('ningún texto de la pantalla va espaciado, tampoco el botón «Comenzar mis 75 días»', () => {
    const lista = textos(montar('CierreScreen'));
    expect(lista.map(x => x.texto)).toContain('Comenzar mis 75 días');
    // El umbral deja pasar el 0,5 del título «Tu mapa está activo.» (28 px): no es un rótulo
    // estirado. Lo de antes era 1,1 a 2,2 sobre letra de 10,5 a 11.
    for (const { texto, estilo } of lista) {
      expect({ texto, espaciado: (estilo.letterSpacing ?? 0) > 0.5 }).toEqual({ texto, espaciado: false });
    }
  });
});

describe('volver en los pasos del Mapa: la flecha del rediseño', () => {
  it.each([
    ['PrioridadScreen' as const, 'Anterior'],
    ['AperturaScreen' as const, 'Volver'],
  ])('%s: flecha de 24 y «%s» en tipo oración, en un área de 48', (pantalla, nombre) => {
    const r = montar(pantalla);
    const boton = botonVolver(r, nombre);
    const flecha = boton.findAll(n => n.props.name === 'arrowLeft');
    expect(flecha.length).toBeGreaterThan(0);
    expect(flecha[0].props.size).toBe(24);
    const rotulos = boton.findAll(n => (n.type as unknown) === 'Text').map(n => React.Children.toArray(n.props.children).join(''));
    expect(rotulos).toContain(nombre);
    // Ni la flecha de texto ni las versales de antes.
    const todo = textos(r).map(x => x.texto);
    expect(todo.some(t => t.includes('←'))).toBe(false);
    expect(todo).not.toContain(`← ${nombre.toUpperCase()}`);
    const altos = boton
      .findAll(n => (n.type as unknown) === 'View')
      .map(n => (StyleSheet.flatten(n.props.style) ?? {}) as ViewStyle)
      .map(e => Number(e.minHeight ?? e.height ?? 0));
    expect(Math.max(...altos)).toBeGreaterThanOrEqual(48);
  });
});
