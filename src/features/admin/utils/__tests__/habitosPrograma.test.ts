import { describe, expect, it } from '@jest/globals';

import type { HabitoDelProgramaApi } from '../../api/habitosProgramaSchemas';
import {
  alternarRol,
  aplicaAlRol,
  cuerpoDesde,
  faltaEnElFormulario,
  formularioDesde,
  hayCambios,
  rigeDesdeManana,
  textoDeAudiencia,
  tieneReglasPropias,
} from '../habitosPrograma';

/** Reglas puras de «Hábitos del programa» (spec 001 del backend, D-264). */
const ROLES = [
  { code: 'TRAINEE', name: 'Aprendiz' },
  { code: 'MENTOR', name: 'Mentor' },
  { code: 'MENTOR_LEAD', name: 'Líder de mentores' },
];

const habito = (extra: Partial<HabitoDelProgramaApi> = {}): HabitoDelProgramaApi => ({
  id: 'h1',
  title: 'Revisión del grupo',
  habitType: 'CHECKBOX',
  category: 'MIND',
  evidenceRequirement: 'OPTIONAL',
  isOptional: false,
  isActive: true,
  ...extra,
});

describe('audiencia en palabras', () => {
  it('sin roles es «Para todos»; con roles, sus nombres en el orden del sistema', () => {
    expect(textoDeAudiencia([], ROLES)).toBe('Para todos');
    expect(textoDeAudiencia(['MENTOR_LEAD', 'MENTOR'], ROLES)).toBe('Mentor · Líder de mentores');
  });

  it('un rol que la app no conoce se muestra con su código, al final', () => {
    expect(textoDeAudiencia(['COACH', 'TRAINEE'], ROLES)).toBe('Aprendiz · COACH');
  });
});

describe('filtro por rol', () => {
  it('un rol ve los «para todos» y los suyos, igual que el servidor', () => {
    expect(aplicaAlRol(habito(), 'TRAINEE')).toBe(true);
    expect(aplicaAlRol(habito({ targetRoles: ['MENTOR'] }), 'TRAINEE')).toBe(false);
    expect(aplicaAlRol(habito({ targetRoles: ['MENTOR'] }), 'MENTOR')).toBe(true);
    expect(aplicaAlRol(habito({ targetRoles: ['MENTOR'] }), null)).toBe(true);
  });
});

describe('«Rige desde mañana»', () => {
  it('lo decide el servidor: solo un cambio de hoy, nunca la audiencia con la que nace (E2E 2026-10-12)', () => {
    expect(rigeDesdeManana(habito({ targetRolesStartTomorrow: true }))).toBe(true);
    expect(
      rigeDesdeManana(habito({ targetRolesStartTomorrow: false, targetRolesEffectiveFrom: new Date().toISOString() })),
    ).toBe(false);
    expect(rigeDesdeManana(habito())).toBe(false);
  });
});

describe('formulario', () => {
  it('apagar «Para todos» exige al menos un rol', () => {
    const f = { ...formularioDesde(habito()), paraTodos: false };
    expect(faltaEnElFormulario(f, false)).toMatch(/al menos un rol/);
    expect(faltaEnElFormulario({ ...f, roles: ['MENTOR'] }, false)).toBeNull();
  });

  it('un hábito nuevo necesita nombre; uno existente no lo manda', () => {
    expect(faltaEnElFormulario(formularioDesde(null), true)).toMatch(/nombre/);
    expect(cuerpoDesde(formularioDesde(habito()), false)).not.toHaveProperty('title');
    expect(cuerpoDesde({ ...formularioDesde(null), titulo: ' Nuevo ' }, true)).toMatchObject({ title: 'Nuevo', habitType: 'CHECKBOX' });
  });

  it('con «Para todos» encendido viajan cero roles, aunque haya casillas marcadas', () => {
    const f = { ...formularioDesde(habito({ targetRoles: ['MENTOR'] })), paraTodos: true };
    expect(cuerpoDesde(f, false).targetRoles).toEqual([]);
  });

  it('marcar los cinco roles se guarda como cinco roles, no como «para todos»', () => {
    const cinco = ['TRAINEE', 'MENTOR', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST'];
    const f = { ...formularioDesde(null), titulo: 'X', paraTodos: false, roles: cinco };
    expect(cuerpoDesde(f, true).targetRoles).toHaveLength(5);
  });

  it('detecta cambios sin contar espacios ni el orden de los roles', () => {
    const original = formularioDesde(habito({ targetRoles: ['MENTOR', 'TRAINEE'] }));
    expect(hayCambios({ ...original, roles: ['TRAINEE', 'MENTOR'] }, original)).toBe(false);
    expect(hayCambios({ ...original, descripcion: '  ' }, original)).toBe(false);
    expect(hayCambios({ ...original, roles: alternarRol(original.roles, 'MENTOR') }, original)).toBe(true);
  });
});

describe('reglas propias', () => {
  it('avisa en los que tienen clave del sistema o no se pueden quitar', () => {
    expect(tieneReglasPropias(habito({ systemKey: 'DAILY_CLASS' }))).toBe(true);
    expect(tieneReglasPropias(habito({ isDeactivatable: false }))).toBe(true);
    expect(tieneReglasPropias(habito())).toBe(false);
  });
});
