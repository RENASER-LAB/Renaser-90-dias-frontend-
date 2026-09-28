/**
 * E-409 (28/09): «quitarlos si no hacen nada». La ⓘ de Comunidad, el «⋯» de Plan y de Training y la
 * campana de Hoy se veían como botones y no hacían nada. Contra el código anterior fallan: la cabecera
 * dibujaba el botón con o sin acción, y las cuatro pantallas lo pedían sin acción.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../../theme/responsive', () => ({ useResponsive: () => ({ horizontalPadding: 18 }) }));

import { ScreenHeader } from '../ui';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function botones(props: React.ComponentProps<typeof ScreenHeader>): number {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(ScreenHeader, props));
  });
  // El ícono de la derecha: sin él no hay botón que parezca tocable.
  return raiz.root.findAll(n => typeof n.type === 'function' && (n.type as { name?: string }).name === 'Icon').length;
}

describe('la cabecera de cada pantalla', () => {
  it('sin acción no dibuja el botón de la derecha', () => {
    expect(botones({ title: 'PLAN', right: 'dots' })).toBe(0);
    expect(botones({ title: 'HOY' })).toBe(0);
  });

  it('con acción sí lo dibuja', () => {
    expect(botones({ title: 'YO', right: 'dots', onPressRight: () => undefined })).toBeGreaterThan(0);
  });

  it('ninguna pantalla pide un ícono sin decir qué hace', () => {
    const pantallas = ['HoyScreen', 'PlanScreen', 'TrainingScreen', 'ComunidadScreen', 'YoScreen'];
    for (const nombre of pantallas) {
      const texto = fs.readFileSync(path.resolve(__dirname, '..', '..', 'screens', `${nombre}.tsx`), 'utf-8');
      for (const cabecera of texto.match(/<ScreenHeader\b[^\n]*\/>/g) ?? []) {
        if (/\bright=/.test(cabecera)) expect(`${nombre}: ${cabecera}`).toMatch(/onPressRight=/);
      }
    }
  });
});
