import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { ROL_MENTOR } from '../../../mentor/types/mentor.types';
import { insigniaDeQuienAcompana } from '../../../mentor/utils/insigniaDeQuienAcompana';
import { etiquetaDeRol, queImplicaEntrarComo, ROL_AL_APROBAR_POR_DEFECTO, ROLES_ASIGNABLES } from '../rolesAsignables';

/** Backend D-265: el Guía de aprendiz es un sexto rol que hace lo mismo que un mentor. */
describe('roles asignables', () => {
  it('son los seis, del aprendiz al alquimista, con el guía de aprendiz segundo', () => {
    expect(ROLES_ASIGNABLES.map(r => r.clave)).toEqual([
      'TRAINEE',
      'TRAINEE_GUIDE',
      'MENTOR',
      'MENTOR_LEAD',
      'ADMIN',
      'ALCHEMIST',
    ]);
    expect(etiquetaDeRol('TRAINEE_GUIDE')).toBe('Guía de aprendiz');
    expect(etiquetaDeRol('ROL_NUEVO')).toBe('ROL_NUEVO');
  });

  it('al aprobar, sin elegir, entra como aprendiz; con otro rol la confirmación dice qué cambia', () => {
    expect(ROL_AL_APROBAR_POR_DEFECTO).toBe('TRAINEE');
    expect(queImplicaEntrarComo('TRAINEE_GUIDE')).toBe(queImplicaEntrarComo('MENTOR'));
    expect(queImplicaEntrarComo('ADMIN')).toMatch(/Administración/);
  });

  it('el guía ve lo del mentor (useEsMentor), en las dos nomenclaturas', () => {
    expect(ROL_MENTOR).toEqual(expect.arrayContaining(['TRAINEE_GUIDE', 'GUIA_APRENDIZ', 'MENTOR']));
  });
});

/** Las pantallas usan la lista compartida y no una copia; «Aprendices» pide solo aprendices (E-605). */
describe('pantallas de Administración', () => {
  const leer = (archivo: string) => readFileSync(join(__dirname, '..', '..', 'screens', archivo), 'utf8');

  /* Spec 002, fase 2: los roles salen de `useOpcionesDeRol` (los seis base de `ROLES_ASIGNABLES` y los personalizados
     de `GET /admin/roles-asignables`); con un personalizado va además `rolPersonalizadoId`. */
  it('la aprobación ofrece los roles asignables y manda el rol elegido con su id personalizado', () => {
    const solicitudes = leer('SolicitudesAdminScreen.tsx');
    expect(solicitudes).toMatch(/const roles = useOpcionesDeRol\(\);/);
    expect(solicitudes).toMatch(/roles=\{roles\}/);
    expect(solicitudes).toMatch(/await aprobarSolicitud\(persona\.id, rol\.rolBase, rol\.rolPersonalizadoId, eleccion\);/);
    const hoja = readFileSync(join(__dirname, '..', '..', 'components', 'AceptarSolicitudSheet.tsx'), 'utf8');
    expect(hoja).toMatch(/\{roles\.map\(opcion => \(/);
  });

  it('Equipo y roles usa la misma lista y pide role=TRAINEE para la sección de aprendices', () => {
    const staff = leer('StaffRolesScreen.tsx');
    expect(staff).toMatch(/const opciones = useOpcionesDeRol\(\);/);
    expect(staff).toMatch(/listarAprendices\(\{ pagina, tamano: POR_PAGINA, busqueda: busquedaAplicada, rol: 'TRAINEE' \}\)/);
  });
});

describe('sello de «Mi grupo» (D-265)', () => {
  it('la guía lee «GUÍA DE APRENDIZ»; mentor, líder o administración, «MENTOR»', () => {
    expect(insigniaDeQuienAcompana('TRAINEE_GUIDE')).toBe('GUÍA DE APRENDIZ');
    expect(insigniaDeQuienAcompana('guia_aprendiz')).toBe('GUÍA DE APRENDIZ');
    expect(insigniaDeQuienAcompana('MENTOR')).toBe('MENTOR');
    expect(insigniaDeQuienAcompana('ADMIN')).toBe('MENTOR');
    expect(insigniaDeQuienAcompana(undefined)).toBe('MENTOR');
  });
});
