import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { fuentes } from '../../theme/fuentes';

/**
 * El botón dorado, en tipo oración y sin espaciado en TODA la app (decisión del dueño, 2026-11-02).
 *
 * Convivían dos estilos de `GoldButton`: el nuevo («Empezar ahora ›», «Empezar mañana», «Guardar hora»: 16 px, sin espaciado) y el
 * viejo, el que traía el componente por defecto —versales de 11 px con `letterSpacing` 2,2 (o 1,6 en el contorno)—. El dueño eligió
 * unificar todos al estilo nuevo. El estilo vive en UN lugar, `GoldButton`; el texto lo escribe quien lo usa, en tipo oración
 * (eso lo vigila `botonesDoradosSinMayusculas`).
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

import { GoldButton } from '../GoldButton';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SRC = path.resolve(__dirname, '..', '..');

/** Sin comentarios: lo que se explica en ellos (el estilo viejo) no cuenta como código. */
function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('GoldButton: el estilo por defecto es tipo oración, 16 px y sin espaciado', () => {
  const FUENTE = sinComentarios(fs.readFileSync(path.join(SRC, 'components', 'GoldButton.tsx'), 'utf-8'));

  it('el componente no pasa a versales ni usa el rótulo espaciado `t.micro`', () => {
    expect(FUENTE).not.toMatch(/textTransform|toUpperCase|toLocaleUpperCase|\bt\.micro\b/);
    expect(FUENTE).not.toMatch(/letterSpacing:\s*[1-9]/);
  });

  function montar(elemento: React.ReactElement): ReactTestRenderer {
    let raiz: ReactTestRenderer | null = null;
    act(() => {
      raiz = TestRenderer.create(elemento);
    });
    return raiz!;
  }

  function estiloDelTexto(raiz: ReactTestRenderer, texto: string): TextStyle {
    const nodo = raiz.root.findAll(n => n.type === Text && n.props.children === texto)[0];
    expect(nodo).toBeDefined();
    return StyleSheet.flatten(nodo.props.style) as TextStyle;
  }

  it.each([
    ['primary', 'light' as const, fuentes.negrita],
    ['primary', 'dark' as const, fuentes.negrita],
    ['outline', 'light' as const, fuentes.media],
    ['outline', 'dark' as const, fuentes.media],
    ['secondary', 'light' as const, fuentes.media],
  ])('variante %s en %s: 16 px, sin espaciado, sin versales y con la fuente de su rol', (variant, modo, fuente) => {
    mockModo = modo;
    const raiz = montar(
      React.createElement(GoldButton, {
        label: 'Continuar a términos',
        onPress: () => undefined,
        variant: variant as 'primary' | 'outline' | 'secondary',
      }),
    );
    const estilo = estiloDelTexto(raiz, 'Continuar a términos');
    expect(estilo.fontSize).toBe(16);
    expect(estilo.letterSpacing).toBe(0);
    expect(estilo.textTransform).toBeUndefined();
    expect(estilo.fontFamily).toBe(fuente);
    // Un texto largo baja de renglón dentro del botón en vez de salirse de él (360 dp).
    expect(estilo.flexShrink).toBe(1);
  });

  it('muestra el texto tal como se escribe, con su ícono, y un `textStyle` suelto sigue mandando', () => {
    mockModo = 'light';
    const raiz = montar(
      React.createElement(GoldButton, {
        label: 'Entrar a mi Día 1 (hoy)',
        onPress: () => undefined,
        icon: 'arrow',
        textStyle: { fontSize: 15 },
      }),
    );
    const estilo = estiloDelTexto(raiz, 'Entrar a mi Día 1 (hoy)');
    expect(estilo.fontSize).toBe(15);
    expect(estilo.letterSpacing).toBe(0);
  });
});
