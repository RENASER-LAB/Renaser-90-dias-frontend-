/**
 * Spec 027, P3 (FR-023): la persona relee, desde Yo → Mi onboarding → Términos y condiciones, la versión que aceptó: su número, el día y la firma, en solo
 * lectura, con el texto tal como lo aceptó.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { Text } from 'react-native';
import { Image } from 'expo-image';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {
    readonly status: number;
    constructor(status: number, message = 'x') {
      super(message);
      this.status = status;
    }
  }
  return { apiFetch: (...a: unknown[]) => mockApiFetch(...a), ApiError, mensajeDeError: (_e: unknown, texto: string) => texto };
});
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});

import { ApiError } from '../../../../services/http/apiClient';
import { leerTerminosAceptados } from '../api/terminosApi';
import { terminosAceptadosSchema } from '../api/terminosSchemas';
import { TerminosAceptadosVista } from '../components/TerminosAceptadosVista';
import { TITULO_DE_VISTA, vistaDeRegreso } from '../../../yo/utils/navegacionDeYo';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OBJETO = 'https://s3-renaser90dias.s3.us-east-1.amazonaws.com/onboarding/u-1/firma/f-9';
const VERSION = {
  id: 'v-1',
  formation: 'ESCUELA',
  state: 'PUBLICADA',
  number: 1,
  title: 'Términos y condiciones',
  introduction: 'Léelos con calma.',
  clauses: ['Primera cláusula', 'Segunda cláusula'],
  checkboxText: 'Acepto',
  asksNewAcceptance: false,
};
const ACEPTADOS = { version: VERSION, acceptedAt: '2026-10-31T15:00:00Z', signatureUrl: `${OBJETO}?X-Amz-Signature=abc` };

describe('leer lo que acepté', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('trae la versión, el día y el enlace de la firma', async () => {
    mockApiFetch.mockResolvedValue(ACEPTADOS);
    const lectura = await leerTerminosAceptados();
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/onboarding/terms/accepted', expect.anything());
    expect(lectura.tipo === 'listo' && lectura.aceptados.version.number).toBe(1);
    expect(lectura.tipo === 'listo' && lectura.aceptados.signatureUrl).toContain('X-Amz-Signature');
  });

  it('un 404 es «nunca aceptó»; la red, un 500 o una forma rara es «no se pudo leer», y no se confunden', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError(404, 'no'));
    expect((await leerTerminosAceptados()).tipo).toBe('nunca');
    mockApiFetch.mockRejectedValueOnce(new ApiError(500, 'no'));
    expect((await leerTerminosAceptados()).tipo).toBe('error');
    mockApiFetch.mockRejectedValueOnce(new Error('Network request failed'));
    expect((await leerTerminosAceptados()).tipo).toBe('error');
    mockApiFetch.mockResolvedValueOnce({ version: 'raro' });
    expect((await leerTerminosAceptados()).tipo).toBe('error');
  });

  it('un backend anterior no manda la firma y la lectura sigue sirviendo', () => {
    const sinFirma = terminosAceptadosSchema.parse({ version: VERSION, acceptedAt: '2026-10-31T15:00:00Z' });
    expect(sinFirma.signatureUrl ?? null).toBeNull();
  });
});

let raiz: ReactTestRenderer | null = null;
const textos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));
const firmas = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Image);

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
});

describe('la vista de solo lectura', () => {
  it('dice la versión y el día, muestra la firma y el texto como lo aceptó', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(TerminosAceptadosVista, { aceptados: ACEPTADOS }));
    });
    const dichos = textos(raiz!);
    expect(dichos).toContain('Versión 1');
    expect(dichos).toContain('Aceptada el 31 de octubre de 2026');
    expect(dichos).toContain('Términos y condiciones');
    expect(dichos).toContain('Léelos con calma.');
    expect(dichos).toContain('Primera cláusula');
    expect(dichos).toContain('Segunda cláusula');
    expect(firmas(raiz!)).toHaveLength(1);
    expect(firmas(raiz!)[0].props.source).toEqual({ uri: ACEPTADOS.signatureUrl, cacheKey: expect.not.stringContaining('X-Amz-Signature') });
  });

  it('sin firma, o con un enlace que no es de la red, no dibuja el recuadro de la firma pero sí lo demás', () => {
    for (const signatureUrl of [null, 'about:blank#pendiente-s3/x']) {
      act(() => {
        raiz = TestRenderer.create(React.createElement(TerminosAceptadosVista, { aceptados: { ...ACEPTADOS, signatureUrl } }));
      });
      expect(firmas(raiz!)).toHaveLength(0);
      expect(textos(raiz!)).toContain('Versión 1');
      act(() => raiz?.unmount());
      raiz = null;
    }
  });

  it('es de solo lectura: no hay ningún botón que acepte o firme', () => {
    act(() => {
      raiz = TestRenderer.create(React.createElement(TerminosAceptadosVista, { aceptados: ACEPTADOS }));
    });
    expect(raiz!.root.findAll(n => n.props.accessibilityRole === 'button' || typeof n.props.onPress === 'function')).toHaveLength(0);
  });
});

describe('dónde vive en Yo', () => {
  it('es una vista de Mi onboarding: vuelve a su lista y tiene título', () => {
    expect(vistaDeRegreso('terminos', 'hub')).toBe('onboarding');
    expect(vistaDeRegreso('terminos', 'main')).toBe('onboarding');
    expect(TITULO_DE_VISTA.terminos).toBe('Términos y condiciones');
  });

  it('la fila solo se dibuja si el servidor dice que aceptó unos, y no cuenta como etapa', () => {
    const yo = readFileSync(join(__dirname, '..', '..', '..', '..', 'screens', 'YoScreen.tsx'), 'utf8');
    expect(yo).toMatch(/useTerminosAceptados\(activeView === 'onboarding' \|\| activeView === 'terminos'\)/);
    expect(yo).toMatch(/terminosAceptados\?\.tipo === 'listo' \? \(\s*<Presionable[\s\S]*?setActiveView\('terminos'\)/);
    expect(yo).toMatch(/\{activeView === 'terminos' && \(/);
    expect(yo).toMatch(/<TerminosAceptadosVista aceptados=\{terminosAceptados\.aceptados\} \/>/);
    expect(yo).toContain('{etapasOnboarding.completadas} de {ONBOARDING_STAGES.length} etapas completadas');
  });
});
