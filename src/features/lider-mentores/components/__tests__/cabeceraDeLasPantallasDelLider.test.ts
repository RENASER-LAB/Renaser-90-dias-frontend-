import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Las pantallas del líder llevan todas la misma cabecera que «Mis mentores» y Administración: «‹ Título» (`CabeceraAdmin`), no
 * «← VOLVER» en versalitas (E2E del 31/10: «Mentores y reporte del mes», «Todos los aprendices» y la ficha de la persona).
 */
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});

jest.mock('../../../renasia/components/RenasiaLauncher', () => ({ ESPACIO_PARA_LANZADOR: 0 }));
jest.mock('../../../../navigation/barraAlDesplazar/BarraInferior', () => ({ useOcultarBarraAlDesplazar: () => ({}) }));
jest.mock('../../../../hooks/useSystemBackHandler', () => ({ useSystemBackHandler: () => undefined }));

import { BarraDelLider } from '../MarcoDelLider';
import { CabeceraAdmin } from '../../../admin/components/CabeceraAdmin';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');

describe('la barra de las pantallas del líder', () => {
  it('es la cabecera «‹ Título» de Administración y su botón vuelve', () => {
    const volver = jest.fn();
    let r!: ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(React.createElement(BarraDelLider, { titulo: 'Todos los aprendices', onVolver: volver }));
    });
    expect(r.root.findAll((n: ReactTestInstance) => n.type === CabeceraAdmin)).toHaveLength(1);
    const texto = r.root
      .findAll((n: ReactTestInstance) => (n.type as unknown) === 'Text')
      .map((n: ReactTestInstance) => React.Children.toArray(n.props.children).join(''));
    expect(texto).toContain('Todos los aprendices');
    expect(texto).not.toContain('VOLVER');
    const boton = r.root.findAll((n: ReactTestInstance) => n.props.accessibilityLabel === 'Volver' && typeof n.props.onPress === 'function')[0];
    act(() => boton.props.onPress());
    expect(volver).toHaveBeenCalledTimes(1);
  });

  it('ninguna pantalla del líder dibuja «VOLVER» a mano', () => {
    for (const archivo of [
      'lider-mentores/components/MarcoDelLider.tsx',
      'lider-mentores/screens/AprendicesDelLiderScreen.tsx',
      'lider-mentores/screens/PersonaDelLiderScreen.tsx',
      'semaforo/screens/SemaforoGruposScreen.tsx',
    ]) {
      expect({ archivo, tieneVolver: />VOLVER</.test(leer(archivo)) }).toEqual({ archivo, tieneVolver: false });
    }
  });
});
