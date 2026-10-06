/**
 * El ánimo del fénix sale del color que manda el servidor, y la cara de SER de los estados que el chat ya tiene.
 */
import { describe, expect, it } from '@jest/globals';

import { animoDelBotonDeSer, animoDelSemaforo } from '../utils/animoDelFenix';
import { estadoDeLaConversacion, planDelEstado } from '../utils/conversacionDeSer';

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

describe('estado de la conversación con SER', () => {
  const vacia = { texto: '', enProgreso: true };
  it('escuchando gana sobre todo lo demás', () => {
    expect(estadoDeLaConversacion({ escuchando: true, enviando: true, ultimaRespuesta: vacia })).toBe('escuchando');
  });
  it('enviando con la burbuja vacía es pensando; con texto llegando, hablando', () => {
    expect(estadoDeLaConversacion({ escuchando: false, enviando: true, ultimaRespuesta: vacia })).toBe('pensando');
    expect(
      estadoDeLaConversacion({ escuchando: false, enviando: true, ultimaRespuesta: { texto: 'Hola', enProgreso: true } }),
    ).toBe('hablando');
  });
  it('una respuesta fallida es error; sin nada en curso, reposo', () => {
    expect(
      estadoDeLaConversacion({ escuchando: false, enviando: false, ultimaRespuesta: { texto: '', error: 'Sin red' } }),
    ).toBe('error');
    expect(estadoDeLaConversacion({ escuchando: false, enviando: false, ultimaRespuesta: { texto: 'Listo' } })).toBe('reposo');
    expect(estadoDeLaConversacion({ escuchando: false, enviando: false, ultimaRespuesta: null })).toBe('reposo');
  });

  it('cada estado usa el contrato del .riv: thinking + trgThinking, boca al hablar, retry al fallar', () => {
    expect(planDelEstado('pensando', false)).toEqual({ expresion: 'thinking', hablar: false, disparo: 'think' });
    expect(planDelEstado('hablando', false)).toEqual({ expresion: 'happy', hablar: true, disparo: null });
    expect(planDelEstado('error', false).disparo).toBe('retry');
    expect(planDelEstado('reposo', false)).toEqual({ expresion: 'neutral', hablar: false, disparo: null });
  });

  it('con «reducir movimiento» solo cambia la cara: sin disparos ni boca', () => {
    for (const estado of ['escuchando', 'pensando', 'hablando', 'error'] as const) {
      const plan = planDelEstado(estado, true);
      expect(plan.disparo).toBeNull();
      expect(plan.hablar).toBe(false);
    }
    expect(planDelEstado('pensando', true).expresion).toBe('thinking');
  });
});
