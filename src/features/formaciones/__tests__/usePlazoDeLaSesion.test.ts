/**
 * El plazo de la sesión para el onboarding (issue #103): sale de la formación de la persona, con el mismo `plazoDelObjetivo` de «Tu programa empieza mañana».
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

let mockFormacion: unknown = null;
jest.mock('../context/FormacionContext', () => ({
  useFormacionDeLaSesion: () => ({ formacion: mockFormacion, elegir: async () => undefined, recargar: async () => undefined }),
}));

import { usePlazoDeLaSesion } from '../hooks/usePlazoDeLaSesion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function leer(formacion: unknown) {
  mockFormacion = formacion;
  let visto: ReturnType<typeof usePlazoDeLaSesion> | null = null;
  function Sonda() {
    visto = usePlazoDeLaSesion();
    return null;
  }
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(Sonda));
  });
  act(() => raiz.unmount());
  return visto!;
}

const deLaFormacion = (codigo: string, duracionDias: number) => ({ activa: { codigo, nombre: codigo }, duracionDias });

describe('usePlazoDeLaSesion', () => {
  it('Escuela y Certificación: 90 días', () => {
    expect(leer(deLaFormacion('ESCUELA', 90))).toEqual({ plazo: '90 días', duracionDias: 90 });
    expect(leer(deLaFormacion('CERTIFICACION', 90))).toEqual({ plazo: '90 días', duracionDias: 90 });
  });

  it('Diplomado: 3 meses o 1 año, con el último día de SU programa', () => {
    expect(leer(deLaFormacion('DIPLOMADO', 90))).toEqual({ plazo: '3 meses', duracionDias: 90 });
    expect(leer(deLaFormacion('DIPLOMADO', 365))).toEqual({ plazo: '1 año', duracionDias: 365 });
  });

  it('sin formación conocida (servidor anterior o sin leer): el de siempre, 90 días', () => {
    expect(leer(null)).toEqual({ plazo: '90 días', duracionDias: 90 });
  });
});
