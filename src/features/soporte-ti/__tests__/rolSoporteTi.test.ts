/**
 * El rol Soporte TI (spec 002, contrato §8): se llama «Soporte TI» donde la app muestra roles (Administración, chat,
 * muro) y NO se puede dar desde la app: no está en `ROLES_ASIGNABLES`.
 */
import { describe, expect, it } from '@jest/globals';

import { etiquetaDeRol, ROLES_ASIGNABLES } from '../../admin/utils/rolesAsignables';
import { integrantesDelChat } from '../../chat/utils/infoDelChat';
import { mapearReaccion } from '../../community/api/wallMappers';
import { esSoporteTi } from '../utils/rolSoporteTi';

describe('rol Soporte TI', () => {
  it('se llama «Soporte TI» en los dos idiomas', () => {
    expect(etiquetaDeRol('IT_SUPPORT')).toBe('Soporte TI');
    expect(etiquetaDeRol('SOPORTE_TI')).toBe('Soporte TI');
  });

  it('no se puede asignar: no está en ROLES_ASIGNABLES (ni al aprobar ni en Equipo y roles)', () => {
    const claves = ROLES_ASIGNABLES.map(r => r.clave as string);
    expect(claves).not.toContain('IT_SUPPORT');
    expect(claves).not.toContain('SOPORTE_TI');
    expect(ROLES_ASIGNABLES.map(r => r.etiqueta)).not.toContain('Soporte TI');
    expect(ROLES_ASIGNABLES).toHaveLength(6);
  });

  it('esSoporteTi reconoce los dos nombres, sin importar mayúsculas, y nada más', () => {
    expect(esSoporteTi('IT_SUPPORT')).toBe(true);
    expect(esSoporteTi('soporte_ti')).toBe(true);
    for (const rol of ['ADMIN', 'ALCHEMIST', 'MENTOR', 'TRAINEE', '', null, undefined]) {
      expect(esSoporteTi(rol)).toBe(false);
    }
  });

  it('en la info de un chat y en quién reaccionó al muro', () => {
    const filas = integrantesDelChat({
      participantes: [{ userId: 'u-1', nombre: 'Ricardo', rol: 'SOPORTE_TI', esUnoMismo: false }],
      tipo: 'global',
      miRol: 'TRAINEE',
    });
    expect(filas[0].rol).toBe('Soporte TI');
    expect(mapearReaccion({ userId: 'u-1', name: 'Ricardo', role: 'IT_SUPPORT', avatarUrl: null } as Parameters<typeof mapearReaccion>[0]).role).toBe(
      'Soporte TI',
    );
  });
});
