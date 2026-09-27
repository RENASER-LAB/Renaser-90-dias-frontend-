import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  pedirPermiso,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import { preferenciasDeAlarmas } from '../../alarmas/preferenciasDeAlarmas';
import { canalDeAlarma, type CanalDeAlarma } from '../../alarmas/sonidoDeAlarma';
// Solo se LEE (no se toca `features/eventos/`): es la conversión fecha + hora de pared → instante que
// ya está probada allá. Duplicarla sería tener dos lugares donde equivocarse con la zona.
import { instanteEnZona, zonaDelTelefono } from '../../eventos/utils/zonaHoraria';
import type { RocaDiariaApi } from '../types/objetivos.types';

/**
 * Los recordatorios de las acciones de los objetivos (las rocas del día), en el teléfono
 * (decisión del dueño del 2026-09-26: «hoy solo los hábitos tienen recordatorio»).
 *
 * ## Lo que dice el modelo real
 *
 * Una acción del día (`RocaDiaria`, `GET /rocks/today` y `/rocks/tomorrow`) tiene `fecha` y una
 * `horaInicio` **opcional**: se agenda con hora o sin ella (`AgendarAccionesModal`: «una acción sin
 * hora es igual de válida que una agendada»). Por eso hay DOS recordatorios, los dos locales, sin
 * servidor ni tablas:
 *
 * 1. **«Recordarme mis acciones del día»**: uno diario a la hora que la persona elige, encendido o
 *    apagado. Cubre también las acciones sin hora. El texto es FIJO («Revisa las acciones de tus
 *    objetivos de hoy»): una alarma diaria se programa una vez y suena sola, sin que la app corra, así
 *    que no puede contar a esa hora cuántas quedan pendientes. Contarlas al programar mentiría en
 *    cuanto la persona cumpla una desde otro lado.
 * 2. **Aviso antes de cada acción con hora**: las mismas opciones que un hábito —sin aviso, 30 o 10
 *    min antes, a la hora (se pueden varias)—, pero UNA elección para todas: las acciones se agendan
 *    de nuevo cada día, y pedir la antelación de cada una cada vez es justo lo que no se le pide a
 *    alguien de 50-60 años. Son alarmas de FECHA (una acción es de un día, no se repite), y se ponen
 *    al día cada vez que la app lee la lista: se quitan las de acciones cumplidas, movidas o que ya no
 *    están.
 *
 * ## La hora
 *
 * `fecha` es el día del participante (lo decide el servidor en su zona) y `horaInicio` es hora de
 * pared. El instante se arma en la zona del TELÉFONO, igual que los hábitos (`DAILY` con la hora del
 * teléfono): la persona eligió «07:00» mirando su teléfono. Para el padrón (Lima, teléfono en Lima)
 * es lo mismo, y no depende de en qué hora UTC corra esto (probado con el reloj en la madrugada UTC,
 * que en Lima es el día anterior).
 */

export const ANTELACIONES_DE_ACCIONES: readonly number[] = [30, 10, 0];

export interface PreferenciasDeAcciones {
  /** El recordatorio diario «Recordarme mis acciones del día». */
  diarioActivo: boolean;
  /** `HH:mm` del recordatorio diario, en la hora del teléfono. */
  horaDiaria: string;
  /** Minutos antes de cada acción con hora. Vacío = sin aviso; `0` = a la hora. */
  antelaciones: number[];
}

/**
 * Apagado y sin aviso: nadie recibe una alarma que no pidió. Las 08:00 son solo la hora con la que
 * ABRE el selector la primera vez (no hay regla del programa sobre esto; es un valor de arranque).
 */
export const PREFERENCIAS_DE_ACCIONES_POR_DEFECTO: PreferenciasDeAcciones = {
  diarioActivo: false,
  horaDiaria: '08:00',
  antelaciones: [],
};

