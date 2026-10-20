import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import { esUnToqueReciente } from '../../habits/notificaciones/repeticiones';
import { fechaCompacta } from '../../habits/notificaciones/utils/repeticionesDeAlarma';
import { zonaDelTelefono } from '../../eventos/utils/zonaHoraria';
import type { RocaDiariaApi } from '../types/objetivos.types';
import { preferenciasDeAcciones } from './almacenDePreferencias';
import { canalDeLaAlarmaDeObjetivos } from './canalDeObjetivos';
import {
  claveDeLaAccionAtendida,
  claveDelDiarioAtendido,
  fechaIsoDeLaCompacta,
  planDeRepeticionesDeLasAcciones,
  planDeRepeticionesDelDiario,
  repeticionDeObjetivos,
  type PedidoDeRepeticionDeObjetivos,
} from './planDeRepeticionesDeAcciones';
import type { PreferenciasDeAcciones } from './preferenciasPorDia';

/**
 * «Repetir si no la atiendo» en el teléfono para las acciones de los objetivos (spec 010): pone las alarmas de repetición,
 * las mantiene al día y las cancela cuando la persona atiende la acción o el recordatorio. Lo que decide QUÉ alarmas hay es
 * puro y vive en `planDeRepeticionesDeAcciones.ts`; acá están los efectos. Es el espejo de
 * `habits/notificaciones/repeticiones.ts`, con acciones en lugar de hábitos.
 *
 * ## Quién las pone y quién las renueva
 *
 * - **Las de cada acción** (`sincronizarRepeticionesDeLasAcciones`): las pone `sincronizarAlarmasDeAcciones` cada vez que
 *   se lee la lista de acciones (al abrir Plan, al abrir la app, al guardar cómo suena). Una acción cumplida, movida o
 *   borrada deja de repetir en esa misma lectura.
 * - **Las del recordatorio diario** (`sincronizarRepeticionesDelDiario`): las pone `ponerElRecordatorioDiario` y las
 *   renueva `SincronizadorDeAcciones` al abrir la app y al volver a primer plano: una ventana de 7 días que, sin esa
 *   renovación, se acabaría a la semana.
 *
 * Es una diferencia contra lo ya puesto, no un «borrar y volver a poner»: lo que ya está igual (mismo instante, mismo canal,
 * mismo texto) no se toca.
 *
 * ## Cuándo se cancelan las de HOY (SC-002)
 *
 * - **La persona toca la alarma de la acción o el recordatorio** (`atenderLaAlarmaDeObjetivos`, desde el mismo oyente de
 *   respuestas que abre Plan → Objetivos). Solo cuenta un toque RECIENTE: al abrir la app en frío la librería devuelve la
 *   última respuesta aunque sea de ayer, y esa no atiende lo de hoy.
 * - **Sella la acción** (`sellarRocaDiaria` → `atenderLaAccion`).
 *
 * Además de cancelarlas se ANOTA que ya se atendió: la puesta al día corre al abrir la app, justo después del toque, y sin
 * la nota volvería a poner la repetición recién cancelada. La nota se guarda por cuenta del teléfono (se borra al cerrar
 * sesión) y solo se recuerdan unos días.
 *
 * ## Límites conocidos
 *
 * - Cumplir una acción desde otro teléfono o la web no avisa a este: sus repeticiones suenan hasta que la app lea la lista.
 * - Un aviso agrupado (E-410) lleva los datos del primero del grupo: tocarlo atiende solo a ese. Las repeticiones, como las
 *   de los hábitos, no se agrupan.
 */

const CLAVE_ATENDIDAS = 'renaser.objetivos.recordatorios.atendidas';
/** Cuánto se recuerda que algo se atendió: lo suficiente para cubrir un día de la acción y la noche de antes. */
const RECUERDO_MS = 3 * 24 * 60 * 60 * 1000;

