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

/** La cabecera de la lista: «Todo prendido», «1 apagada», «3 apagadas». */
export function cuantasApagadas(apagadas: number): string {
  if (apagadas === 0) return 'Todo prendido';
  return `${apagadas} ${apagadas === 1 ? 'apagada' : 'apagadas'}`;
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

export type FiltroDeLaConsola = 'todas' | 'apagadas' | 'criticas' | 'despliegue';

/** ¿Está en despliegue? (fase 2: `despliegue` del catálogo con un porcentaje menor que 100). */
function estaEnDespliegue(f: FuncionalidadConsola): boolean {
  const p = f.despliegue?.porcentaje;
  return typeof p === 'number' && p < 100;
}

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
    if (filtro === 'despliegue' && !estaEnDespliegue(f)) continue;
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
  /* Fase 2 (contrato `fase-2.md` §4.5 y §5). */
  ROL_PERSONALIZADO: 'Rol personalizado',
  VER_COMO: 'Ver como',
};

export function tipoDeCambio(tipo: string | null | undefined): string {
  return (tipo && TIPO_DE_CAMBIO[tipo.toUpperCase()]) || tipo || 'Cambio';
}

export function actorDe(cambio: CambioAuditado): string | null {
  return cambio.actor?.nombre?.trim() || cambio.actorNombre?.trim() || null;
}

/**
 * El estado de una foto de la auditoría en palabras: «Apagada para todos», «Prendida para todos» o «Apagada para
 * Aprendiz y Mentor». Los roles salen de `apagadaPara` (lo manda el backend en cada foto) o, si falta, de `porRol`.
 * `null` si la foto no trae `prendidaGlobal`.
 */
