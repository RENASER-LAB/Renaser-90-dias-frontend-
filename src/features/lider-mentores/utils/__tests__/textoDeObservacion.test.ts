import { describe, expect, it } from '@jest/globals';

import { avisoAlGuardarObservacion, encabezadoDeLaObservacion, textoParaElChat, type SobreUnaPersona } from '../textoDeObservacion';

/**
 * El mensaje que el líder le manda al mentor cuando la observación es sobre una persona (spec 005, FR-014,
 * R-7): «empieza con el nombre de la persona» y dice qué semana es, para que el mentor sepa de quién y de
 * cuándo se habla sin abrir nada. Sin persona, el texto va tal como lo escribió (RL-14: exactamente lo que
 * el líder confirmó).
 */

const ANA: SobreUnaPersona = {
  personaId: 'p1',
  nombre: 'Ana Pérez',
  semanaDesde: '2026-10-17',
  semanaHasta: '2026-10-23',
};

describe('el texto que va por el chat', () => {
  it('sin persona: exactamente lo escrito, sin espacios de más (la observación de siempre)', () => {
    expect(textoParaElChat('  Muy bien el grupo  ')).toBe('Muy bien el grupo');
  });

  it('con persona: empieza con su nombre y la semana, y sigue lo escrito en otra línea', () => {
    expect(textoParaElChat('Ana lleva tres días sin el ritual de la mañana.', ANA)).toBe(
      'Ana Pérez · semana del sábado 17 al viernes 23 de octubre\nAna lleva tres días sin el ritual de la mañana.',
    );
  });

  it('cuando la semana cruza de mes dice los dos meses', () => {
    expect(
      textoParaElChat('Hola', { ...ANA, semanaDesde: '2026-09-26', semanaHasta: '2026-10-02' }),
    ).toBe('Ana Pérez · semana del sábado 26 de septiembre al viernes 2 de octubre\nHola');
  });

  it('una persona sin nombre no deja el encabezado vacío', () => {
    expect(textoParaElChat('Hola', { ...ANA, nombre: '' }).startsWith('Esta persona · semana')).toBe(true);
  });
});

describe('el aviso al guardar', () => {
  it('sin chat, con chat, y con chat que falló (la observación se guarda igual)', () => {
    expect(avisoAlGuardarObservacion(false, false)).toBe('Observación guardada.');
    expect(avisoAlGuardarObservacion(true, true)).toBe('Observación guardada y enviada por el chat.');
    expect(avisoAlGuardarObservacion(true, false)).toBe('Observación guardada. No se pudo enviar por el chat.');
  });
});

describe('el encabezado de una observación en la ficha del mentor', () => {
  const base = { createdAt: '2026-10-05T14:00:00Z', type: 'ALERTA' as const, sentByChat: false };

  it('las de antes (sin persona) se leen igual que siempre', () => {
    expect(encabezadoDeLaObservacion(base)).toBe('5 oct · Alerta');
    expect(encabezadoDeLaObservacion({ ...base, sentByChat: true })).toBe('5 oct · Alerta · enviada');
  });

  it('las que son sobre una persona la nombran', () => {
    expect(encabezadoDeLaObservacion({ ...base, personName: 'Ana Pérez' })).toBe('5 oct · Alerta · sobre Ana Pérez');
    expect(encabezadoDeLaObservacion({ ...base, personName: 'Ana Pérez', sentByChat: true })).toBe(
      '5 oct · Alerta · sobre Ana Pérez · enviada',
    );
    expect(encabezadoDeLaObservacion({ ...base, personName: '  ' })).toBe('5 oct · Alerta');
  });
});