const CLAVE_PREFERENCIAS = 'renaser.objetivos.recordatorios.preferencias.';
const CLAVE_DIARIO = 'renaser.objetivos.recordatorios.diario.';
const CLAVE_ACCIONES = 'renaser.objetivos.recordatorios.acciones.';

const esHora = (x: unknown): x is string => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);

/** Lee lo guardado. Cualquier cosa rara cae al valor por defecto, campo por campo. */
export function leerPreferenciasDeAcciones(crudo: string | null): PreferenciasDeAcciones {
  const d = PREFERENCIAS_DE_ACCIONES_POR_DEFECTO;
  if (!crudo) return d;
  try {
    const leido = JSON.parse(crudo) as Partial<Record<keyof PreferenciasDeAcciones, unknown>>;
    const antelaciones = Array.isArray(leido.antelaciones)
      ? [...new Set(leido.antelaciones.filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0))]
      : d.antelaciones;
    return {
      diarioActivo: typeof leido.diarioActivo === 'boolean' ? leido.diarioActivo : d.diarioActivo,
      horaDiaria: esHora(leido.horaDiaria) ? leido.horaDiaria : d.horaDiaria,
      antelaciones,
    };
  } catch {
    return d;
  }
}

export async function preferenciasDeAcciones(userId: string): Promise<PreferenciasDeAcciones> {
  try {
    return leerPreferenciasDeAcciones(await AsyncStorage.getItem(CLAVE_PREFERENCIAS + userId));
  } catch {
    return PREFERENCIAS_DE_ACCIONES_POR_DEFECTO;
  }
}

export async function guardarPreferenciasDeAcciones(userId: string, p: PreferenciasDeAcciones): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_PREFERENCIAS + userId, JSON.stringify(p));
  } catch {
    // Guardar una preferencia no puede tumbar la pantalla.
  }
}

async function canalDeObjetivos(userId: string): Promise<CanalDeAlarma> {
  return canalDeAlarma('objetivos', (await preferenciasDeAlarmas(userId)).sonido);
}

async function cancelarIds(ids: string[]): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  for (const id of ids) {
    try {
      await N.cancelScheduledNotificationAsync(id);
    } catch {
      // Una que ya sonó o que el sistema olvidó no es un error.
    }
  }
}

/* ------------------------------------------------------------------------------------------------
 * 1. El recordatorio diario
 * ---------------------------------------------------------------------------------------------- */

export const TEXTO_DIARIO = { titulo: 'Tus acciones del día', cuerpo: 'Revisa las acciones de tus objetivos de hoy.' };

/** Quita el recordatorio diario. Idempotente. */
export async function cancelarRecordatorioDiario(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  try {
    const id = await AsyncStorage.getItem(CLAVE_DIARIO + userId);
    if (!id) return;
    await cancelarIds([id]);
    await AsyncStorage.removeItem(CLAVE_DIARIO + userId);
  } catch {
    // Sin poder leer, no hay id que cancelar.
  }
}

/**
 * Pone el recordatorio diario a `horaHHmm` (hora del teléfono). Reemplaza el anterior: programarlo
 * dos veces deja UNO. Devuelve `false` si no se pudo (sin permiso, web, Expo Go, hora inválida).
 */
export async function programarRecordatorioDiario(userId: string, horaHHmm: string): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N || !esHora(horaHHmm)) return false;
  await cancelarRecordatorioDiario(userId);
  try {
    if (!(await pedirPermiso())) return false;
    const canal = await canalDeObjetivos(userId);
    await asegurarCanal(canal);
    const [h, m] = horaHHmm.split(':').map(Number);
    const id = await N.scheduleNotificationAsync({
      content: { title: TEXTO_DIARIO.titulo, body: TEXTO_DIARIO.cuerpo, sound: canal.sonidoDelAviso },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: h, minute: m, channelId: canal.id },
    });
    await AsyncStorage.setItem(CLAVE_DIARIO + userId, id);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------------------------------
 * 2. El aviso antes de cada acción con hora
 * ---------------------------------------------------------------------------------------------- */