function estadoDeLaFoto(foto: unknown): string | null {
  if (!foto || typeof foto !== 'object') return null;
  const { prendidaGlobal, apagadaPara, porRol } = foto as { prendidaGlobal?: unknown; apagadaPara?: unknown; porRol?: unknown };
  if (typeof prendidaGlobal !== 'boolean') return null;
  if (!prendidaGlobal) return 'Apagada para todos';
  const roles = Array.isArray(apagadaPara)
    ? apagadaPara.filter((r): r is string => typeof r === 'string')
    : porRol && typeof porRol === 'object'
      ? Object.entries(porRol as Record<string, unknown>).filter(([, prendida]) => prendida === false).map(([rol]) => rol)
      : [];
  if (roles.length === 0) return 'Prendida para todos';
  const orden = (rol: string) => {
    const i = (ORDEN_DE_ROLES as readonly string[]).indexOf(rol);
    return i < 0 ? ORDEN_DE_ROLES.length : i;
  };
  const nombres = [...new Set(roles)].sort((a, b) => orden(a) - orden(b) || a.localeCompare(b)).map(etiquetaDeRol);
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `Apagada para ${lista}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Fase 2: despliegue, roles personalizados y «ver como» en la auditoría
// ---------------------------------------------------------------------------------------------------------------------

type FotoDeDespliegue = { porcentaje: number | null; probadores: number | null } | null;

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const numeroO = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** `{ despliegue: { porcentaje, probadores } }` o `{ despliegue: null }` (contrato §3.4); `undefined` si no es eso. */
function fotoDeDespliegue(foto: unknown): FotoDeDespliegue | undefined {
  if (!esObjeto(foto) || !('despliegue' in foto)) return undefined;
  const d = foto.despliegue;
  if (!esObjeto(d)) return null;
  return { porcentaje: numeroO(d.porcentaje), probadores: numeroO(d.probadores) };
}

function escalonEnPalabras(porcentaje: number | null): string {
  if (porcentaje === null) return '—';
  if (porcentaje >= 100) return 'para todos';
  if (porcentaje <= 0) return 'solo probadores';
  return `${porcentaje} %`;
}

/** «Despliegue 5 % → 25 %», «Probadores 3 → 4», «Despliegue empezado: 5 %», «Despliegue terminado: para todos». */
function resumenDeDespliegue(antes: FotoDeDespliegue, despues: FotoDeDespliegue): string | null {
  if (!antes && !despues) return null;
  if (!antes && despues) return `Despliegue empezado: ${escalonEnPalabras(despues.porcentaje)}`;
  if (antes && !despues) return 'Despliegue terminado: para todos';
  const a = antes!;
  const d = despues!;
  const partes: string[] = [];
  if (a.porcentaje !== d.porcentaje) partes.push(`Despliegue ${escalonEnPalabras(a.porcentaje)} → ${escalonEnPalabras(d.porcentaje)}`);
  if (a.probadores !== d.probadores && a.probadores !== null && d.probadores !== null) partes.push(`Probadores ${a.probadores} → ${d.probadores}`);
  return partes.length > 0 ? partes.join(' · ') : `Despliegue: ${escalonEnPalabras(d.porcentaje)}`;
}

type FotoDeRol = { nombre: string | null; activo: boolean | null; funcionalidades: number | null };

function fotoDeRol(foto: unknown): FotoDeRol | null {
  if (!esObjeto(foto) || (!('nombre' in foto) && !('rolBase' in foto))) return null;
  return {
    nombre: typeof foto.nombre === 'string' && foto.nombre.trim() ? foto.nombre.trim() : null,
    activo: typeof foto.activo === 'boolean' ? foto.activo : null,
    funcionalidades: Array.isArray(foto.funcionalidades) ? foto.funcionalidades.length : null,
  };
}

/** «Rol “Mentor junior” creado», «… desactivado», «… renombrado a “…”», «… funcionalidades 12 → 10». */
function resumenDeRol(cambio: CambioAuditado): string | null {
  const antes = fotoDeRol(cambio.antes);
  const despues = fotoDeRol(cambio.despues);
  const nombre = despues?.nombre ?? antes?.nombre;
  const rol = nombre ? `Rol “${nombre}”` : 'Rol';
  const movidas = esObjeto(cambio.despues) ? numeroO(cambio.despues.personasMovidas) : null;
  if (movidas !== null) {
    // B2: `despues` trae `personasMovidas` y `reemplazadoPor {id, nombre}` (o `null`: quedan con el rol base solo).
    const quien = antes?.nombre ? `Rol “${antes.nombre}”` : rol;
    const cuantas = `${movidas} ${movidas === 1 ? 'persona pasó' : 'personas pasaron'}`;
    const reemplazo = esObjeto(cambio.despues) ? cambio.despues.reemplazadoPor : undefined;
    if (esObjeto(reemplazo) && typeof reemplazo.nombre === 'string' && reemplazo.nombre.trim()) return `${quien}: ${cuantas} a “${reemplazo.nombre.trim()}”`;
    if (reemplazo === null) return `${quien}: ${cuantas} al rol base solo`;
    return `${quien}: ${cuantas} a otro rol`;
  }
  if (!antes && despues) return `${rol} creado`;
  if (antes && !despues) return `${rol} borrado`;
  if (!antes || !despues) return null;
  if (antes.activo === true && despues.activo === false) return `${rol} desactivado`;
  if (antes.activo === false && despues.activo === true) return `${rol} reactivado`;
  if (antes.nombre && despues.nombre && antes.nombre !== despues.nombre) return `Rol “${antes.nombre}” renombrado a “${despues.nombre}”`;
  if (antes.funcionalidades !== null && despues.funcionalidades !== null && antes.funcionalidades !== despues.funcionalidades) {
    return `${rol}: funcionalidades ${antes.funcionalidades} → ${despues.funcionalidades}`;
  }
  return `${rol} editado`;
}

/** El rol de una foto de «ver como»: `{ rol: "MENTOR" }` o `{ rolPersonalizado: { nombre } | "nombre" }`. */
function rolDeVerComo(foto: unknown): string | null {
  if (!esObjeto(foto)) return null;
  const rp = foto.rolPersonalizado;
  if (esObjeto(rp) && typeof rp.nombre === 'string' && rp.nombre.trim()) return rp.nombre.trim();
  if (typeof rp === 'string' && rp.trim()) return rp.trim();
  if (typeof foto.rol === 'string' && foto.rol.trim()) return etiquetaDeRol(foto.rol.trim());
  return null;
}

/** «Vio la app como Mentor» al entrar; «Dejó de ver la app como Mentor» si solo trae el `antes`. */
function resumenDeVerComo(cambio: CambioAuditado): string | null {
  const entro = rolDeVerComo(cambio.despues);
  if (entro) return `Vio la app como ${entro}`;
  const salio = rolDeVerComo(cambio.antes);
  return salio ? `Dejó de ver la app como ${salio}` : 'Vio la app como otro rol';
}

/**
 * «Prendida para todos → Apagada para Aprendiz» con las fotos `antes` y `despues` del cambio; si el estado no cambió,
 * fue el aviso: «Apagada para Aprendiz (cambió el aviso)». `null` si alguna foto no se puede leer.
 *
 * Fase 2: entiende también el despliegue («Despliegue 5 % → 25 %», «Probadores 3 → 4»), los roles personalizados
 * («Rol “Mentor junior” creado») y «ver como» («Vio la app como Mentor»).
 */
export function resumenDelCambio(cambio: CambioAuditado): string | null {
  const tipo = cambio.tipo?.toUpperCase();
  if (tipo === 'VER_COMO') return resumenDeVerComo(cambio);
  if (tipo === 'ROL_PERSONALIZADO' || cambio.clave?.startsWith('rp:')) return resumenDeRol(cambio);
  const despliegueAntes = fotoDeDespliegue(cambio.antes);
  const despliegueDespues = fotoDeDespliegue(cambio.despues);
  if (despliegueAntes !== undefined || despliegueDespues !== undefined) {
    return resumenDeDespliegue(despliegueAntes ?? null, despliegueDespues ?? null);
  }
  const antes = estadoDeLaFoto(cambio.antes);
  const despues = estadoDeLaFoto(cambio.despues);
  if (antes === null || despues === null) return null;
  return antes === despues ? `${despues} (cambió el aviso)` : `${antes} → ${despues}`;
}

/**
 * El nombre que encabeza una fila de la auditoría: el de la funcionalidad. La clave de un rol personalizado (`rp:<id>`)
 * no se muestra: el resumen ya nombra al rol.
 */
export function nombreDeLaFilaDeAuditoria(clave: string | null | undefined, nombres: ReadonlyMap<string, string>): string | null {
  if (!clave || clave.startsWith('rp:')) return null;
  return nombres.get(clave) ?? clave;
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
