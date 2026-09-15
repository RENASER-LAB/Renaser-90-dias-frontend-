/**
 * Las filas de la sección «Staff».
 *
 * La propiedad que estas pruebas protegen es una sola, y es la que estaba rota:
 * **el rol que se muestra tiene que salir de la respuesta, no de en qué lista apareció la
 * persona.** Mientras el panel solo listaba `/admin/trainees` y `/admin/cells/mentores`, el rol
 * era una constante escrita a mano en el `map` (`rol: 'TRAINEE'`, `rol: 'MENTOR'`), y por eso
 * un líder de mentores o un administrador no se veían en ningún lado. El primer caso de abajo
 * falla contra cualquier versión que vuelva a fijar el rol a mano.
 */
import { describe, expect, it } from '@jest/globals';

import { etiquetaDeEstadoDeCuenta, personaDeStaff, ROLES_SOLO_EN_STAFF } from '../staff';

const base = {
  id: 'u-1',
  email: 'ana@renaser.test',
  role: 'MENTOR_LEAD',
  status: 'ACTIVE',
  fullName: 'Ana Pérez',
  avatarUrl: null,
  bio: null,
  department: null,
};

describe('personaDeStaff', () => {
  it('toma el rol de la respuesta, sea cual sea', () => {
    expect(personaDeStaff({ ...base, role: 'MENTOR_LEAD' }).rol).toBe('MENTOR_LEAD');
    expect(personaDeStaff({ ...base, role: 'ADMIN' }).rol).toBe('ADMIN');
    expect(personaDeStaff({ ...base, role: 'ALCHEMIST' }).rol).toBe('ALCHEMIST');
  });

  /* Un rol que esta versión no conoce se muestra tal cual en vez de caer a uno conocido: fingir
     que un `ASSISTANT` es un aprendiz sería exactamente el bug que esta pantalla vino a cerrar. */
  it('no traduce un rol desconocido a uno conocido', () => {
    expect(personaDeStaff({ ...base, role: 'ASSISTANT' }).rol).toBe('ASSISTANT');
  });

  it('con la cuenta activa, la línea de abajo es solo el correo', () => {
    expect(personaDeStaff({ ...base, status: 'ACTIVE' }).detalle).toBe('ana@renaser.test');
  });

  it('avisa cuando la cuenta está suspendida o sin aprobar', () => {
    expect(personaDeStaff({ ...base, status: 'SUSPENDED' }).detalle).toBe(
      'Cuenta suspendida · ana@renaser.test',
    );
    expect(personaDeStaff({ ...base, status: 'INACTIVE' }).detalle).toBe(
      'Sin aprobar todavía · ana@renaser.test',
    );
  });

  it('dice qué falta en vez de inventarlo', () => {
    expect(personaDeStaff({ ...base, fullName: null }).nombre).toBe('Sin nombre');
    expect(personaDeStaff({ ...base, fullName: '   ' }).nombre).toBe('Sin nombre');
    expect(personaDeStaff({ ...base, email: null }).detalle).toBe('Sin correo');
  });
});

describe('etiquetaDeEstadoDeCuenta', () => {
  it('no rotula lo normal', () => {
    expect(etiquetaDeEstadoDeCuenta('ACTIVE')).toBeNull();
    expect(etiquetaDeEstadoDeCuenta(null)).toBeNull();
    expect(etiquetaDeEstadoDeCuenta(undefined)).toBeNull();
  });

  it('muestra crudo un estado que no conoce', () => {
    expect(etiquetaDeEstadoDeCuenta('LOCKED')).toBe('LOCKED');
  });
});

describe('ROLES_SOLO_EN_STAFF', () => {
  /* MENTOR no está: tiene su propia sección, alimentada por `/admin/cells/mentores`. Si alguna
     vez entra acá, la misma persona quedaría dos veces en la misma pantalla. */
  it('son los tres roles que ninguna otra lista del panel trae', () => {
    expect([...ROLES_SOLO_EN_STAFF]).toEqual(['MENTOR_LEAD', 'ADMIN', 'ALCHEMIST']);
    expect(ROLES_SOLO_EN_STAFF).not.toContain('MENTOR');
    expect(ROLES_SOLO_EN_STAFF).not.toContain('TRAINEE');
  });
});
