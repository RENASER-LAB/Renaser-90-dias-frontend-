import type { OpcionDeRol, RolAsignable } from '../api/adminApi';
import type { RolPersonalizadoDeLaPersona } from '../api/adminSchemas';
import { ETIQUETA_SOPORTE_TI, ROLES_SOPORTE_TI } from '../../soporte-ti/utils/rolSoporteTi';

/**
 * Los seis roles que se pueden dar, con el nombre que usa la gente y no el del enum, en el orden en que se ofrecen.
 * Los leen «Equipo y roles» y la aprobación de solicitudes: tienen que ser los mismos y decirse igual en las dos.
 *
 * El Guía de aprendiz (backend D-265) hace todo lo que hace un mentor; es un rol aparte para poder clasificarlo y
 * filtrarlo (hábitos por rol, el padrón). No es el guía del grupo inicial, que es una designación por cohorte (D-242).
 */
export const ROLES_ASIGNABLES: ReadonlyArray<{ clave: RolAsignable; etiqueta: string }> = [
  { clave: 'TRAINEE', etiqueta: 'Aprendiz' },
  { clave: 'TRAINEE_GUIDE', etiqueta: 'Guía de aprendiz' },
  { clave: 'MENTOR', etiqueta: 'Mentor' },
  { clave: 'MENTOR_LEAD', etiqueta: 'Líder de mentores' },
  { clave: 'ADMIN', etiqueta: 'Administrador' },
  { clave: 'ALCHEMIST', etiqueta: 'Alquimista' },
];

/* `Map<string, …>`: el servidor puede mandar un rol que esta versión no conoce, y tiene que poder buscarse.
   Soporte TI (spec 002) tiene nombre pero NO es asignable: se nombra acá y no está en `ROLES_ASIGNABLES`. */
const ETIQUETA = new Map<string, string>([
  ...ROLES_ASIGNABLES.map(r => [r.clave as string, r.etiqueta] as [string, string]),
  ...ROLES_SOPORTE_TI.map(r => [r, ETIQUETA_SOPORTE_TI] as [string, string]),
]);

/** El nombre de un rol; uno desconocido se muestra tal cual llega (mejor eso que inventarle un nombre). */
export function etiquetaDeRol(rol: string): string {
  return ETIQUETA.get(rol) ?? rol;
}

/** El rol con el que entra quien pide acceso si nadie elige otro: el de siempre. */
export const ROL_AL_APROBAR_POR_DEFECTO: RolAsignable = 'TRAINEE';

/**
 * Qué cambia al aprobar con un rol que no es el de siempre, en una frase para la confirmación. Aprobar con otro rol
 * da más acceso que el de aprendiz (Administración, grupos ajenos), por eso pide confirmar y aprobar como aprendiz no.
 */
export function queImplicaEntrarComo(rol: RolAsignable): string {
  switch (rol) {
    case 'TRAINEE_GUIDE':
    case 'MENTOR':
      return 'Acompaña grupos y no pasa por el grupo de bienvenida.';
    case 'MENTOR_LEAD':
      return 'Coordina a los mentores y no pasa por el grupo de bienvenida.';
    case 'ADMIN':
    case 'ALCHEMIST':
      return 'Puede entrar a Administración y no pasa por el grupo de bienvenida.';
    case 'TRAINEE':
      return 'Hace el programa y entra al grupo de bienvenida.';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Spec 002, fase 2: los roles personalizados (contrato `fase-2.md` §4.5)
// ---------------------------------------------------------------------------------------------------------------------

/** Los seis de siempre como opciones: lo que se ofrece sin `GET /admin/roles-asignables` (backend anterior). */
export const OPCIONES_BASE: readonly OpcionDeRol[] = ROLES_ASIGNABLES.map(r => ({
  clave: r.clave,
  nombre: r.etiqueta,
  rolBase: r.clave,
  rolPersonalizadoId: null,
}));

const SIN_SOPORTE_TI = (rol: string) => !ROLES_SOPORTE_TI.includes(rol.trim().toUpperCase() as (typeof ROLES_SOPORTE_TI)[number]);

/**
 * Las opciones para elegir, en el orden en que se ofrecen: los seis base (con el nombre de siempre) y, debajo, los
 * personalizados activos que mandó el servidor, cada uno con su base. Sin respuesta o vacía, los seis. Soporte TI nunca
 * se ofrece, ni como base.
 */
export function opcionesDeRol(delServidor: readonly OpcionDeRol[] | null | undefined): OpcionDeRol[] {
  if (!delServidor || delServidor.length === 0) return [...OPCIONES_BASE];
  const personalizados = delServidor.filter(o => o.rolPersonalizadoId && SIN_SOPORTE_TI(o.rolBase));
  return [...OPCIONES_BASE, ...personalizados];
}

/** El nombre del rol de una persona: el de su rol personalizado si tiene; si no, el del rol base. */
export function etiquetaDeLaPersona(rol: string, rolPersonalizado?: RolPersonalizadoDeLaPersona): string {
  return rolPersonalizado?.nombre?.trim() || etiquetaDeRol(rol);
}

/** ¿Es la opción que la persona tiene hoy? Un rol personalizado se compara por id; uno base, sin personalizado. */
export function esLaOpcionDeLaPersona(opcion: OpcionDeRol, persona: { rol: string; rolPersonalizado?: RolPersonalizadoDeLaPersona }): boolean {
  if (opcion.rolPersonalizadoId) return persona.rolPersonalizado?.id === opcion.rolPersonalizadoId;
  return opcion.rolBase === persona.rol && !persona.rolPersonalizado?.id;
}

/** La opción de siempre al aprobar: Aprendiz, sin rol personalizado. */
export function esLaOpcionPorDefecto(opcion: OpcionDeRol): boolean {
  return opcion.rolBase === ROL_AL_APROBAR_POR_DEFECTO && !opcion.rolPersonalizadoId;
}

/** Qué implica entrar con esa opción, en una frase para la confirmación (la base y, si es personalizado, su límite). */
export function queImplicaLaOpcion(opcion: OpcionDeRol): string {
  const base = queImplicaEntrarComo(opcion.rolBase as RolAsignable);
  if (!opcion.rolPersonalizadoId) return base;
  return [`Hereda de ${etiquetaDeRol(opcion.rolBase)}, con solo las funcionalidades de «${opcion.nombre}».`, base].filter(Boolean).join(' ');
}

/** La etiqueta de una opción en la lista: «Mentor junior · hereda de Mentor» para un personalizado. */
export function etiquetaDeLaOpcion(opcion: OpcionDeRol): string {
  return opcion.rolPersonalizadoId ? `${opcion.nombre} · hereda de ${etiquetaDeRol(opcion.rolBase)}` : opcion.nombre;
}
