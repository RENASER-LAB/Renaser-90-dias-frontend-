import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockApiFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('../../../../services/http/apiClient', () => ({
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
  ApiError: class ApiError extends Error {},
  mensajeDeError: (_e: unknown, texto: string) => texto,
}));

import { aceptarHito } from '../../api/onboardingApi';
import { leerConstanciaDeUnaPersona, leerMisTerminos, publicarTerminos, guardarBorradorDeTerminos } from '../api/terminosApi';
import { debeAceptarAntesDeEntrar, explicacionDeLaAceptacion, titularDeLaAceptacion } from '../utils/pendienteDeTerminos';
import { estadoDeLaFormacion, fechaDeVersion, lineaDelHistorial, textoDeAceptantes } from '../utils/estadoDeLosTerminos';

const version = { id: 'v-2', formation: 'ESCUELA', state: 'PUBLICADA', number: 2, title: 'Términos y condiciones', introduction: '', clauses: ['Una'], checkboxText: 'Acepto', asksNewAcceptance: true };

describe('aceptar los términos con su versión (FR-011, FR-012)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ completed: false });
  });

  it('el hito de Términos lleva la versión que la persona leyó', async () => {
    await aceptarHito('TERMINOS', 'v-2').catch(() => undefined);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/onboarding/milestones', { method: 'POST', body: { milestone: 'TERMINOS', termsVersionId: 'v-2' } });
  });

  it('sin versión (un servidor anterior, o los hitos del Pacto) manda solo el hito, como siempre', async () => {
    await aceptarHito('PACTO').catch(() => undefined);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/onboarding/milestones', { method: 'POST', body: { milestone: 'PACTO' } });
  });
});

describe('leer los términos de mi formación', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('lee la versión vigente y qué se me pide', async () => {
    mockApiFetch.mockResolvedValue({ formation: { code: 'ESCUELA', name: 'Escuela Renaser' }, version, pending: 'NEW_VERSION', blocks: true, lastAcceptedNumber: 1, changeNote: 'Cambió el reembolso' });
    const terminos = await leerMisTerminos();
    expect(terminos?.version?.number).toBe(2);
    expect(terminos?.blocks).toBe(true);
    expect(debeAceptarAntesDeEntrar(terminos)).toBe(true);
    expect(titularDeLaAceptacion(terminos!)).toBe('Actualizamos nuestros términos');
    expect(explicacionDeLaAceptacion(terminos!)).toContain('de nuevo');
  });

  it('tolera un campo de más; uno roto pierde la lectura, no la pantalla', async () => {
    mockApiFetch.mockResolvedValue({ formation: { code: 'ESCUELA', name: 'Escuela Renaser', extra: 1 }, version: 'raro', pending: 'NONE', blocks: false, nuevo: true });
    const terminos = await leerMisTerminos();
    expect(terminos?.version).toBeNull();
    expect(debeAceptarAntesDeEntrar(terminos)).toBe(false);
  });

  it('un servidor anterior (404), sin red o con una respuesta rara es «no lo ofrece»: null, y la app usa su texto', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('404'));
    expect(await leerMisTerminos()).toBeNull();
    mockApiFetch.mockResolvedValueOnce({ otra: 'cosa' });
    expect(await leerMisTerminos()).toBeNull();
    expect(debeAceptarAntesDeEntrar(null)).toBe(false);
  });

  it('el primer ingreso no bloquea (lo lleva el onboarding); entrar a otra formación sí, con su propio titular', async () => {
    mockApiFetch.mockResolvedValue({ formation: { code: 'DIPLOMADO', name: 'Diplomado Renaser' }, version, pending: 'FIRST_TIME', blocks: false });
    expect(debeAceptarAntesDeEntrar(await leerMisTerminos())).toBe(false);
    mockApiFetch.mockResolvedValue({ formation: { code: 'DIPLOMADO', name: 'Diplomado Renaser' }, version, pending: 'FIRST_IN_FORMATION', blocks: true });
    const nueva = await leerMisTerminos();
    expect(debeAceptarAntesDeEntrar(nueva)).toBe(true);
    expect(titularDeLaAceptacion(nueva!)).toBe('Términos de Diplomado Renaser');
    expect(explicacionDeLaAceptacion(nueva!)).toContain('Entras a Diplomado Renaser');
  });
});

describe('Administración', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('guarda el borrador con la base que tenía a la vista, y publica con su nota y si pide aceptar de nuevo', async () => {
    mockApiFetch.mockResolvedValue({ ...version, state: 'BORRADOR', number: null });
    await guardarBorradorDeTerminos('ESCUELA', { title: 'T', introduction: '', clauses: ['Una'], checkboxText: 'Acepto' }, 1);
    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/admin/terms/ESCUELA/draft', {
      method: 'PUT',
      body: { title: 'T', introduction: '', clauses: ['Una'], checkboxText: 'Acepto', baseNumber: 1 },
    });
    mockApiFetch.mockResolvedValue(version);
    await publicarTerminos('ESCUELA', 'Cambió el reembolso', true, 1);
    expect(mockApiFetch).toHaveBeenLastCalledWith('/api/v1/admin/terms/ESCUELA/publish', {
      method: 'POST',
      body: { note: 'Cambió el reembolso', asksNewAcceptance: true, baseNumber: 1 },
    });
  });

  it('la constancia de una persona: la lista, o vacía si no se ofrece', async () => {
    mockApiFetch.mockResolvedValueOnce([{ formation: 'ESCUELA', number: 1, acceptedAt: '2026-10-31T15:00:00Z', signatureUrl: 'https://x' }]);
    expect(await leerConstanciaDeUnaPersona('p-1')).toHaveLength(1);
    mockApiFetch.mockRejectedValueOnce(new Error('404'));
    expect(await leerConstanciaDeUnaPersona('p-1')).toEqual([]);
  });

  it('lo que dice la lista de formaciones: la vigente, o «Por revisar»', () => {
    const publicada = { formation: 'ESCUELA', name: 'Escuela Renaser', current: { ...version, publishedAt: '2026-10-31T15:00:00Z' }, hasDraft: true, acceptedCount: 12, needsReview: false };
    expect(estadoDeLaFormacion(publicada)).toEqual({ titulo: 'Versión 2 · publicada el 31 oct 2026', detalle: 'Hay un borrador sin publicar.', porRevisar: false });
    const porRevisar = estadoDeLaFormacion({ formation: 'DIPLOMADO', name: 'Diplomado Renaser', current: null, hasDraft: true, acceptedCount: 0, needsReview: true });
    expect(porRevisar.titulo).toBe('Por revisar');
    expect(porRevisar.porRevisar).toBe(true);
    expect(textoDeAceptantes(0)).toBe('Nadie la aceptó todavía');
    expect(textoDeAceptantes(1)).toBe('1 persona la aceptó');
    expect(textoDeAceptantes(12)).toBe('12 personas la aceptaron');
    expect(lineaDelHistorial({ ...version, publishedAt: '2026-10-31T15:00:00Z' }, 'Ana', 12)).toBe('Versión 2 · 31 oct 2026 · Ana · 12 personas la aceptaron');
    expect(fechaDeVersion(null)).toBe('');
  });
});
