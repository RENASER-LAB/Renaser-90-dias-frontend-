import { describe, expect, it } from '@jest/globals';

import { tocarEmpiezaAEscuchar } from '../rotuloDelOrbe';

/**
 * Qué toque del orbe vibra (rediseño de Hoy, 2026-10-05): solo el que EMPIEZA a escuchar. Una vibración
 * por acción y con un solo significado («te escucho»): ni el «ya terminé», ni el «cállate», ni el toque
 * que abre el chat escrito cuando no hay voz.
 */
describe('tocarEmpiezaAEscuchar', () => {
  it('en reposo y con voz: sí', () => {
    expect(tocarEmpiezaAEscuchar('reposo', true)).toBe(true);
  });

  it('con la conversación en curso o sin voz: no', () => {
    for (const fase of ['escuchando', 'pensando', 'hablando'] as const) {
      expect(tocarEmpiezaAEscuchar(fase, true)).toBe(false);
    }
    expect(tocarEmpiezaAEscuchar('reposo', false)).toBe(false);
  });
});
