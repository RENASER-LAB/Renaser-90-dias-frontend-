import { etiquetaDeRol, ROLES_ASIGNABLES } from '../../admin/utils/rolesAsignables';
import type { CambioDeRol, FuncionalidadConsola, RolNuevo, RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { nombreDe, normalizar } from './consola';

/**
 * Los roles personalizados en la consola (spec 002, fase 2, US7; contrato `fase-2.md` §4): un rol que **hereda de uno
 * base** (nunca Soporte TI) y marca un subconjunto de sus funcionalidades. Funciones puras: las usan las pantallas y las
 * pruebas. El servidor decide de verdad (400 / 409); esto evita el viaje de ida y vuelta y explica antes.
 */

/** Hasta cuántos activos (contrato §4.3; el servidor responde 409 al pasarse). */
export const MAXIMO_DE_ROLES_ACTIVOS = 20;
/** Largos que valida el servidor (B2): nombre de 1 a 60, descripción hasta 280. */
export const LARGO_MAXIMO_DEL_NOMBRE_DEL_ROL = 60;
export const LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL = 280;

/** La clave de un rol personalizado: la de la auditoría y la de `GET /admin/roles-asignables` (`rp:<id>`). */
export function claveDelRol(rol: Pick<RolPersonalizadoConsola, 'id' | 'clave'>): string {
  return rol.clave?.trim() || `rp:${rol.id}`;
}

/** ¿Se le puede cambiar la base? Solo sin personas (con personas el servidor responde 409). */
export function puedeCambiarDeBase(rol: RolPersonalizadoConsola | null): boolean {
  return !rol || (rol.personas ?? 0) === 0;
}

/** Los seis roles base, en el orden de siempre (los de `ROLES_ASIGNABLES`; Soporte TI no está). */
export const ROLES_BASE = ROLES_ASIGNABLES;

export function estaActivo(rol: Pick<RolPersonalizadoConsola, 'activo'>): boolean {
  return rol.activo !== false;
}

export function rolesActivos(roles: readonly RolPersonalizadoConsola[]): RolPersonalizadoConsola[] {
  return roles.filter(estaActivo);
}

/** «Hereda de Mentor · 3 personas · 12 funcionalidades». */
export function resumenDelRol(rol: RolPersonalizadoConsola): string {
  const personas = rol.personas ?? 0;
  const funcionalidades = rol.funcionalidades?.length ?? 0;
  return [
    `Hereda de ${etiquetaDeRol(rol.rolBase)}`,
    `${personas} ${personas === 1 ? 'persona' : 'personas'}`,
    `${funcionalidades} ${funcionalidades === 1 ? 'funcionalidad' : 'funcionalidades'}`,
  ].join(' · ');
}

/** «3 activos de 20». */
export function cuantosActivos(roles: readonly RolPersonalizadoConsola[]): string {
  return `${rolesActivos(roles).length} ${rolesActivos(roles).length === 1 ? 'activo' : 'activos'} de ${MAXIMO_DE_ROLES_ACTIVOS}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// El árbol de funcionalidades de una base
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Las funcionalidades que el rol base usa (`rolesQueLaUsan`, contrato §4.3: «solo claves del catálogo que el rol base
 * usa»). Una sin roles se usa sin cuenta (hoy, el alta pública; contrato §3.4): no es de ningún rol y no se ofrece.
 */
export function funcionalidadesDeLaBase(catalogo: readonly FuncionalidadConsola[], base: string): FuncionalidadConsola[] {
  return catalogo.filter(f => (f.rolesQueLaUsan ?? []).includes(base));
}

export type NodoDelArbol = { funcionalidad: FuncionalidadConsola; nivel: number };

/**
 * El árbol por área, aplanado en el orden en que se dibuja: cada madre seguida de sus hijas (con `nivel` para la
 * sangría). Una hija cuya madre no está en la lista queda en el nivel de arriba.
 */
export function arbolPorArea(funcionalidades: readonly FuncionalidadConsola[]): { area: string; nodos: NodoDelArbol[] }[] {
  const claves = new Set(funcionalidades.map(f => f.clave));
  const hijasDe = new Map<string, FuncionalidadConsola[]>();
  const raices: FuncionalidadConsola[] = [];
  for (const f of funcionalidades) {
    if (f.madre && claves.has(f.madre)) hijasDe.set(f.madre, [...(hijasDe.get(f.madre) ?? []), f]);
    else raices.push(f);
  }
  const areas = new Map<string, NodoDelArbol[]>();
  const vistos = new Set<string>();
  const bajar = (f: FuncionalidadConsola, nivel: number, nodos: NodoDelArbol[]) => {
    if (vistos.has(f.clave)) return;
    vistos.add(f.clave);
    nodos.push({ funcionalidad: f, nivel });
    for (const hija of hijasDe.get(f.clave) ?? []) bajar(hija, nivel + 1, nodos);
  };
  for (const raiz of raices) {
    const area = raiz.area?.trim() || 'Otras';
    const nodos = areas.get(area) ?? [];
    bajar(raiz, 0, nodos);
    areas.set(area, nodos);
  }
  return [...areas.entries()].map(([area, nodos]) => ({ area, nodos }));
}

/** Todas las hijas, nietas… de una clave dentro del catálogo dado. */
export function descendientes(clave: string, catalogo: readonly FuncionalidadConsola[]): string[] {
  const resultado: string[] = [];
  const pendientes = [clave];
  const vistos = new Set<string>([clave]);
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    for (const f of catalogo) {
      if (f.madre === actual && !vistos.has(f.clave)) {
        vistos.add(f.clave);
        resultado.push(f.clave);
        pendientes.push(f.clave);
      }
    }
  }
  return resultado;
}

function madresDe(clave: string, catalogo: readonly FuncionalidadConsola[]): string[] {
  const porClave = new Map(catalogo.map(f => [f.clave, f]));
  const madres: string[] = [];
  let madre = porClave.get(clave)?.madre;
  while (madre && !madres.includes(madre)) {
    madres.push(madre);
    madre = porClave.get(madre)?.madre;
  }
  return madres;
}

/**
 * Marcar o desmarcar una funcionalidad. Marcar una madre marca a sus hijas (contrato: la madre marcada vale para toda
 * su rama); desmarcar una hija desmarca a sus madres, porque una madre marcada daría la rama entera.
 */
export function alternarMarca(marcadas: ReadonlySet<string>, clave: string, catalogo: readonly FuncionalidadConsola[]): Set<string> {
  const nuevas = new Set(marcadas);
  const rama = [clave, ...descendientes(clave, catalogo)];
  if (marcadas.has(clave)) {
    for (const c of rama) nuevas.delete(c);
    for (const m of madresDe(clave, catalogo)) nuevas.delete(m);
  } else {
    for (const c of rama) nuevas.add(c);
  }
  return nuevas;
}

/** Lo marcado que sigue siendo de la base (al cambiar de base al crear, lo de otra base se suelta). */
export function soloDeLaBase(marcadas: ReadonlySet<string>, catalogo: readonly FuncionalidadConsola[], base: string): Set<string> {
  const deLaBase = new Set(funcionalidadesDeLaBase(catalogo, base).map(f => f.clave));
  return new Set([...marcadas].filter(c => deLaBase.has(c)));
}

// ---------------------------------------------------------------------------------------------------------------------
// El formulario
// ---------------------------------------------------------------------------------------------------------------------

export type FormularioDeRol = {
  nombre: string;
  descripcion: string;
  rolBase: string | null;
  funcionalidades: Set<string>;
  activo: boolean;
  motivo: string;
};

export function formularioDeRolDesde(rol: RolPersonalizadoConsola | null): FormularioDeRol {
  return {
    nombre: rol?.nombre ?? '',
    descripcion: rol?.descripcion ?? '',
    rolBase: rol?.rolBase ?? null,
    funcionalidades: new Set(rol?.funcionalidades ?? []),
    activo: rol ? estaActivo(rol) : true,
    motivo: '',
  };
}

function mismoConjunto(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every(x => b.has(x));
}

/** ¿Cambió algo que se guarda? (el motivo solo no es un cambio). */
export function hayCambiosEnElRol(formulario: FormularioDeRol, rol: RolPersonalizadoConsola | null): boolean {
  const original = formularioDeRolDesde(rol);
  return (
    formulario.nombre.trim() !== original.nombre.trim() ||
    formulario.descripcion.trim() !== original.descripcion.trim() ||
    formulario.rolBase !== original.rolBase ||
    formulario.activo !== original.activo ||
    !mismoConjunto(formulario.funcionalidades, original.funcionalidades)
  );
}

const NOMBRES_RESERVADOS = [...ROLES_BASE.map(r => r.etiqueta), 'Soporte TI'];

/** Lo que falta para guardar, en una frase para la alerta; `null` si se puede guardar. */
export function faltaParaGuardarElRol(
  formulario: FormularioDeRol,
  rol: RolPersonalizadoConsola | null,
  todos: readonly RolPersonalizadoConsola[],
): string | null {
  const nombre = formulario.nombre.trim();
  if (rol && !hayCambiosEnElRol(formulario, rol)) return 'No cambiaste nada todavía.';
  if (!nombre) return 'Escribe el nombre del rol.';
  if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE_DEL_ROL) return `El nombre puede tener hasta ${LARGO_MAXIMO_DEL_NOMBRE_DEL_ROL} caracteres.`;
  if (formulario.descripcion.trim().length > LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL) {
    return `La descripción puede tener hasta ${LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL} caracteres.`;
  }
  if (rol && formulario.rolBase !== rol.rolBase && !puedeCambiarDeBase(rol)) return 'Con personas asignadas no se cambia la base: pásalas antes a otro rol.';
  if (NOMBRES_RESERVADOS.some(r => normalizar(r) === normalizar(nombre))) return `«${nombre}» es el nombre de un rol base: elige otro.`;
  if (todos.some(r => r.id !== rol?.id && normalizar(r.nombre) === normalizar(nombre))) return `Ya hay un rol que se llama «${nombre}».`;
  if (!formulario.rolBase) return 'Elige de qué rol hereda.';
  if (!rol && rolesActivos(todos).length >= MAXIMO_DE_ROLES_ACTIVOS) return `Ya hay ${MAXIMO_DE_ROLES_ACTIVOS} roles activos: desactiva uno antes de crear otro.`;
  if (rol && formulario.activo && !estaActivo(rol) && rolesActivos(todos).length >= MAXIMO_DE_ROLES_ACTIVOS) {
    return `Ya hay ${MAXIMO_DE_ROLES_ACTIVOS} roles activos: desactiva uno antes de activar este.`;
  }
  if (formulario.funcionalidades.size === 0) return 'Marca al menos una funcionalidad.';
  if (!formulario.motivo.trim()) return 'Escribe el motivo del cambio: queda en la auditoría.';
  return null;
}

const ordenadas = (s: ReadonlySet<string>) => [...s].sort((a, b) => a.localeCompare(b));

export function rolNuevoDesde(formulario: FormularioDeRol): RolNuevo {
  const descripcion = formulario.descripcion.trim();
  return {
    nombre: formulario.nombre.trim(),
    descripcion: descripcion ? descripcion : null,
    rolBase: formulario.rolBase ?? '',
    funcionalidades: ordenadas(formulario.funcionalidades),
    motivo: formulario.motivo.trim(),
  };
}

/** El cuerpo del `PUT`. `rolBase` va solo si cambió (B2: sin personas cambia la base; con personas, 409). */
export function cambioDeRolDesde(formulario: FormularioDeRol, rol: RolPersonalizadoConsola): CambioDeRol {
  const descripcion = formulario.descripcion.trim();
  return {
    nombre: formulario.nombre.trim(),
    descripcion: descripcion ? descripcion : null,
    funcionalidades: ordenadas(formulario.funcionalidades),
    activo: formulario.activo,
    motivo: formulario.motivo.trim(),
    version: rol.version ?? undefined,
    ...(formulario.rolBase && formulario.rolBase !== rol.rolBase ? { rolBase: formulario.rolBase } : {}),
  };
}

/**
 * Un 409 del `PUT` puede ser una versión vieja (otro cambio llegó antes) o una regla de negocio (cambiar la base con
 * personas, pasarse de 20 activos): no hay código que los distinga. Si la versión releída es otra, fue otro cambio.
 */
export function fueOtroCambio(enviada: number | null | undefined, releida: RolPersonalizadoConsola | undefined): boolean {
  return releida !== undefined && typeof enviada === 'number' && typeof releida.version === 'number' && releida.version !== enviada;
}

/** A dónde se pueden pasar las personas de un rol: otro activo de la misma base, o ninguno (`null`: el rol base solo). */
export function destinosDeReemplazo(
  rol: RolPersonalizadoConsola,
  todos: readonly RolPersonalizadoConsola[],
): { id: string | null; nombre: string }[] {
  return [
    ...todos.filter(r => r.id !== rol.id && estaActivo(r) && r.rolBase === rol.rolBase).map(r => ({ id: r.id as string | null, nombre: r.nombre })),
    { id: null, nombre: `Ninguno (solo ${etiquetaDeRol(rol.rolBase)})` },
  ];
}

/** El nombre de una funcionalidad por su clave (para el árbol y la auditoría). */
export function nombresPorClave(catalogo: readonly FuncionalidadConsola[]): Map<string, string> {
  return new Map(catalogo.map(f => [f.clave, nombreDe(f)]));
}
