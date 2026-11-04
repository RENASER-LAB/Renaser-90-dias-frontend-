import { describe, expect, it } from '@jest/globals';

import { PASOS_FICHA } from '../data/pasosFicha';

/**
 * La Ficha Inicial, donde se pide el «WhatsApp principal», dice en una frase para qué se usa y que se puede dar de baja (spec 041, FR-044; Ley 29733: la
 * finalidad se informa cuando se recoge el dato). Es un requisito de texto, no un bloqueo: el paso se completa igual que antes.
 */
describe('el paso «WhatsApp principal» de la Ficha Inicial', () => {
  const paso = PASOS_FICHA.find(p => p.id === 'whatsapp')!;

  // spec 041 FR-044
  it('dice que por ahí se le acompaña y se le recuerdan los eventos, y que puede darse de baja', () => {
    expect(paso.bajada).toBe('Por aquí te acompaña tu mentor y te recordamos tus eventos. Puedes darte de baja cuando quieras');
  });

  // spec 041 FR-044
  it('sigue siendo el mismo paso: su título y su capítulo no cambian', () => {
    expect(paso.titulo).toBe('WhatsApp principal');
    expect(paso.capitulo).toBe(0);
  });
});