export interface AlarmaDeAccion {
  /** `rocaId|instante`: si cambia la hora o la antelación, cambia la clave y se reemplaza. */
  clave: string;
  fecha: string;
  instanteMs: number;
  titulo: string;
  cuerpo: string;
}

export interface AlarmaDeAccionGuardada {
  id: string;
  fecha: string;
  instanteMs: number;
}

/** Pura: qué alarmas corresponden a estas acciones, con estas antelaciones, a partir de `ahoraMs`. */
export function alarmasDeseadas(
  rocas: RocaDiariaApi[],
  antelaciones: readonly number[],
  ahoraMs: number,
  zona: string | null,
): AlarmaDeAccion[] {
  const deseadas: AlarmaDeAccion[] = [];
  const vistas = new Set<string>();
  for (const roca of rocas) {
    // Una cumplida ya no necesita aviso. Una bloqueada (espera la VERDE de su eje) sí lo lleva: tiene
    // hora, y el aviso es justamente lo que ayuda a cumplir la VERDE.
    if (roca.completada || !roca.horaInicio) continue;
    const hora = roca.horaInicio.slice(0, 5);
    const aLaHora = instanteEnZona(roca.fecha, hora, zona);
    if (aLaHora === null) continue;
    for (const minutos of [...antelaciones].sort((a, b) => b - a)) {
      const instanteMs = aLaHora - minutos * 60_000;
      const clave = `${roca.id}|${instanteMs}`;
      if (instanteMs <= ahoraMs || vistas.has(clave)) continue;
      vistas.add(clave);
      deseadas.push({
        clave,
        fecha: roca.fecha,
        instanteMs,
        titulo: minutos > 0 ? `En ${minutos} min: ${roca.titulo}` : roca.titulo,
        cuerpo: `Te toca a las ${hora}.`,
      });
    }
  }
  return deseadas;
}

/**
 * Pura: qué cancelar y qué programar para que el teléfono quede como `deseadas`. Idempotente: con lo
 * guardado ya al día, no hay nada que hacer.
 *
 * Solo se cancela lo que esta lista puede desmentir: alarmas de un día que la lista TRAE (`fechas`), o
 * que ya pasaron. La lista es la de hoy y mañana; una acción agendada para el viernes conserva su
 * alarma hasta que su día entra en la lista.
 */
export function planDeAlarmasDeAcciones(args: {
  guardadas: Record<string, AlarmaDeAccionGuardada>;
  deseadas: AlarmaDeAccion[];
  fechas: ReadonlySet<string>;
  ahoraMs: number;
}): { cancelar: string[]; programar: AlarmaDeAccion[] } {
  const { guardadas, deseadas, fechas, ahoraMs } = args;
  const claves = new Set(deseadas.map(d => d.clave));
  const cancelar = Object.entries(guardadas)
    .filter(([clave, g]) => !claves.has(clave) && (fechas.has(g.fecha) || g.instanteMs <= ahoraMs))
    .map(([clave]) => clave);
  const programar = deseadas.filter(d => !guardadas[d.clave]);
  return { cancelar, programar };
}

/**
 * Una sola escritura por vez. Plan y el sincronizador de `App.tsx` pueden correr juntos al abrir la
 * app; sin cola, los dos leerían «no hay nada guardado», los dos programarían, y el segundo en escribir
 * pisaría los ids del primero: alarmas duplicadas que ya nadie puede cancelar.
 */
let cola: Promise<unknown> = Promise.resolve();
function enCola<T>(trabajo: () => Promise<T>): Promise<T> {
  const turno = cola.then(trabajo, trabajo);
  cola = turno.catch(() => undefined);
  return turno;
}

async function leerGuardadas(userId: string): Promise<Record<string, AlarmaDeAccionGuardada>> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_ACCIONES + userId);
    const leido = crudo ? JSON.parse(crudo) : {};
    return leido && typeof leido === 'object' && !Array.isArray(leido) ? leido : {};
  } catch {
    return {};
  }
}