async function sinRomper<T>(operacion: () => Promise<T>, porDefecto: T): Promise<T> {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/* ------------------------------------------------------------------------------------------------
 * Lo atendido
 * ---------------------------------------------------------------------------------------------- */

async function leerAtendidas(ahoraMs: number): Promise<Map<string, number>> {
  return sinRomper(async () => {
    const crudo = await AsyncStorage.getItem(CLAVE_ATENDIDAS);
    const leido = crudo ? JSON.parse(crudo) : {};
    const vigentes = new Map<string, number>();
    if (leido && typeof leido === 'object' && !Array.isArray(leido)) {
      for (const [clave, cuando] of Object.entries(leido)) {
        if (typeof cuando === 'number' && ahoraMs - cuando <= RECUERDO_MS) vigentes.set(clave, cuando);
      }
    }
    return vigentes;
  }, new Map<string, number>());
}

async function anotarAtendidas(claves: Iterable<string>, ahoraMs: number): Promise<void> {
  await sinRomper(async () => {
    const todas = await leerAtendidas(ahoraMs);
    for (const clave of claves) todas.set(clave, ahoraMs);
    await AsyncStorage.setItem(CLAVE_ATENDIDAS, JSON.stringify(Object.fromEntries(todas)));
  }, undefined);
}

/* ------------------------------------------------------------------------------------------------
 * Lo programado
 * ---------------------------------------------------------------------------------------------- */

type Disparo = { value?: unknown; date?: unknown; channelId?: unknown };

interface ProgramadaCruda {
  identifier?: string;
  content?: { title?: string | null; data?: Record<string, unknown> | null };
  trigger?: unknown;
}

/** El instante (ms) de una alarma de fecha ya programada. La librería lo devuelve en `value`; un doble, en `date`. */
function instanteDelDisparo(trigger: unknown): number | null {
  const t = (trigger ?? {}) as Disparo;
  if (typeof t.value === 'number') return t.value;
  if (typeof t.date === 'number') return t.date;
  if (t.date instanceof Date) return t.date.getTime();
  return null;
}

async function programadasAhora(N: NonNullable<ReturnType<typeof cargarNotificaciones>>): Promise<ProgramadaCruda[]> {
  const lista = (await N.getAllScheduledNotificationsAsync?.()) as unknown;
  return Array.isArray(lista) ? (lista as ProgramadaCruda[]) : [];
}

/** Las repeticiones de estas acciones o de este recordatorio que hay programadas ahora, por identificador. */
async function repeticionesPuestas(
  N: NonNullable<ReturnType<typeof cargarNotificaciones>>,
  tipo: 'accion' | 'diario',
): Promise<Map<string, ProgramadaCruda>> {
  const mapa = new Map<string, ProgramadaCruda>();
  for (const p of await programadasAhora(N)) {
    if (repeticionDeObjetivos(p?.identifier)?.tipo === tipo && typeof p.identifier === 'string') mapa.set(p.identifier, p);
  }
  return mapa;
}

/** Pone lo que falta o cambió y quita lo que sobra. Devuelve cuántas puso. */
async function dejarPuestas(
  userId: string,
  N: NonNullable<ReturnType<typeof cargarNotificaciones>>,
  deseadas: readonly PedidoDeRepeticionDeObjetivos[],
  puestas: Map<string, ProgramadaCruda>,
  seQuita: (id: string, p: ProgramadaCruda) => boolean,
): Promise<number> {
  const sobran = new Map(puestas);
  let nuevas = 0;
  for (const pedido of deseadas) {
    const canal = await canalDeLaAlarmaDeObjetivos(userId, pedido.alarma);
    const ya = sobran.get(pedido.identificador);
    sobran.delete(pedido.identificador);
    const disparo = (ya?.trigger ?? {}) as Disparo;
    const yaEsLaMisma = ya !== undefined
      && instanteDelDisparo(ya.trigger) === pedido.instanteMs
      && disparo.channelId === canal.id
      && ya.content?.title === pedido.titulo
      && JSON.stringify(ya.content?.data ?? null) === JSON.stringify(pedido.data);
    if (yaEsLaMisma) continue;
    await asegurarCanal(canal);
    await N.scheduleNotificationAsync({
      identifier: pedido.identificador,
      content: { title: pedido.titulo, body: pedido.cuerpo, sound: canal.sonidoDelAviso, data: pedido.data },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(pedido.instanteMs), channelId: canal.id },
    });
    nuevas++;
  }
  for (const [id, p] of sobran) {
    if (seQuita(id, p)) await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
  }
  return nuevas;
}

