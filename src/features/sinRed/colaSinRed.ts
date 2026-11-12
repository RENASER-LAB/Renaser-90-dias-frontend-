import { almacen } from './almacen';

import { esperaTrasIntentos } from '../carrera/utils/colaDeEnvio';
import { borrarArchivoSinRed } from './archivosSinRed';
import { agregarAviso, esCodigoDeNoAplicado, motivoDeNoAplicado, MOTIVO_NO_SE_PUDO, type TipoDeAviso } from './avisosDeLoNoAplicado';
import type { OrigenDeLaHora } from './horaReal';

/**
 * Spec 048 (FR-007, FR-009, D8, D15): UNA cola por cuenta con lo hecho sin señal, en el orden en que se hizo.
 *
 * - Cada envío lleva su `idCliente`: el servidor registra una sola vez un reintento (FR-008).
 * - Se procesa en orden. Si uno espera red, los siguientes esperan con él (el orden importa: una foto antes de cerrar el hábito).
 * - Sin red, 5xx, 408, 429 o 404: se reintenta con la misma espera creciente de la cola de carreras. 401 (o un 403 de sesión vencida):
 *   la sesión venció; la cola espera a que vuelva a entrar LA MISMA cuenta (D15).
 * - **Un 429 (spec 050, FR-020) es «reintenta después», nunca final**: si trae `Retry-After`, el envío no sale antes de ese plazo (el
 *   mayor entre él y la espera creciente), ni siquiera cuando vuelve la señal o la app vuelve al frente. No se pierde nada de lo que
 *   la persona hizo.
 * - **Un 4xx es FINAL** (fase 3, D13, FR-016): un 409 con uno de los `codigo` de «no se aplicó» (el servidor se quedó con lo más
 *   nuevo) y cualquier otro 4xx salen de la cola y anotan un aviso con el motivo y lo que la persona escribió
 *   (`avisosDeLoNoAplicado`). Antes quedaban «bloqueados» para siempre y en silencio. La cola sigue con el siguiente.
 * - Va guardada por cuenta: lo de una cuenta nunca sale con la sesión de otra.
 *
 * Dos tipos son genéricos (fase 3): `escritura` (una llamada REST con sus tres cabeceras, `escrituraSinRed.ts`) y
 * `completarAccion` (marcar una acción del Plan con texto o foto: pide la URL, sube a S3 y registra la evidencia).
 */
export type TipoDeEnvio =
  | 'completarHabito'
  | 'subirEvidencia'
  | 'confirmarTexto'
  | 'publicarMuro'
  | 'entregarPastilla'
  | 'escritura'
  | 'completarAccion';

export interface EnvioSinRed {
  idCliente: string;
  cuentaId: string;
  tipo: TipoDeEnvio;
  datos: Record<string, unknown>;
  hechoEn: string;
  origenDeLaHora: OrigenDeLaHora;
  intentos: number;
  proximoIntentoMs: number;
  /** Lo que pidió esperar el servidor (`Retry-After`, spec 050): hasta este instante el envío no sale, ni adelantándolo. */
  noAntesDeMs?: number;
  bloqueado: string | null;
  creadoMs: number;
}

export type Manejador = (envio: EnvioSinRed) => Promise<void>;

const PREFIJO = 'renaser.sinRed.cola.';
const manejadores = new Map<TipoDeEnvio, Manejador>();
const oyentes = new Set<() => void>();
/** Quién quiere saber que un envío salió de la cola (llegó, o terminó sin aplicarse): las pantallas que leen lo que cambió. */
export type ResultadoDeUnEnvio = 'aplicado' | 'no-aplicado';
const alTerminar = new Set<(envio: EnvioSinRed, resultado: ResultadoDeUnEnvio) => void>();
const procesando = new Set<string>();
let cuentaActual: string | null = null;

export function ponerCuentaActual(cuentaId: string | null): void {
  cuentaActual = cuentaId;
}

export function cuentaDeLaSesion(): string | null {
  return cuentaActual;
}

export function registrarManejador(tipo: TipoDeEnvio, manejador: Manejador): void {
  manejadores.set(tipo, manejador);
}