async function escribirGuardadas(userId: string, guardadas: Record<string, AlarmaDeAccionGuardada>): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_ACCIONES + userId, JSON.stringify(guardadas));
  } catch {
    // La próxima sincronización lo vuelve a intentar.
  }
}

/**
 * Pone las alarmas de las acciones de acuerdo con la lista que acaba de llegar (hoy y mañana). No
 * pide permiso —corre al abrir una pantalla, no por un toque—: sin permiso solo quita.
 *
 * @param fechasDeLaLista los días que la lista representa aunque vengan vacíos (hoy y mañana). Si no
 *        se pasan, los de las acciones de la lista.
 */
export async function sincronizarAlarmasDeAcciones(
  userId: string,
  rocas: RocaDiariaApi[],
  opciones: { ahoraMs?: number; zona?: string | null; fechasDeLaLista?: string[] } = {},
): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  return enCola(() => sincronizarAhora(userId, rocas, opciones));
}

async function sincronizarAhora(
  userId: string,
  rocas: RocaDiariaApi[],
  opciones: { ahoraMs?: number; zona?: string | null; fechasDeLaLista?: string[] },
): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  const ahoraMs = opciones.ahoraMs ?? Date.now();
  const zona = opciones.zona === undefined ? zonaDelTelefono() : opciones.zona;
  const { antelaciones } = await preferenciasDeAcciones(userId);
  const guardadas = await leerGuardadas(userId);
  const fechas = new Set([...(opciones.fechasDeLaLista ?? []), ...rocas.map(r => r.fecha)]);
  const plan = planDeAlarmasDeAcciones({
    guardadas,
    deseadas: alarmasDeseadas(rocas, antelaciones, ahoraMs, zona),
    fechas,
    ahoraMs,
  });
  if (plan.cancelar.length === 0 && plan.programar.length === 0) return;
  for (const clave of plan.cancelar) {
    await cancelarIds([guardadas[clave].id]);
    delete guardadas[clave];
  }
  const permiso = plan.programar.length > 0 && (await N.getPermissionsAsync().catch(() => ({ granted: false }))).granted;
  if (permiso) {
    const canal = await canalDeObjetivos(userId);
    await asegurarCanal(canal);
    for (const alarma of plan.programar) {
      try {
        const id = await N.scheduleNotificationAsync({
          content: { title: alarma.titulo, body: alarma.cuerpo, sound: canal.sonidoDelAviso },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(alarma.instanteMs), channelId: canal.id },
        });
        guardadas[alarma.clave] = { id, fecha: alarma.fecha, instanteMs: alarma.instanteMs };
      } catch {
        // Una que falla no impide las demás; la próxima lectura la vuelve a intentar.
      }
    }
  }
  await escribirGuardadas(userId, guardadas);
}

/** Quita todas las alarmas de acciones de esta persona en este teléfono (no el recordatorio diario). */
export async function cancelarTodasLasAlarmasDeAcciones(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  return enCola(async () => {
    const guardadas = await leerGuardadas(userId);
    await cancelarIds(Object.values(guardadas).map(g => g.id));
    await escribirGuardadas(userId, {});
  });
}

/** Pide el permiso de avisos (para cuando la persona enciende algo con un toque). */
export async function pedirPermisoDeAvisos(): Promise<boolean> {
  return pedirPermiso();
}

/** Los ids de todas las alarmas de objetivos (diario y por acción): para pasarlas al sonido nuevo. */
export async function idsDeRecordatoriosDeAcciones(userId: string): Promise<string[]> {
  if (!HAY_RECORDATORIOS_LOCALES) return [];
  const ids = Object.values(await leerGuardadas(userId)).map(g => g.id);
  try {
    const diario = await AsyncStorage.getItem(CLAVE_DIARIO + userId);
    if (diario) ids.push(diario);
  } catch {
    // Sin el diario, se pasan las demás.
  }
  return ids;
}