async function conPermiso(N: NonNullable<ReturnType<typeof cargarNotificaciones>>): Promise<boolean> {
  return (await N.getPermissionsAsync().catch(() => ({ granted: false }))).granted;
}

/* ------------------------------------------------------------------------------------------------
 * Poner y mantener
 * ---------------------------------------------------------------------------------------------- */

/**
 * Deja puestas EXACTAMENTE las repeticiones que corresponden a estas acciones. Una repetición se quita si ya no se desea Y
 * su día lo desmiente la lista (`fechas`, `YYYY-MM-DD`) o ya pasó: la lista de hoy y mañana (un backend anterior) no puede
 * decir nada de las de otros días. Sin permiso de avisos solo quita. Nunca lanza.
 */
export async function sincronizarRepeticionesDeLasAcciones(
  userId: string,
  entrada: {
    rocas: readonly RocaDiariaApi[];
    fechas: ReadonlySet<string>;
    prefs?: PreferenciasDeAcciones;
    ahoraMs?: number;
    zona?: string | null;
  },
): Promise<number> {
  if (!HAY_RECORDATORIOS_LOCALES) return 0;
  const N = cargarNotificaciones();
  if (!N) return 0;
  return sinRomper(async () => {
    const ahoraMs = entrada.ahoraMs ?? Date.now();
    const zona = entrada.zona === undefined ? zonaDelTelefono() : entrada.zona;
    const prefs = entrada.prefs ?? (await preferenciasDeAcciones(userId));
    const atendidas = new Set((await leerAtendidas(ahoraMs)).keys());
    const permiso = await conPermiso(N);
    const deseadas = permiso ? planDeRepeticionesDeLasAcciones(entrada.rocas, prefs, ahoraMs, zona, atendidas) : [];
    const quedan = new Set(deseadas.map(d => d.identificador));
    return dejarPuestas(userId, N, deseadas, await repeticionesPuestas(N, 'accion'), (id, p) => {
      if (quedan.has(id)) return false;
      const r = repeticionDeObjetivos(id);
      const instante = instanteDelDisparo(p.trigger);
      return !permiso || (r !== null && entrada.fechas.has(fechaIsoDeLaCompacta(r.fecha))) || (instante !== null && instante <= ahoraMs);
    });
  }, 0);
}

/**
 * Deja puestas EXACTAMENTE las repeticiones del recordatorio diario para los próximos 7 días, según las preferencias
 * (las guardadas, o las que se pasen). Sin permiso de avisos solo quita. Nunca lanza.
 */
export async function sincronizarRepeticionesDelDiario(
  userId: string,
  opciones: { ahora?: Date; prefs?: PreferenciasDeAcciones } = {},
): Promise<number> {
  if (!HAY_RECORDATORIOS_LOCALES) return 0;
  const N = cargarNotificaciones();
  if (!N) return 0;
  return sinRomper(async () => {
    const ahora = opciones.ahora ?? new Date();
    const prefs = opciones.prefs ?? (await preferenciasDeAcciones(userId));
    const atendidas = new Set((await leerAtendidas(ahora.getTime())).keys());
    const permiso = await conPermiso(N);
    const deseadas = permiso ? planDeRepeticionesDelDiario(prefs, ahora, atendidas) : [];
    // La ventana entera se recalcula: lo que no se desea, sobra.
    return dejarPuestas(userId, N, deseadas, await repeticionesPuestas(N, 'diario'), () => true);
  }, 0);
}

