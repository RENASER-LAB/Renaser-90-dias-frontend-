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

import {
  etiquetaDeEstadoDeCuenta,
  mentoresQueFaltan,
  personaDeStaff,
  ROLES_SOLO_EN_STAFF,
} from '../staff';

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
  /* MENTOR no está, y no es un olvido que haya que "arreglar": tiene su propia sección. Si entra
     acá, cada mentor activo queda dos veces en la misma pantalla. A los que esa sección no
     muestra —los que no están activos— los trae `mentoresQueFaltan`, con su propia consulta. */
  it('son los tres roles que ninguna otra lista del panel trae', () => {
    expect([...ROLES_SOLO_EN_STAFF]).toEqual(['MENTOR_LEAD', 'ADMIN', 'ALCHEMIST']);
    expect(ROLES_SOLO_EN_STAFF).not.toContain('MENTOR');
    expect(ROLES_SOLO_EN_STAFF).not.toContain('TRAINEE');
  });
});

/**
 * El bug: **suspender a un mentor lo borraba del panel entero.** Personas lista solo aprendices y
 * `/admin/cells/mentores` solo mentores ACTIVOS, así que la persona se quedaba sin ninguna fila
 * desde la cual devolverle el rol. Lo que estas pruebas fijan es que la sección «Mentores» se
 * arma de DOS fuentes y que el cruce entre ellas es por id, no por estado.
 */
describe('mentoresQueFaltan', () => {
  const activo = { ...base, id: 'm-activa', role: 'MENTOR', status: 'ACTIVE', fullName: 'Ada' };
  const suspendido = {
    ...base,
    id: 'm-suspendida',
    role: 'MENTOR',
    status: 'SUSPENDED',
    fullName: 'Beto Díaz',
    email: 'beto@renaser.test',
  };

  it('trae al mentor suspendido, que el listado de grupos no muestra', () => {
    const faltan = mentoresQueFaltan(['m-activa'], [activo, suspendido]);
    expect(faltan.map(p => p.id)).toEqual(['m-suspendida']);
    expect(faltan[0].rol).toBe('MENTOR');
  });

  /* Sin esto la persona aparecería dos veces en la misma sección: una con su grupo y otra con su
     correo. Es el motivo por el que MENTOR se había dejado afuera del listado de staff. */
  it('no repite al mentor que el listado de grupos ya trae', () => {
    expect(mentoresQueFaltan(['m-activa'], [activo])).toEqual([]);
  });

  /* Por qué importa que el estado se vea: si no, la fila no explica por qué esa persona está en
     la lista y parece un mentor más, con grupo y todo. */
  it('deja el estado a la vista, y antes del correo', () => {
    const [fila] = mentoresQueFaltan([], [suspendido]);
    expect(fila.detalle).toBe('Cuenta suspendida · beto@renaser.test');
  });

  /* El cruce es por id y no por `status`: si el listado de grupos falla o todavía no llegó, la
     sección se arma igual con lo que trajo el staff, en vez de quedarse vacía. */
  it('sin nadie visible todavía, los trae a todos', () => {
    expect(mentoresQueFaltan([], [activo, suspendido]).map(p => p.id)).toEqual([
      'm-activa',
      'm-suspendida',
    ]);
  });
});
