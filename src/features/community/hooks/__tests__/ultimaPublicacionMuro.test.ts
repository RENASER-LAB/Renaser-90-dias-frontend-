import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../../../services/http/apiClient', () => ({ apiFetch: jest.fn() }));

import { lecturaVigente, VIGENCIA_ULTIMA_PUBLICACION_MS } from '../useUltimaPublicacionMuro';

/**
 * Hoy repedía la página entera del Muro cada vez que recibía el foco, para mostrar UNA
 * publicación (26/09/2026). Ahora reusa la lectura mientras esté vigente.
 */
describe('lecturaVigente', () => {
  const leidaEn = 1_000_000;

  it('sin lectura previa, hay que pedir', () => {
    expect(lecturaVigente(null, leidaEn)).toBe(false);
  });

  it('volver a Hoy al rato reusa la lectura', () => {
    expect(lecturaVigente(leidaEn, leidaEn + 30_000)).toBe(true);
  });

  it('pasada la vigencia, se vuelve a pedir', () => {
    expect(lecturaVigente(leidaEn, leidaEn + VIGENCIA_ULTIMA_PUBLICACION_MS)).toBe(false);
  });
});
