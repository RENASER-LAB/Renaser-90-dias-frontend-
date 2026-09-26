import { describe, expect, it } from '@jest/globals';

import { estaVencido, seRegistraConFoto } from '../registroConFotoEnTraining';

const EXIGE = { evidenceRequirement: 'REQUIRED', systemKey: null, dimension: 'CUERPO' };

describe('seRegistraConFoto', () => {
  it('abre la cámara directa para un hábito que exige evidencia', () => {
    expect(seRegistraConFoto(EXIGE, false)).toBe(true);
  });

  it('los de evidencia opcional siguen con el modal de las cuatro formas', () => {
    expect(seRegistraConFoto({ ...EXIGE, evidenceRequirement: 'OPTIONAL' }, false)).toBe(false);
    expect(seRegistraConFoto({ ...EXIGE, evidenceRequirement: undefined }, false)).toBe(false);
  });

  it('nunca toma los hábitos con flujo propio, aunque exijan evidencia', () => {
    for (const clave of ['DAILY_CLASS', 'AUDIO_THERAPY_WEEKLY', 'PASTILLA_RENACER', 'COMMUNITY_POST', 'WAKE_UP', 'SLEEP']) {
      expect(seRegistraConFoto({ ...EXIGE, systemKey: clave }, false)).toBe(false);
    }
  });

  it('una clave de sistema sin flujo propio no lo impide', () => {
    expect(seRegistraConFoto({ ...EXIGE, systemKey: 'COLD_SHOWER' }, false)).toBe(true);
  });

  it('en web cae al modal de siempre', () => {
    expect(seRegistraConFoto(EXIGE, true)).toBe(false);
  });

  it('las rocas de VIDA Y NEGOCIO no pasan por acá', () => {
    expect(seRegistraConFoto({ ...EXIGE, dimension: 'VIDA Y NEGOCIO' }, false)).toBe(false);
  });
});

describe('estaVencido', () => {
  it('EXPIRADO y FALLIDO ya no se pueden cerrar', () => {
    expect(estaVencido('EXPIRADO')).toBe(true);
    expect(estaVencido('FALLIDO')).toBe(true);
    expect(estaVencido('PENDIENTE')).toBe(false);
    expect(estaVencido(undefined)).toBe(false);
  });
});
