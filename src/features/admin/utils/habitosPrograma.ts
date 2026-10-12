import type { IconName } from '../../../components/Icon';
import { iconoDeLaDimension } from '../../training/utils/iconoDeLaDimension';
import { dimensionDeCategoria } from '../../training/utils/dimensionDelHabito';
import type {
  CuerpoHabitoDelPrograma,
  HabitoDelProgramaApi,
  RolElegibleApi,
} from '../api/habitosProgramaSchemas';

/**
 * Reglas puras de «Hábitos del programa» (spec 001 del backend, D-264): etiquetas, audiencia en palabras,
 * filtro por rol y el formulario. Sin React, para probarlas sin montar nada.
 */

export const LARGO_MAXIMO_DEL_TITULO = 120;

export const DIMENSIONES: readonly { valor: string; etiqueta: string }[] = [
  { valor: 'BODY', etiqueta: 'Cuerpo' },
  { valor: 'MIND', etiqueta: 'Mente' },
  { valor: 'CONSCIENCE', etiqueta: 'Emociones' },
  { valor: 'SPIRIT', etiqueta: 'Espíritu' },
];

export const TIPOS: readonly { valor: string; etiqueta: string; detalle: string }[] = [
  { valor: 'CHECKBOX', etiqueta: 'Casilla', detalle: 'Se marca como hecho' },
  { valor: 'JOURNALING', etiqueta: 'Escritura', detalle: 'Se escribe lo que se hizo' },
  { valor: 'RATING', etiqueta: 'Calificación', detalle: 'Se califica del 1 al 10' },
  { valor: 'BLOCKING', etiqueta: 'Bloqueo', detalle: 'Algo que se evita' },
];

export const EVIDENCIAS: readonly { valor: string; etiqueta: string }[] = [
  { valor: 'OPTIONAL', etiqueta: 'Opcional' },
  { valor: 'REQUIRED', etiqueta: 'Obligatoria' },
];

const etiquetaDe = (lista: readonly { valor: string; etiqueta: string }[], valor: string) =>
  lista.find(o => o.valor === valor)?.etiqueta ?? valor;

export const etiquetaDeDimension = (categoria: string) => etiquetaDe(DIMENSIONES, categoria);
export const etiquetaDeTipo = (tipo: string) => etiquetaDe(TIPOS, tipo);
export const etiquetaDeEvidencia = (evidencia: string) => etiquetaDe(EVIDENCIAS, evidencia);

/** El ícono de la dimensión, el mismo de Training; uno neutro si la categoría es nueva. */
export function iconoDelHabito(categoria: string): IconName {
  const dimension = dimensionDeCategoria(categoria);
  return dimension ? iconoDeLaDimension(dimension) : 'listChecks';
}

export const rolesDe = (habito: HabitoDelProgramaApi): string[] => habito.targetRoles ?? [];

/** «Para todos» o los nombres de sus roles, con el nombre del servidor (o el código si el rol es nuevo). */
export function textoDeAudiencia(roles: readonly string[], elegibles: readonly RolElegibleApi[]): string {
  if (roles.length === 0) return 'Para todos';
  const orden = (codigo: string) => {
    const i = elegibles.findIndex(r => r.code === codigo);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...roles]
    .sort((a, b) => orden(a) - orden(b))
    .map(codigo => elegibles.find(r => r.code === codigo)?.name ?? codigo)
    .join(' · ');
}

/** Un rol ve los «para todos» y los suyos: el mismo criterio que el servidor (`GET ?role=`). */
export function aplicaAlRol(habito: HabitoDelProgramaApi, rol: string | null): boolean {
  if (!rol) return true;
  const roles = rolesDe(habito);
  return roles.length === 0 || roles.includes(rol);
}

