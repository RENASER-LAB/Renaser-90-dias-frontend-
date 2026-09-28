/**
 * 28/09, pedido del dueño: «que abra la info del grupo». La ⓘ de Comunidad se había quitado porque no
 * hacía nada (E-409); vuelve abriendo la info de tu grupo, y sin grupo sigue sin dibujarse. Contra el
 * código anterior falla: la cabecera de Comunidad no tenía ⓘ y no había nada que tocar.
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
import {
  botonDeInfoDelGrupo,
  conversacionDelGrupo,
  grupoDeLaCabecera,
} from '../../features/community/utils/infoDesdeLaCabecera';
import type { CelulaDelAprendiz } from '../../features/community/types/community.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const grupo = (cellId: string, cellName: string): CelulaDelAprendiz => ({
  cellId,
  cellName,
  cohortName: 'C1',
  cohortStatus: 'ACTIVE',
  mentorName: 'Mentora',
  mentorAvatarUrl: null,
  memberCount: 3,
  totalCellsInCohort: 1,
  videoCallUrl: null,
  nextSessionAt: null,
});

/** Los botones de la cabecera: lo que se toca (`accessibilityRole="button"` con `onPress`). */
const botonesDe = (raiz: ReactTestRenderer) =>
  raiz.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');

function cabeceraDeComunidad(grupos: CelulaDelAprendiz[], abrir: (id: string) => void): ReactTestRenderer {
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(ScreenHeader, { title: 'COMUNIDAD', ...botonDeInfoDelGrupo(grupoDeLaCabecera(grupos, null), abrir) })
    );
  });
  return raiz;
}

describe('la ⓘ de la cabecera de Comunidad', () => {
  it('con grupo, tocarla abre la info de ESE grupo', () => {
    const abrir = jest.fn<(id: string) => void>();
    const raiz = cabeceraDeComunidad([grupo('g-principal', 'Fénix'), grupo('g-2', 'Águila')], abrir);
    act(() => {
      botonesDe(raiz)[0].props.onPress();
    });
    expect(abrir).toHaveBeenCalledWith('g-principal');
  });

  it('sin grupo (o admin sin grupo propio) no se dibuja', () => {
    const raiz = cabeceraDeComunidad([], () => undefined);
    expect(botonesDe(raiz)).toHaveLength(0);
  });

  it('abre el grupo elegido en la tarjeta de Tribu y, si no hay elegido, el primero', () => {
    const grupos = [grupo('a', 'A'), grupo('b', 'B')];
    expect(grupoDeLaCabecera(grupos, 'b')?.cellId).toBe('b');
    expect(grupoDeLaCabecera(grupos, null)?.cellId).toBe('a');
    expect(grupoDeLaCabecera(grupos, 'ya-no-esta')?.cellId).toBe('a');
  });

  it('abre el chat de ese grupo, no la global ni otro grupo', () => {
    const conversaciones = [
      { id: 'global', type: 'global', celulaId: null },
      { id: 'otro', type: 'celula', celulaId: 'b' },
      { id: 'mio', type: 'celula', celulaId: 'a' },
    ];
    expect(conversacionDelGrupo(conversaciones, 'a')?.id).toBe('mio');
    expect(conversacionDelGrupo(conversaciones, 'z')).toBeNull();
  });

  it('Comunidad le pasa la ⓘ a su cabecera', () => {
    const texto = fs.readFileSync(path.resolve(__dirname, '..', '..', 'screens', 'ComunidadScreen.tsx'), 'utf-8');
    expect(texto).toMatch(/<ScreenHeader title="COMUNIDAD" \{\.\.\.botonDeInfo\} \/>/);
    // Abre el chat del grupo y, encima, la MISMA info que abre la ⓘ del chat.
    expect(texto).toMatch(/handleAbrirChat\(conversacion\);\s*setGroupInfoVisible\(true\);/);
  });
});
