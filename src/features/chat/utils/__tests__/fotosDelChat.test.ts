/**
 * Qué foto lleva cada cosa del chat (decisiones del dueño del 2026-09-27).
 *
 * Fallan contra el código viejo: la comunidad mostraba la tarjeta sin nombre (8971acf) y la info del
 * grupo mostraba la foto subida o las iniciales de cada integrante, nunca su tarjeta.
 */
import { describe, expect, it } from '@jest/globals';

import { fotoDeLaConversacion, fotoDelIntegrante } from '../fotosDelChat';

const RUTA_DEL_SOPORTE = '/api/v1/chat/conversations/s-1/foto';
const RUTA_DE_RICARDO = '/api/v1/chat/conversations/g-1/miembros/u-ricardo/foto';

describe('fotoDeLaConversacion', () => {
  it('la comunidad vuelve al fénix (D-206: la plantilla era solo para el grupo y el soporte)', () => {
    expect(fotoDeLaConversacion('global')).toBe('fenix');
    expect(fotoDeLaConversacion('global', RUTA_DEL_SOPORTE)).toBe('fenix');
  });

  it('el grupo lleva la tarjeta sin nombre', () => {
    expect(fotoDeLaConversacion('celula')).toBe('tarjeta-sin-nombre');
  });

  it('el soporte, la tarjeta con el nombre de su aprendiz si llega la ruta; si no, la sin nombre', () => {
    expect(fotoDeLaConversacion('soporte', RUTA_DEL_SOPORTE)).toBe('tarjeta-con-nombre');
    expect(fotoDeLaConversacion('soporte', null)).toBe('tarjeta-sin-nombre');
    expect(fotoDeLaConversacion('soporte', '  ')).toBe('tarjeta-sin-nombre');
  });

  it('un 1 a 1, la persona (su foto o sus iniciales)', () => {
    expect(fotoDeLaConversacion('direct')).toBe('persona');
  });
});

describe('fotoDelIntegrante: una sola regla para los dos modos del servidor', () => {
  it('si llega la ruta de su tarjeta, la tarjeta, aunque haya subido foto (modo TARJETA)', () => {
    expect(fotoDelIntegrante({ fotoPath: RUTA_DE_RICARDO, avatarUrl: 'https://s3/avatares/ricardo.jpg' })).toBe(
      'tarjeta-con-nombre'
    );
    expect(fotoDelIntegrante({ fotoPath: RUTA_DE_RICARDO, avatarUrl: null })).toBe('tarjeta-con-nombre');
  });

  it('sin la ruta, su foto subida (modo FOTO_SUBIDA, o un servidor que todavía no la manda)', () => {
    expect(fotoDelIntegrante({ fotoPath: null, avatarUrl: 'https://s3/avatares/ana.jpg' })).toBe('foto-subida');
    expect(fotoDelIntegrante({ avatarUrl: 'https://s3/avatares/ana.jpg' })).toBe('foto-subida');
  });

  it('sin ruta ni foto, las iniciales; un texto en blanco no cuenta', () => {
    expect(fotoDelIntegrante({ fotoPath: null, avatarUrl: null })).toBe('iniciales');
    expect(fotoDelIntegrante({ fotoPath: ' ', avatarUrl: '' })).toBe('iniciales');
  });
});