/**
 * Si la audiencia guardada todavía no rige (un cambio de hoy rige desde mañana). Lo decide el servidor
 * (`targetRolesStartTomorrow`): solo él sabe si la última versión es la de la creación —que rige ya— o un cambio.
 *
 * > **Corregido 2026-10-12 (E2E en el emulador).** Lo deducía de `targetRolesEffectiveFrom` comparando con la
 * > fecha del teléfono, y un hábito recién creado con roles decía «Rige desde mañana»: falso, la audiencia con
 * > la que nace rige desde la creación. Un backend anterior sin el campo no muestra el aviso.
 */
export const rigeDesdeManana = (habito: HabitoDelProgramaApi): boolean => habito.targetRolesStartTomorrow === true;

/** Clase diaria, Pastilla, post en Comunidad…: reglas propias en la app, o un hábito que nadie puede quitar. */
export const tieneReglasPropias = (habito: HabitoDelProgramaApi) =>
  Boolean(habito.systemKey) || habito.isDeactivatable === false;

export interface FormularioDeHabito {
  titulo: string;
  descripcion: string;
  categoria: string;
  tipo: string;
  evidencia: string;
  esOpcional: boolean;
  obligatorioEnIntoxicacion: boolean;
  paraTodos: boolean;
  roles: string[];
}

export function formularioDesde(habito: HabitoDelProgramaApi | null): FormularioDeHabito {
  const roles = habito ? rolesDe(habito) : [];
  return {
    titulo: habito?.title ?? '',
    descripcion: habito?.description ?? '',
    categoria: habito?.category ?? 'BODY',
    tipo: habito?.habitType ?? 'CHECKBOX',
    evidencia: habito?.evidenceRequirement ?? 'OPTIONAL',
    esOpcional: habito?.isOptional ?? false,
    obligatorioEnIntoxicacion: habito?.mandatoryOnIntoxication ?? false,
    paraTodos: roles.length === 0,
    roles,
  };
}

/** Qué falta, en palabras, o `null` si se puede guardar (AGENTS.md §5: validar antes de enviar). */
export function faltaEnElFormulario(formulario: FormularioDeHabito, esNuevo: boolean): string | null {
  if (esNuevo && !formulario.titulo.trim()) return 'Escribe el nombre del hábito.';
  if (esNuevo && formulario.titulo.trim().length > LARGO_MAXIMO_DEL_TITULO) {
    return `El nombre puede tener hasta ${LARGO_MAXIMO_DEL_TITULO} caracteres.`;
  }
  if (!formulario.paraTodos && formulario.roles.length === 0) {
    return 'Elige al menos un rol, o vuelve a encender «Para todos los roles».';
  }
  return null;
}

/** Con el interruptor encendido viaja `[]`: para todos, también los roles que se agreguen después. */
export function cuerpoDesde(formulario: FormularioDeHabito, esNuevo: boolean): CuerpoHabitoDelPrograma {
  const descripcion = formulario.descripcion.trim();
  return {
    ...(esNuevo ? { title: formulario.titulo.trim(), habitType: formulario.tipo } : {}),
    description: descripcion ? descripcion : null,
    category: formulario.categoria,
    evidenceRequirement: formulario.evidencia,
    isOptional: formulario.esOpcional,
    mandatoryOnIntoxication: formulario.obligatorioEnIntoxicacion,
    targetRoles: formulario.paraTodos ? [] : [...formulario.roles].sort(),
  };
}

export function hayCambios(actual: FormularioDeHabito, original: FormularioDeHabito): boolean {
  const normal = (f: FormularioDeHabito) =>
    JSON.stringify({ ...f, titulo: f.titulo.trim(), descripcion: f.descripcion.trim(), roles: f.paraTodos ? [] : [...f.roles].sort() });
  return normal(actual) !== normal(original);
}

export function alternarRol(roles: readonly string[], codigo: string): string[] {
  return roles.includes(codigo) ? roles.filter(r => r !== codigo) : [...roles, codigo];
}

export const SIN_PERMISO_DE_HABITOS = 'Tu cuenta no tiene permiso para administrar los hábitos del programa.';