/** Quita las repeticiones de TODAS las acciones (no las del recordatorio diario). */
export async function cancelarRepeticionesDeLasAcciones(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(async () => {
    for (const id of (await repeticionesPuestas(N, 'accion')).keys()) await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
  }, undefined);
}

/** Quita las repeticiones del recordatorio diario. */
export async function cancelarRepeticionesDelDiario(): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  await sinRomper(async () => {
    for (const id of (await repeticionesPuestas(N, 'diario')).keys()) await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
  }, undefined);
}

/**
 * Los identificadores de todas las repeticiones puestas (acciones y recordatorio diario), para pasarlas al sonido nuevo
 * cuando se cambia el de Yo → Alarmas. No están entre los ids del aviso agrupado: como las de los hábitos, no se juntan.
 */
export async function idsDeRepeticionesDeAcciones(): Promise<string[]> {
  const N = cargarNotificaciones();
  if (!N) return [];
  return sinRomper(async () => {
    const ids: string[] = [];
    for (const p of await programadasAhora(N)) {
      if (repeticionDeObjetivos(p?.identifier) && typeof p.identifier === 'string') ids.push(p.identifier);
    }
    return ids;
  }, []);
}

/* ------------------------------------------------------------------------------------------------
 * Atender
 * ---------------------------------------------------------------------------------------------- */

/**
 * La acción se atendió (se tocó su alarma o se selló): sus repeticiones dejan de sonar y no se vuelven a poner. Idempotente;
 * nunca lanza.
 */
export async function atenderLaAccion(rocaId: string, ahora: Date = new Date()): Promise<void> {
  const N = cargarNotificaciones();
  if (N) {
    await sinRomper(async () => {
      for (const id of (await repeticionesPuestas(N, 'accion')).keys()) {
        const r = repeticionDeObjetivos(id);
        if (r?.tipo === 'accion' && r.rocaId === rocaId) await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
      }
    }, undefined);
  }
  await anotarAtendidas([claveDeLaAccionAtendida(rocaId)], ahora.getTime());
}

/**
 * El recordatorio diario de hoy se atendió: las repeticiones de hoy dejan de sonar, las de mañana en adelante siguen.
 * Cuenta también la de ayer que cruzó la medianoche (23:58 → 00:03).
 */
export async function atenderElDiario(ahora: Date = new Date()): Promise<void> {
  const hoy = fechaCompacta(ahora);
  const atendidos = new Set<string>([hoy]);
  const N = cargarNotificaciones();
  if (N) {
    await sinRomper(async () => {
      for (const id of (await repeticionesPuestas(N, 'diario')).keys()) {
        const r = repeticionDeObjetivos(id);
        if (!r || r.fecha > hoy) continue;
        atendidos.add(r.fecha);
        await N.cancelScheduledNotificationAsync(id).catch(() => undefined);
      }
    }, undefined);
  }
  await anotarAtendidas([...atendidos].map(claveDelDiarioAtendido), ahora.getTime());
}

/**
 * Lo que hace el oyente de respuestas cuando se toca un aviso: si es la alarma de una acción (lleva `rocaId`, solo cuando
 * su combinación repite) o el recordatorio diario (lleva `diario`) y el toque es reciente, queda atendido. Devuelve qué
 * se atendió, o `null`.
 */
export async function atenderLaAlarmaDeObjetivos(
  datos: unknown,
  entregadaEnMs?: unknown,
  ahora: Date = new Date(),
): Promise<'accion' | 'diario' | null> {
  if (!datos || typeof datos !== 'object' || !esUnToqueReciente(entregadaEnMs, ahora)) return null;
  const { rocaId, diario } = datos as { rocaId?: unknown; diario?: unknown };
  if (typeof rocaId === 'string' && rocaId) {
    await atenderLaAccion(rocaId, ahora);
    return 'accion';
  }
  if (diario === true) {
    await atenderElDiario(ahora);
    return 'diario';
  }
  return null;
}
