import { describe, expect, it } from '@jest/globals';

import { CATEGORIA_CARRERA, CATEGORIA_CARRERA_EN_PAUSA } from '../avisoDeCarrera';
import { contenidoDeLaNotificacion, laCarreraYaEmpezo } from '../notificacionUnica';

describe('la notificación única de la carrera', () => {
  // spec 042 FR-011
  it('corriendo: «Carrera en curso», los km, el tiempo y el ritmo, con «Pausar» y «Abrir»', () => {
    const c = contenidoDeLaNotificacion({ metros: 3250, activoMs: 1_264_000, ritmo: 389, enPausa: false }, '00:21:04');
    expect(c.title).toBe('Carrera en curso');
    expect(c.body).toBe('3,25 km · 00:21:04 · 6:29 min/km');
    expect(c.categoryIdentifier).toBe(CATEGORIA_CARRERA);
  });

  // spec 042 FR-011
  it('en pausa: lo dice en el título y lleva «Seguir» en lugar de «Pausar»', () => {
    const c = contenidoDeLaNotificacion({ metros: 1000, activoMs: 300_000, ritmo: null, enPausa: true }, '00:05:00');
    expect(c.title).toBe('Carrera en pausa');
    expect(c.categoryIdentifier).toBe(CATEGORIA_CARRERA_EN_PAUSA);
    expect(c.categoryIdentifier).not.toBe(CATEGORIA_CARRERA);
  });

  // spec 042 FR-011
  it('durante la cuenta regresiva no se publica (la carrera existe, en pausa, pero no empezó)', () => {
    expect(laCarreraYaEmpezo(null)).toBe(false);
    expect(laCarreraYaEmpezo({ desdeMs: null, activoAcumuladoMs: 0 })).toBe(false);
    expect(laCarreraYaEmpezo({ desdeMs: 1000, activoAcumuladoMs: 0 })).toBe(true);
    expect(laCarreraYaEmpezo({ desdeMs: null, activoAcumuladoMs: 4200 })).toBe(true);
  });
});
