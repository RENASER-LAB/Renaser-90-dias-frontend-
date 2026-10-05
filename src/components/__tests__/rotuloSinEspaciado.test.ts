import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

/**
 * `MicroLabel`, el rótulo de sección de toda la app, va sin espaciar (decisión del dueño del
 * 2026-10-05): «Hábitos de hoy», «Fase actual», «Directos», el rótulo de cada campo…
 *
 * Contra el código anterior falla: era `t.micro` —10,5 px, `Jost_500Medium`, `letterSpacing: 1.1`—,
 * y en tipo oración ese aire se leía «H á b i t o s». Ahora: 13 px, `Jost_700Bold`, espaciado 0,
 * como «Coherencia» y «Racha» de Hoy.
 */

let mockModo: 'light' | 'dark' = 'light';
jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({
      mode: mockModo,
      c: mockModo === 'dark' ? tokens.dark : tokens.light,
      t: tokens.type,
      space: tokens.space,
      toggle: () => undefined,
      setMode: () => undefined,
    }),
  };
});

import { MicroLabel } from '../ui';
import { FormField } from '../FormField';
import { dark, light } from '../../theme/tokens';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(elemento: React.ReactElement): ReactTestRenderer {
  let raiz: ReactTestRenderer | null = null;
  act(() => {
    raiz = TestRenderer.create(elemento);
  });
  return raiz!;
}

/** El estilo final del `Text` que dice exactamente `texto`. */
function estiloDe(raiz: ReactTestRenderer, texto: string): TextStyle {
  const nodo = raiz.root.findAll(n => n.type === Text && n.props.children === texto)[0];
  expect(nodo).toBeDefined();
  return StyleSheet.flatten(nodo.props.style) as TextStyle;
}

describe('MicroLabel sin espaciado', () => {
  it.each([
    ['claro', 'light' as const, light.micro],
    ['oscuro', 'dark' as const, dark.micro],
  ])('en modo %s: 13 px, negrita, sin espaciar y con el color de los rótulos', (_nombre, modo, color) => {
    mockModo = modo;
    const estilo = estiloDe(montar(React.createElement(MicroLabel, null, 'Hábitos de hoy')), 'Hábitos de hoy');
    expect(estilo.letterSpacing).toBe(0);
    expect(estilo.fontFamily).toBe('Jost_700Bold');
    expect(estilo.fontSize).toBeGreaterThanOrEqual(13);
    expect(estilo.color).toBe(color);
    // El texto se muestra como se escribe: nada lo pasa a versales.
    expect(estilo.textTransform).toBeUndefined();
  });

  it('el rótulo de un campo (FormField) también va sin espaciar', () => {
    mockModo = 'light';
    const raiz = montar(React.createElement(FormField, { label: 'Cómo lo vas a llamar', value: '', onChangeText: () => undefined }));
    const estilo = estiloDe(raiz, 'Cómo lo vas a llamar');
    expect(estilo.letterSpacing).toBe(0);
    expect(estilo.fontFamily).toBe('Jost_700Bold');
  });
});

/**
 * En las tarjetas de Hoy la cifra que acompaña al rótulo («0/15», «Hace 5 días») va con la misma
 * letra: a 10,5 y espaciada quedaba más chica y corrida al lado de un rótulo de 13.
 */
describe('Hoy: la cifra de la cabecera de cada tarjeta va con la letra del rótulo', () => {
  const HOY = fs
    .readFileSync(path.resolve(__dirname, '..', '..', 'screens', 'HoyScreen.tsx'), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it.each(['Hábitos de hoy', 'Acciones y objetivos', 'Última evidencia del muro'])('«%s»', rotulo => {
    const desde = HOY.indexOf(`<MicroLabel>${rotulo}</MicroLabel>`);
    expect(desde).toBeGreaterThan(-1);
    const cabecera = HOY.slice(desde, HOY.indexOf('</Text>', desde));
    expect(cabecera).not.toContain('t.micro');
    expect(cabecera).toMatch(/<Text style=\{\[t\.small,[^\]]*fontFamily: 'Jost_700Bold'/);
  });
});