export function suscribirCola(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function alTerminarUnEnvio(oyente: (envio: EnvioSinRed, resultado: ResultadoDeUnEnvio) => void): () => void {
  alTerminar.add(oyente);
  return () => alTerminar.delete(oyente);
}

function terminoUnEnvio(envio: EnvioSinRed, resultado: ResultadoDeUnEnvio) {
  alTerminar.forEach(o => {
    try {
      o(envio, resultado);
    } catch {
      /* nada */
    }
  });
}

function avisar() {
  oyentes.forEach(o => {
    try {
      o();
    } catch {
      /* nada */
    }
  });
}

export async function leerCola(cuentaId: string): Promise<EnvioSinRed[]> {
  try {
    const crudo = await almacen().getItem(PREFIJO + cuentaId);
    const lista = crudo ? (JSON.parse(crudo) as EnvioSinRed[]) : [];
    return Array.isArray(lista) ? lista.filter(e => e && e.cuentaId === cuentaId && typeof e.idCliente === 'string') : [];
  } catch {
    return [];
  }
}

async function guardarCola(cuentaId: string, cola: EnvioSinRed[]): Promise<void> {
  try {
    if (cola.length === 0) await almacen().removeItem(PREFIJO + cuentaId);
    else await almacen().setItem(PREFIJO + cuentaId, JSON.stringify(cola));
  } catch {
    /* se reintenta la próxima vez */
  }
}

export function nuevoIdCliente(): string {
  // UUID v4 sin dependencias: alcanza para que el servidor reconozca un reintento.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function agregarEnvio(
  cuentaId: string,
  tipo: TipoDeEnvio,
  datos: Record<string, unknown>,
  hora: { instante: Date; origen: OrigenDeLaHora },
  ahora: number = Date.now(),
): Promise<EnvioSinRed> {
  const envio: EnvioSinRed = {
    idCliente: nuevoIdCliente(),
    cuentaId,
    tipo,
    datos,
    hechoEn: hora.instante.toISOString(),
    origenDeLaHora: hora.origen,
    intentos: 0,
    proximoIntentoMs: ahora,
    bloqueado: null,
    creadoMs: ahora,
  };
  await guardarCola(cuentaId, [...(await leerCola(cuentaId)), envio]);
  avisar();
  return envio;
}

/**
 * Saca un envío de la cola antes de que salga (spec 048 fase 2, D19: la publicación en espera se puede borrar). Si la cola
 * de esa cuenta se está enviando justo ahora, no se toca y devuelve `false`: puede estar a mitad de camino.
 */
export async function quitarEnvio(cuentaId: string, idCliente: string): Promise<boolean> {
  if (procesando.has(cuentaId)) return false;
  const cola = await leerCola(cuentaId);
  const queda = cola.filter(e => e.idCliente !== idCliente);
  if (queda.length === cola.length) return false;
  await guardarCola(cuentaId, queda);
  avisar();
  return true;
}

type Final = { tipo: Extract<TipoDeAviso, 'no-aplicado' | 'no-se-pudo'>; codigo: string | null; motivo: string };
type Desenlace = 'listo' | 'reintentar' | 'sin-sesion' | { final: Final };

/**
 * Cuánto pidió esperar el servidor con `Retry-After` (milisegundos), si el error lo trae (`ApiError.reintentarEnMs`, spec 050 FR-020);
 * `null` si no. Se lee con tipos sueltos: los manejadores pueden lanzar cualquier error con `status`.
 */
export function esperaPedidaPorElServidor(error: unknown): number | null {
  const espera = (error as { reintentarEnMs?: unknown } | null | undefined)?.reintentarEnMs;
  return typeof espera === 'number' && Number.isFinite(espera) && espera > 0 ? espera : null;
}

/** Qué hacer con el error de un envío (exportada para las pruebas). */
export function desenlaceDe(error: unknown): Desenlace {
  const e = (error ?? {}) as { status?: number; sesionVencida?: boolean; codigo?: unknown; body?: unknown; message?: unknown };
  const status = e.status;
  if (typeof status !== 'number' || status === 0 || status >= 500 || status === 408 || status === 429 || status === 404) {
    return 'reintentar';
  }
  // Un 403 sin `codigo` que el filtro de seguridad da cuando el token ya no existe también es sesión vencida (issue #150).
  if (status === 401 || e.sesionVencida === true) return 'sin-sesion';
  const delCuerpo = e.body && typeof e.body === 'object' ? (e.body as { codigo?: unknown }).codigo : undefined;
  const codigo = typeof e.codigo === 'string' ? e.codigo : typeof delCuerpo === 'string' ? delCuerpo : null;
  const mensaje = typeof e.message === 'string' && !/^Error \d+$/.test(e.message.trim()) ? e.message : null;
  if (status === 409 && esCodigoDeNoAplicado(codigo)) {
    return { final: { tipo: 'no-aplicado', codigo, motivo: motivoDeNoAplicado(codigo, mensaje) } };
  }
  return { final: { tipo: 'no-se-pudo', codigo, motivo: mensaje?.trim() || MOTIVO_NO_SE_PUDO } };
}

/** El envío con un intento más y el plazo del próximo: el mayor entre la espera creciente y lo que pidió el servidor. */
function conSuReintento(envio: EnvioSinRed, ahora: number, esperaDelServidor: number | null): EnvioSinRed {
  const intentos = envio.intentos + 1;
  const espera = Math.max(esperaTrasIntentos(intentos), esperaDelServidor ?? 0);
  const { noAntesDeMs: _anterior, ...sinPlazoAnterior } = envio;
  return {
    ...sinPlazoAnterior,
    intentos,
    proximoIntentoMs: ahora + espera,
    ...(esperaDelServidor ? { noAntesDeMs: ahora + esperaDelServidor } : {}),
  };
}

/** Cómo se llama lo que no se aplicó y qué escribió la persona, según el tipo de envío. */
function descripcionDe(envio: EnvioSinRed): { etiqueta: string; texto: string | null } {
  const d = envio.datos as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  switch (envio.tipo) {
    case 'escritura':
      return { etiqueta: texto(d.etiqueta) ?? 'Algo que hiciste sin conexión', texto: texto(d.resumen) };
    case 'completarAccion':
      return { etiqueta: texto(d.etiqueta) ?? 'Una acción que marcaste sin conexión', texto: texto(d.texto) };
    case 'completarHabito':
      return { etiqueta: texto(d.titulo) ?? 'Un hábito que marcaste sin conexión', texto: texto(d.respuestaTexto) };
    case 'subirEvidencia':
      return { etiqueta: 'La evidencia de un hábito', texto: null };
    case 'confirmarTexto':
      return { etiqueta: 'La evidencia de un hábito', texto: texto(d.texto) };
    case 'publicarMuro':
      return { etiqueta: 'Tu publicación del Muro', texto: texto(d.texto) };
    case 'entregarPastilla':
      return { etiqueta: 'Tu Pastilla Renacer', texto: texto(d.summaryText) };
    default:
      return { etiqueta: 'Algo que hiciste sin conexión', texto: null };
  }
}

/** Las fotos copiadas a la carpeta sin red que ya no hacen falta (el envío terminó sin aplicarse). */
function soltarArchivos(envio: EnvioSinRed) {
  const d = envio.datos as { uri?: unknown; fotos?: unknown };
  if (typeof d.uri === 'string') borrarArchivoSinRed(d.uri);
  if (Array.isArray(d.fotos)) d.fotos.forEach(f => typeof (f as { uri?: unknown })?.uri === 'string' && borrarArchivoSinRed((f as { uri: string }).uri));
}

/** Manda lo que toca, en orden. Un solo proceso por cuenta a la vez. Devuelve cuántos quedan. */
export async function procesarCola(cuentaId: string, ahora: number = Date.now(), opciones: { adelantar?: boolean } = {}): Promise<number> {
  if (procesando.has(cuentaId) || cuentaActual !== cuentaId) return (await leerCola(cuentaId)).length;
  procesando.add(cuentaId);
  let quedanNuevos = false;
  let cortada = false;
  try {
    let cola = await leerCola(cuentaId);
    // Lo que se agrega mientras se envía (alguien escribe con señal justo ahora) no se pisa al guardar: se suma al final y sale
    // en el repaso de abajo. Sin esto, guardar la copia vieja de la cola borraba lo recién escrito.
    const vistos = new Set(cola.map(e => e.idCliente));
    const sumarNuevos = async () => {
      const nuevos = (await leerCola(cuentaId)).filter(e => !vistos.has(e.idCliente));
      nuevos.forEach(e => vistos.add(e.idCliente));
      if (nuevos.length) {
        cola = [...cola, ...nuevos];
        quedanNuevos = true;
      }
    };
    // Volvió la señal o la app volvió al frente: lo que esperaba se intenta ya. Va DENTRO del candado (E2E 09/11): hecho
    // aparte, leía la cola, la cola mandaba y borraba un envío, y al guardar su copia vieja lo devolvía: salía dos veces.
    // Lo que el servidor pidió esperar (`Retry-After`) no se adelanta: volver a pedir antes solo trae otro 429.
    if (opciones.adelantar) {
      cola = cola.map(e => ({ ...e, proximoIntentoMs: Math.max(Math.min(e.proximoIntentoMs, ahora), e.noAntesDeMs ?? 0) }));
    }
    for (const envio of [...cola]) {
      let desenlace: Desenlace;
      let esperaDelServidor: number | null = null;
      if (envio.bloqueado) {
        // Uno que una versión anterior dejó «bloqueado» en silencio: ahora también avisa y sale (FR-016).
        desenlace = { final: { tipo: 'no-se-pudo', codigo: null, motivo: envio.bloqueado } };
      } else {
        if (ahora < envio.proximoIntentoMs) break;
        const manejador = manejadores.get(envio.tipo);
        if (!manejador) break;
        try {
          await manejador(envio);
          desenlace = 'listo';
        } catch (error) {
          desenlace = desenlaceDe(error);
          esperaDelServidor = esperaPedidaPorElServidor(error);
        }
      }
      if (desenlace === 'listo') {
        cola = cola.filter(e => e.idCliente !== envio.idCliente);
        terminoUnEnvio(envio, 'aplicado');
      } else if (desenlace === 'reintentar') {
        cola = cola.map(e => (e.idCliente === envio.idCliente ? conSuReintento(e, ahora, esperaDelServidor) : e));
        // Se guarda ANTES de cortar: si no, el reintento nunca quedaba anotado y la espera no crecía.
        await sumarNuevos();
        await guardarCola(cuentaId, cola);
        avisar();
        cortada = true;
        break;
      } else if (desenlace === 'sin-sesion') {
        cortada = true;
        break;
      } else {
        // Final (FR-016, D13): sale de la cola y deja su aviso, con lo que la persona escribió, ANTES de guardar la cola.
        const { etiqueta, texto } = descripcionDe(envio);
        await agregarAviso(cuentaId, {
          id: envio.idCliente,
          tipo: desenlace.final.tipo,
          etiqueta,
          hechoEn: envio.hechoEn,
          codigo: desenlace.final.codigo,
          motivo: desenlace.final.motivo,
          texto,
        });
        soltarArchivos(envio);
        cola = cola.filter(e => e.idCliente !== envio.idCliente);
        terminoUnEnvio(envio, 'no-aplicado');
      }
      await sumarNuevos();
      await guardarCola(cuentaId, cola);
      avisar();
    }
    return cola.length;
  } finally {
    procesando.delete(cuentaId);
    // Lo escrito mientras se enviaba sale ya, sin esperar al reloj de un minuto.
    if (quedanNuevos && !cortada) void procesarCola(cuentaId, Math.max(ahora, Date.now()), opciones).catch(() => undefined);
  }
}


export async function borrarCola(cuentaId: string): Promise<void> {
  await guardarCola(cuentaId, []);
  avisar();
}

/** Solo para las pruebas. */
export function _reiniciarCola(): void {
  manejadores.clear();
  oyentes.clear();
  alTerminar.clear();
  procesando.clear();
  cuentaActual = null;
}
