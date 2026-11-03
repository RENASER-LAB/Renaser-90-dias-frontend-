/**
 * Spec 039 (Acuerdo de transformación): lo que se le mostró a la persona en «Mi aceptación» cuando aceptó queda a la vista — en Yo → Mi onboarding → Términos y condiciones
 * (ella) y en la constancia de su ficha (Administración) —: el programa, el inicio, el fin (el cronograma de pagos ya no se firma con los términos: decisión 2026-11-02 pagos fuera de términos). Lo aceptado antes de esa spec
 * no lo guardó y se ve igual que siempre.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

const mockLeerConstancia = jest.fn<(personaId: string) => Promise<unknown[]>>();

jest.mock('../../../../services/http/apiClient', () => {
  class ApiError extends Error {}
  return { apiFetch: jest.fn(), ApiError, mensajeDeError: (_e: unknown, texto: string) => texto };
});
jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../api/terminosApi', () => ({
  leerConstanciaDeUnaPersona: (personaId: string) => mockLeerConstancia(personaId),
}));

import { ConstanciaDeTerminos } from '../components/ConstanciaDeTerminos';
import { TerminosAceptadosVista } from '../components/TerminosAceptadosVista';
import { terminosAceptadosSchema } from '../api/terminosSchemas';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VERSION = {
  id: 'v-2',
  formation: 'ESCUELA',
  state: 'PUBLICADA',
  number: 2,
  title: 'Términos y condiciones',
  introduction: 'Al inscribirme en Formación RENASER, …',
  clauses: ['Primera cláusula'],
  checkboxText: 'Acepto',
  asksNewAcceptance: true,
};

let raiz: ReactTestRenderer | null = null;
const textos = (r: ReactTestRenderer) => r.root.findAll(n => n.type === Text).map(n => [n.props.children].flat().join(''));

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockLeerConstancia.mockReset();
});

// decisión 2026-11-02 pagos fuera de términos
describe('releer lo que acepté', () => {
  it('con lo que se le mostró: el programa y el periodo; aunque un servidor de antes diga `scheduleSigned`, no se dice nada del cronograma', () => {
    const aceptados = terminosAceptadosSchema.parse({
      version: VERSION,
      acceptedAt: '2026-11-02T20:00:00Z',
      agreement: { program: 'Formación RENASER · 90 días', startDate: '2026-11-03', endDate: '2027-01-31', scheduleSigned: true },
    });
    act(() => {
      raiz = TestRenderer.create(React.createElement(TerminosAceptadosVista, { aceptados }));
    });
    const dichos = textos(raiz!);
    expect(dichos).toContain('Formación RENASER · 90 días');
    expect(dichos).toContain('Del 3 de noviembre de 2026 al 31 de enero de 2027');
    expect(dichos.join(' ')).not.toContain('cronograma');
  });

  it('con `scheduleSigned: false` tampoco lo dice; y lo aceptado antes de la spec 039 se ve como siempre', () => {
    const sinCronograma = terminosAceptadosSchema.parse({
      version: VERSION,
      acceptedAt: '2026-11-02T20:00:00Z',
      agreement: { program: 'Formación RENASER · 90 días', startDate: '2026-11-03', endDate: '2027-01-31', scheduleSigned: false },
    });
    act(() => {
      raiz = TestRenderer.create(React.createElement(TerminosAceptadosVista, { aceptados: sinCronograma }));
    });
    expect(textos(raiz!).join(' ')).not.toContain('cronograma');
    act(() => raiz?.unmount());

    const deAntes = terminosAceptadosSchema.parse({ version: VERSION, acceptedAt: '2026-11-02T20:00:00Z' });
    act(() => {
      raiz = TestRenderer.create(React.createElement(TerminosAceptadosVista, { aceptados: deAntes }));
    });
    const dichos = textos(raiz!);
    expect(dichos.some(t => t.startsWith('Aceptada el'))).toBe(true);
    // (La introducción del texto de los términos sí dice «Formación RENASER»; lo que no sale es la línea del programa del acuerdo.)
    expect(dichos.join(' ')).not.toContain('Formación RENASER · 90 días');
    expect(dichos.join(' ')).not.toContain('Del ');
  });
});

// decisión 2026-11-02 pagos fuera de términos
describe('la constancia en la ficha de la persona (Administración)', () => {
  const montar = async (lista: unknown[]) => {
    mockLeerConstancia.mockResolvedValue(lista);
    await act(async () => {
      raiz = TestRenderer.create(React.createElement(ConstanciaDeTerminos, { personaId: 'p-1' }));
    });
  };

  it('dice qué aceptó, el programa y las fechas que firmó; no dice nada del cronograma aunque un servidor de antes mande `scheduleSigned`', async () => {
    await montar([
      {
        formation: 'ESCUELA',
        number: 2,
        acceptedAt: '2026-11-02T20:00:00Z',
        signatureUrl: null,
        program: 'Formación RENASER · 90 días',
        startDate: '2026-11-03',
        endDate: '2027-01-31',
        scheduleSigned: true,
      },
    ]);
    const dichos = textos(raiz!);
    expect(dichos.some(t => t.includes('versión 2'))).toBe(true);
    expect(dichos).toContain('Programa: Formación RENASER · 90 días');
    expect(dichos).toContain('Del 3 de noviembre de 2026 al 31 de enero de 2027');
    expect(dichos.join(' ')).not.toContain('cronograma');
  });

  it('una aceptación de antes de la spec 039 solo dice qué versión aceptó', async () => {
    await montar([{ formation: 'ESCUELA', number: 1, acceptedAt: '2026-09-01T15:00:00Z', signatureUrl: null }]);
    const dichos = textos(raiz!).join(' ');
    expect(dichos).toContain('versión 1');
    expect(dichos).not.toContain('Programa:');
    expect(dichos).not.toContain('cronograma');
  });
});
