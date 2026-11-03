/**
 * El plazo de la formación en las pantallas que decían «90 días» a mano (issue #104). Se prueba lo que se lee, con el plazo de cada formación:
 * Escuela y Certificación «90 días», Diplomado «3 meses» o «1 año».
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

let mockPlazo = { plazo: '90 días', duracionDias: 90 };

jest.mock('../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../theme/tokens')>('../../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('../hooks/usePlazoDeLaSesion', () => ({ usePlazoDeLaSesion: () => mockPlazo }));
jest.mock('../../programa/components/BotonElegirDiaUno', () => ({ BotonElegirDiaUno: () => null }));

import { lineaDeLaTarjetaPendiente } from '../../diagnostico/utils/textosDelDiagnostico';
import { InvitacionProgramaPropio } from '../../programa/components/InvitacionProgramaPropio';
import { lineaObjetivoFijo } from '../../objetivos/utils/objetivoFijo';
import { subtituloDelAlumno } from '../../mentor/utils/subtituloDelAlumno';
import { tuPlazo } from '../utils/plazoEnFrases';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PLAZOS = ['90 días', '3 meses', '1 año'] as const;
let raiz: ReactTestRenderer | null = null;
afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('frases del plazo', () => {
  it('«tus 90 días», «tus 3 meses», «tu año»', () => {
    expect(PLAZOS.map(tuPlazo)).toEqual(['tus 90 días', 'tus 3 meses', 'tu año']);
  });

  it('la línea de la tarjeta del diagnóstico', () => {
    expect(PLAZOS.map(lineaDeLaTarjetaPendiente)).toEqual([
      'De él nacen tus objetivos de 90 días.',
      'De él nacen tus objetivos de 3 meses.',
      'De él nacen tus objetivos de 1 año.',
    ]);
  });

  it('el objetivo fijo sin plazo sigue diciendo 90 días; con plazo, el de la persona', () => {
    expect(lineaObjetivoFijo()).toBe('Tu objetivo de 90 días quedó fijo. Aquí solo anotas cuánto llevas.');
    expect(lineaObjetivoFijo('1 año')).toBe('Tu objetivo de 1 año quedó fijo. Aquí solo anotas cuánto llevas.');
  });

  it('la ficha del mentor no sabe la duración del aprendiz: dice el día, sin «de 90»', () => {
    expect(subtituloDelAlumno(12, null)).toBe('Día 12');
    expect(subtituloDelAlumno(12, null)).not.toMatch(/90/);
  });
});

describe('«Hacer mi programa de …» (la invitación del personal sin programa)', () => {
  it.each(PLAZOS)('con %s', plazo => {
    mockPlazo = { plazo, duracionDias: plazo === '1 año' ? 365 : 90 };
    act(() => {
      raiz = TestRenderer.create(
        React.createElement(InvitacionProgramaPropio, { programa: { alEmpezar: () => undefined, posponer: async () => undefined } as never }),
      );
    });
    const textos = raiz!.root.findAll(x => x.type === Text).map(x => [x.props.children].flat().join(''));
    expect(textos).toContain(`Hacer mi programa de ${plazo}`);
    if (plazo !== '90 días') expect(textos.join(' ')).not.toMatch(/90/);
  });
});
