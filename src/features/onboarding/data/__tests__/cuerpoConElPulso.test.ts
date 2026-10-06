/**
 * Decisión del dueño (2026-10-05): Cuerpo y la salud se dibujan con el pulso (`activity`) en toda la
 * app, como en Training, Plan y el Mapa. El onboarding seguía con el monigote (`body`). Contra el
 * código anterior fallan las dos.
 */
import { describe, expect, it } from '@jest/globals';

import { BLOQUES_CUESTIONARIO_PROFUNDO } from '../bloquesCuestionarioProfundo';
import { CHAPTERS_CONFIG as CHAPTERS } from '../chaptersConfig';

describe('Cuerpo y salud en el onboarding usan el pulso', () => {
  it('el bloque «Cuerpo» del cuestionario profundo', () => {
    const cuerpo = BLOQUES_CUESTIONARIO_PROFUNDO.find(b => b.titulo === 'Cuerpo');
    expect(cuerpo?.icono).toBe('activity');
  });

  it('el capítulo «Descanso y salud» de la Ficha', () => {
    const salud = CHAPTERS.find(c => c.title === 'DESCANSO Y SALUD');
    expect(salud?.icon).toBe('activity');
  });
});
