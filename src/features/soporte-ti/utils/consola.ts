import { ApiError } from '../../../services/http/apiClient';
import { etiquetaDeRol } from '../../admin/utils/rolesAsignables';
import { CODIGO_CONSOLA_BLOQUEADA, CODIGO_REAUTENTICACION_REQUERIDA } from '../api/soporteTiApi';
import type {
  CambioAuditado,
  CambioDeFuncionalidad,
  FuncionalidadConsola,
  ParteDelCircuito,
} from '../api/soporteTiSchemas';

/**
 * Lo que la consola Soporte TI decide sin pantallas (spec 002): cómo se lee el estado de cada funcionalidad, cómo se
 * agrupa y se busca, qué cambio es crítico, qué falta en el formulario y qué hacer con cada error del servidor.
 */

/** Largo máximo del aviso (contrato §4: `char_length(aviso) <= 200`). */
export const LARGO_MAXIMO_DEL_AVISO = 200;

/** Los roles en el orden en que se ofrecen (los seis de la app y Soporte TI, FR-005). */
export const ORDEN_DE_ROLES = ['TRAINEE', 'TRAINEE_GUIDE', 'MENTOR', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST', 'IT_SUPPORT'] as const;

export function nombreDe(f: FuncionalidadConsola): string {
  return f.nombre?.trim() || f.clave;
}

/** Los roles que se pueden prender o apagar en esta funcionalidad: los que la usan y los que ya tienen un desvío. */
export function rolesDeLaFuncionalidad(f: FuncionalidadConsola): string[] {
  const usan = f.rolesQueLaUsan?.filter(Boolean) ?? [];
  const conDesvio = Object.keys(f.porRol ?? {});
  const todos = new Set<string>(usan.length > 0 ? [...usan, ...conDesvio] : [...ORDEN_DE_ROLES, ...conDesvio]);
  const orden = (rol: string) => {
    const i = (ORDEN_DE_ROLES as readonly string[]).indexOf(rol);
    return i < 0 ? ORDEN_DE_ROLES.length : i;
  };
  return [...todos].sort((a, b) => orden(a) - orden(b) || a.localeCompare(b));
}

export function rolesApagados(f: FuncionalidadConsola): string[] {
  return rolesDeLaFuncionalidad(f).filter(rol => f.porRol?.[rol] === false);
}

export type EstadoEnLaConsola =
  | { tipo: 'prendida' }
  | { tipo: 'apagada_para_todos' }
  | { tipo: 'apagada_por_la_madre'; madre: string }
  | { tipo: 'apagada_por_el_circuito' }
  | { tipo: 'apagada_para_algunos'; roles: string[] };

/**
 * El estado de una fila. Manda lo que apaga a todos: la propia (para todos), una madre apagada para todos, el circuito
 * automático de la IA; después, los roles apagados.
 */
export function estadoEnLaConsola(f: FuncionalidadConsola, todas: readonly FuncionalidadConsola[]): EstadoEnLaConsola {
  if (!f.prendidaGlobal) return { tipo: 'apagada_para_todos' };
  const porClave = new Map(todas.map(x => [x.clave, x]));
  let madre = f.madre ? porClave.get(f.madre) : undefined;
  const vistas = new Set<string>();
  while (madre && !vistas.has(madre.clave)) {
    vistas.add(madre.clave);
    if (!madre.prendidaGlobal) return { tipo: 'apagada_por_la_madre', madre: nombreDe(madre) };
    madre = madre.madre ? porClave.get(madre.madre) : undefined;
  }
  if (f.circuito?.estado?.toUpperCase() === 'ABIERTO') return { tipo: 'apagada_por_el_circuito' };
  const roles = rolesApagados(f);
  return roles.length > 0 ? { tipo: 'apagada_para_algunos', roles } : { tipo: 'prendida' };
}

export function textoDelEstado(estado: EstadoEnLaConsola): string {
  switch (estado.tipo) {
    case 'prendida':
      return 'Prendida';
    case 'apagada_para_todos':
      return 'Apagada para todos';
    case 'apagada_por_la_madre':
      return `Apagada: «${estado.madre}» está apagada`;
    case 'apagada_por_el_circuito':
      return 'Apagada sola por fallas del proveedor';
    case 'apagada_para_algunos':
      return `Apagada para ${listaDeRoles(estado.roles)}`;
  }
}

export function estaApagada(estado: EstadoEnLaConsola): boolean {
  return estado.tipo !== 'prendida';
}

function listaDeRoles(roles: readonly string[]): string {
  const nombres = roles.map(etiquetaDeRol);
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
}

/** Para buscar sin tildes ni mayúsculas («intoxicacion» encuentra «Intoxicación»). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export type FiltroDeLaConsola = 'todas' | 'apagadas' | 'criticas';

/** Las funcionalidades por área, en el orden del servidor, filtradas por el buscador (nombre, clave, área o descripción). */
export function agruparPorArea(
  todas: readonly FuncionalidadConsola[],
  busqueda: string,
  filtro: FiltroDeLaConsola = 'todas',
): { area: string; funcionalidades: FuncionalidadConsola[] }[] {
  const texto = normalizar(busqueda);
  const grupos = new Map<string, FuncionalidadConsola[]>();
  for (const f of todas) {
    if (filtro === 'criticas' && !f.critica) continue;
    if (filtro === 'apagadas' && !estaApagada(estadoEnLaConsola(f, todas))) continue;
    if (texto && !normalizar([f.nombre, f.clave, f.area, f.descripcion].filter(Boolean).join(' ')).includes(texto)) continue;
    const area = f.area?.trim() || 'Otras';
    grupos.set(area, [...(grupos.get(area) ?? []), f]);
  }
  return [...grupos.entries()].map(([area, funcionalidades]) => ({ area, funcionalidades }));
}

// ---------------------------------------------------------------------------------------------------------------------
// El formulario del detalle
// ---------------------------------------------------------------------------------------------------------------------

export type FormularioDeFuncionalidad = {
  prendidaGlobal: boolean;
  /** Rol → prendida. Tiene TODOS los roles que se muestran. */
  porRol: Record<string, boolean>;
  aviso: string;
  motivo: string;
};

export function formularioDesde(f: FuncionalidadConsola): FormularioDeFuncionalidad {
  const porRol: Record<string, boolean> = {};
  for (const rol of rolesDeLaFuncionalidad(f)) porRol[rol] = f.porRol?.[rol] !== false;
  return { prendidaGlobal: f.prendidaGlobal, porRol, aviso: f.aviso ?? '', motivo: '' };
}

/** ¿Cambió algo que se guarda? (el motivo solo no es un cambio). */
export function hayCambios(formulario: FormularioDeFuncionalidad, f: FuncionalidadConsola): boolean {
  const original = formularioDesde(f);
  if (formulario.prendidaGlobal !== original.prendidaGlobal) return true;
  if (formulario.aviso.trim() !== original.aviso.trim()) return true;
  return Object.keys(formulario.porRol).some(rol => formulario.porRol[rol] !== original.porRol[rol]);
}

/**
 * ¿Pide la contraseña otra vez? (FR-008): apagar para todos, o cualquier cambio en una funcionalidad marcada crítica.
 * El servidor decide de verdad (428 si falta); esto evita el viaje de ida y vuelta.
 */
export function esCambioCritico(formulario: FormularioDeFuncionalidad, f: FuncionalidadConsola): boolean {
  return f.critica === true || (f.prendidaGlobal && !formulario.prendidaGlobal);
}

/** Lo que falta para guardar, en una frase para la alerta; `null` si se puede guardar. */
export function faltaParaGuardar(formulario: FormularioDeFuncionalidad, f: FuncionalidadConsola): string | null {
  if (!hayCambios(formulario, f)) return 'No cambiaste nada todavía.';
  if (!formulario.motivo.trim()) return 'Escribe el motivo del cambio: queda en la auditoría.';
  if (formulario.aviso.trim().length > LARGO_MAXIMO_DEL_AVISO) return `El aviso puede tener hasta ${LARGO_MAXIMO_DEL_AVISO} caracteres.`;
  return null;
}

export function cambioDesde(formulario: FormularioDeFuncionalidad, f: FuncionalidadConsola): CambioDeFuncionalidad {
  const aviso = formulario.aviso.trim();
  return {
    prendidaGlobal: formulario.prendidaGlobal,
    porRol: { ...formulario.porRol },
    aviso: aviso ? aviso : null,
    motivo: formulario.motivo.trim(),
    version: f.version,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Errores del servidor
// ---------------------------------------------------------------------------------------------------------------------

export type QueHacerConElError =
  /** 423: la consola se bloqueó (sesión corta): volver a pedir la contraseña. */
  | 'desbloquear'
  /** 428: el cambio es crítico y falta la contraseña (o venció la de recién). */
  | 'reautenticar'
  /** 409: otro cambio llegó antes (versión vieja): releer y avisar. */
  | 'releer'
  /** 401 en un desbloqueo: la contraseña no es. */
  | 'contrasena_incorrecta'
  /** 429: demasiados intentos. */
  | 'demasiados_intentos'
  | 'otro';

export function queHacerConElError(error: unknown): QueHacerConElError {
  if (!(error instanceof ApiError)) return 'otro';
  if (error.status === 423 || error.codigo === CODIGO_CONSOLA_BLOQUEADA) return 'desbloquear';
  if (error.status === 428 || error.codigo === CODIGO_REAUTENTICACION_REQUERIDA) return 'reautenticar';
  if (error.status === 409) return 'releer';
  if (error.status === 401 && !error.sesionVencida) return 'contrasena_incorrecta';
  if (error.status === 429) return 'demasiados_intentos';
  return 'otro';
}

// ---------------------------------------------------------------------------------------------------------------------
// Auditoría y circuito
// ---------------------------------------------------------------------------------------------------------------------

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «13 oct, 18:05» en la hora del teléfono; «—» si no hay fecha legible. */
export function fechaYHora(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  return `${d.getDate()} ${MESES[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** «18:05»: para lo que pasa hoy (la próxima prueba del circuito). */
export function hora(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const TIPO_DE_CAMBIO: Record<string, string> = {
  MANUAL: 'Cambio manual',
  AUTOMATICO: 'Automático',
  DESBLOQUEO: 'Desbloqueo de la consola',
  REAUTENTICACION: 'Confirmación con contraseña',
};

export function tipoDeCambio(tipo: string | null | undefined): string {
  return (tipo && TIPO_DE_CAMBIO[tipo.toUpperCase()]) || tipo || 'Cambio';
}

export function actorDe(cambio: CambioAuditado): string | null {
  return cambio.actor?.nombre?.trim() || cambio.actorNombre?.trim() || null;
}

/** «Prendida para todos → Apagada para todos» cuando `antes` y `despues` traen `prendidaGlobal`; si no, `null`. */
export function resumenDelCambio(cambio: CambioAuditado): string | null {
  const leer = (valor: unknown): boolean | null => {
    if (!valor || typeof valor !== 'object') return null;
    const global = (valor as { prendidaGlobal?: unknown }).prendidaGlobal;
    return typeof global === 'boolean' ? global : null;
  };
  const antes = leer(cambio.antes);
  const despues = leer(cambio.despues);
  if (antes === null || despues === null) return null;
  const texto = (v: boolean) => (v ? 'Prendida para todos' : 'Apagada para todos');
  return antes === despues ? `${texto(despues)} (cambiaron los roles o el aviso)` : `${texto(antes)} → ${texto(despues)}`;
}

/** ¿Hay otra página? Con `total` (de elementos) se calcula; sin él, si la página llegó llena. */
export function hayMasPaginas(pagina: number, recibidos: number, tamano: number, total: number | null | undefined): boolean {
  if (recibidos < tamano) return false;
  return typeof total === 'number' ? (pagina + 1) * tamano < total : true;
}

const PARTE_DEL_CIRCUITO: Record<string, string> = { 'ia.chat': 'Chat de SER', 'ia.voz': 'Voz de SER' };

export function nombreDeLaParte(parte: string): string {
  return PARTE_DEL_CIRCUITO[parte] ?? parte;
}

/** El estado del circuito en palabras: si funciona, si se apagó solo (y hasta cuándo) o si está probando. */
export function textoDelCircuito(p: ParteDelCircuito): { titulo: string; detalle: string | null; apagada: boolean } {
  const estado = p.estado.toUpperCase();
  const fallas = typeof p.fallasEnVentana === 'number' && p.fallasEnVentana > 0 ? `${p.fallasEnVentana} ${p.fallasEnVentana === 1 ? 'falla' : 'fallas'} recientes` : null;
  if (estado === 'ABIERTO') {
    const partes = [p.abiertoDesde ? `desde las ${hora(p.abiertoDesde)}` : null, p.proximaPrueba ? `prueba de nuevo a las ${hora(p.proximaPrueba)}` : null];
    return { titulo: 'Apagada sola', detalle: partes.filter(Boolean).join(' · ') || null, apagada: true };
  }
  if (estado === 'PROBANDO') return { titulo: 'Probando de nuevo', detalle: fallas, apagada: true };
  return { titulo: 'Funciona', detalle: fallas, apagada: false };
}
