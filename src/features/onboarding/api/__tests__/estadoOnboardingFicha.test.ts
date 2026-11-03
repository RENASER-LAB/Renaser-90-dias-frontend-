import { describe, expect, it } from '@jest/globals';

import { estadoOnboardingSchema, validarRespuesta } from '../onboardingSchemas';
import type { EstadoOnboardingApi } from '../../types/onboarding.types';

/** `GET /onboarding/state` suma `ficha` (spec 026): qué ficha de ingreso le toca. Ausente o desconocida = la estándar de siempre. */

const base = {
  userId: 'u-1',
  currentFlow: null,
  currentSection: null,
  currentStep: null,
  flowProgress: null,
  termsAcceptedAt: null,
  pactAcceptedAt: null,
  pactSignedAt: null,
  rocksSyncAcceptedAt: null,
  startedAt: null,
  lastActivityAt: null,
  completed: false,
  completedAt: null,
};
const leer = (extra: Record<string, unknown>) => validarRespuesta<EstadoOnboardingApi>(estadoOnboardingSchema, { ...base, ...extra }, 'GET /onboarding/state');

describe('el campo `ficha` del estado del onboarding', () => {
  it('CON_DIAGNOSTICO se respeta', () => {
    expect(leer({ ficha: 'CON_DIAGNOSTICO' }).ficha).toBe('CON_DIAGNOSTICO');
  });

  it('sin el campo (un backend anterior), con null o con algo desconocido es la ficha estándar', () => {
    expect(leer({}).ficha).toBe('ESTANDAR');
    expect(leer({ ficha: null }).ficha).toBe('ESTANDAR');
    expect(leer({ ficha: 'ESTANDAR' }).ficha).toBe('ESTANDAR');
    expect(leer({ ficha: 'OTRA_FICHA_DEL_FUTURO' }).ficha).toBe('ESTANDAR');
  });

  it('no rompe nada de lo demás: sigue leyendo lo de siempre y deja pasar los campos nuevos', () => {
    const estado = leer({ completed: true, termsAcceptedAt: '2026-10-30T10:00:00Z', campoNuevo: 1 });
    expect(estado.completed).toBe(true);
    expect(estado.termsAcceptedAt).toBe('2026-10-30T10:00:00Z');
    expect((estado as unknown as { campoNuevo: number }).campoNuevo).toBe(1);
  });
});
