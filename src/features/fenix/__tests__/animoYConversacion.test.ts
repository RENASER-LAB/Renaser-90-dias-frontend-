/**
 * El ánimo del fénix sale del color que manda el servidor, y su cara de las fases que la voz de Hoy ya tiene.
 */
import { describe, expect, it } from '@jest/globals';

import { animoDelBotonDeSer, animoDelSemaforo } from '../utils/animoDelFenix';
import { planDelEstado } from '../utils/conversacionDeSer';

describe('semáforo → ánimo', () => {
  it('VERDE alegre, AMARILLO serio, ROJO triste, SIN_DATOS neutral', () => {
    expect(animoDelSemaforo('VERDE')).toBe('alegre');
    expect(animoDelSemaforo('AMARILLO')).toBe('serio');
    expect(animoDelSemaforo('ROJO')).toBe('triste');
    expect(animoDelSemaforo('SIN_DATOS')).toBe('neutral');
  });

  it('sin dato (null, undefined) es neutral: nunca alegre por falta de datos', () => {
    expect(animoDelSemaforo(null)).toBe('neutral');
    expect(animoDelSemaforo(undefined)).toBe('neutral');
  });

  it('el botón de SER de quien no se mide (staff) es neutral aunque haya un color', () => {
    expect(animoDelBotonDeSer(false, 'ROJO')).toBe('neutral');
    expect(animoDelBotonDeSer(false, 'VERDE')).toBe('neutral');
    expect(animoDelBotonDeSer(true, 'ROJO')).toBe('triste');
  });
});

describe('la fase de la voz en el fénix del centro', () => {
  it('cada estado usa el contrato del .riv: thinking + trgThinking, boca y trgExplain al hablar, retry al fallar', () => {
    expect(planDelEstado('pensando', false)).toMatchObject({ expresion: 'thinking', hablar: false, disparo: 'think' });
    expect(planDelEstado('hablando', false)).toMatchObject({ expresion: 'happy', hablar: true, disparo: 'explain' });
    expect(planDelEstado('error', false).disparo).toBe('retry');
    expect(planDelEstado('reposo', false)).toMatchObject({ expresion: 'neutral', hablar: false, disparo: null, vaiven: null });
  });

  // 2026-10-07, queja del dueño: «no se está usando el movimiento cuando te escucha, piensa y habla». Cada fase tiene
  // que sostener movimiento MIENTRAS dura, no solo cambiar la cara una vez.
  it('escuchando: se inclina hacia ti, te mira de frente sin mirar a otro lado y ladea la cabeza de un lado al otro', () => {
    const plan = planDelEstado('escuchando', false);
    expect(plan.expresion).toBe('curious');
    expect(plan.pose.bodyLean).toBeGreaterThan(0.2);
    expect(plan.pose).toMatchObject({ gazeX: 0, gazeY: 0 });
    expect(plan.miradaAutonoma).toBeLessThanOrEqual(0.15);
    const ladeos = plan.vaiven!.pasos.map(p => p.headRoll!);
    expect(Math.max(...ladeos) - Math.min(...ladeos)).toBeGreaterThanOrEqual(0.3);
    expect(plan.parpadeoCadaMs).not.toBeNull();
    expect(plan.nivelDeVoz).toBe(true);
  });

  it('pensando: mira arriba y alterna a cada lado, con trgThinking repetido mientras dure y energía baja', () => {
    const plan = planDelEstado('pensando', false);
    expect(plan.pose.gazeY).toBeCloseTo(0.6);
    expect(plan.vaiven!.pasos.map(p => p.gazeX)).toEqual([0.4, -0.4]);
    expect(plan.repetirDisparoMs).toBeLessThanOrEqual(3000);
    expect(plan.energia).toBeLessThan(0.5);
  });

  it('hablando: boca, alas que acompañan alternadas y mirada al frente', () => {
    const plan = planDelEstado('hablando', false);
    expect(plan.hablar).toBe(true);
    expect(plan.pose).toMatchObject({ gazeX: 0, gazeY: 0 });
    const [uno, dos] = plan.vaiven!.pasos;
    expect(uno.wingL! - uno.wingR!).toBeGreaterThan(0.1);
    expect(dos.wingR! - dos.wingL!).toBeGreaterThan(0.1);
  });

  it('con «reducir movimiento»: una pose quieta por fase, sin disparos, boca, vaivén, parpadeos ni micrófono', () => {
    for (const estado of ['escuchando', 'pensando', 'hablando', 'error'] as const) {
      const plan = planDelEstado(estado, true);
      expect(plan).toMatchObject({ disparo: null, hablar: false, vaiven: null, parpadeoCadaMs: null, nivelDeVoz: false });
      expect(plan.pose).toEqual(planDelEstado(estado, false).pose);
    }
    expect(planDelEstado('pensando', true).expresion).toBe('thinking');
  });
});
