import { Platform } from 'react-native';
// SOLO tipos: cargar `expo-notifications` de verdad rompe Expo Go (ver `recordatoriosDeHabito.ts`).
import type * as TipoNotificaciones from 'expo-notifications';

import {
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  rutaDelAvisoDeHabito,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { ARCHIVO_CAMPANA, archivoDelCanal } from './sonidoDeAlarma';

/**
 * Vuelve a armar, tal cual, las alarmas locales que el teléfono ya tiene programadas (e2e en
 * emulador del 26/09).
 *
 * ## El bug
 *
 * `expo-notifications` elige la clase de alarma **al programarla** (`ExpoSchedulingDelegate.setupAlarm`):
 * exacta si `canScheduleExactAlarms()` da `true`, inexacta si no. Las alarmas programadas ANTES de que
 * la persona activara «Alarmas y recordatorios» quedaron inexactas — `dumpsys alarm` las mostraba con
 * `window=+1h` (hábitos de las 06:47, 06:50 y 06:52) aunque el permiso ya estuviera dado. Solo se
 * corregían solas después de sonar una vez (tarde).
 *
 * ## El arreglo
 *
 * Al abrir la app y al volver a primer plano (con al menos `INTERVALO_MINIMO_MS` entre corridas) se
 * lee `getAllScheduledNotificationsAsync` y cada alarma se vuelve a programar con **el mismo
 * identificador, el mismo contenido y el mismo disparador**. La librería guarda el pedido por
 * identificador y el `PendingIntent` también es por identificador, así que re-programar REEMPLAZA la
 * alarma (no la duplica) y, con el permiso dado, la deja exacta. Los ids que guardan hábitos, eventos,
 * Despertar, el Código Renaser y las acciones de los objetivos (desde 2026-09-26: el diario y el de
 * cada acción con hora, que son `DAILY` y `DATE` y entran solos) siguen sirviendo para cancelarlas.
 *
 * No necesita servidor, no inventa alarmas (solo las que ya estaban) y no pide permisos. No hay forma
 * de saber desde JS si el permiso ya se dio sin un módulo nativo nuevo; por eso corre siempre, y el
 * intervalo mínimo lo hace barato.
 *
 * Solo Android (el único con alarmas inexactas por permiso) y solo donde hay alarmas locales.
 *
 * ## Lo que NO se toca
 *
 * - Disparadores que no son diario, semanal ni de fecha (la prueba de sonido de 3 s, intervalos).
 * - Una de fecha que ya pasó: está por entregarse o es basura del sistema.
 * - Una diaria o semanal cuya hora nominal fue hace menos de `MARGEN_RECIEN_VENCIDA_MS`: con la alarma
 *   inexacta puede estar todavía por sonar (hasta una hora tarde), y re-programarla la movería al día
 *   (o a la semana) siguiente — se perdería la de hoy. Al sonar, la librería la re-arma sola, ya exacta.
 * - Una que se canceló mientras esto corría: antes de re-programar cada una se relee la lista. Si no,
 *   re-crear un id que Plan o «No voy» acababan de cancelar dejaría una alarma huérfana sonando.
 */

export const INTERVALO_MINIMO_MS = 10 * 60 * 1000;
export const MARGEN_RECIEN_VENCIDA_MS = 2 * 60 * 60 * 1000;

/** Lo que devuelve `getAllScheduledNotificationsAsync` en Android (lo que usa esto). */
export interface AlarmaProgramada {
  identifier: string;
  content: {
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    data?: Record<string, unknown> | null;
    sound?: string | null;
    color?: string | null;
    priority?: string | null;
    autoDismiss?: boolean;
    sticky?: boolean;
    categoryIdentifier?: string | null;
  };
  trigger: unknown;
}

export interface PedidoDeRearmado {
  identifier: string;
  content: TipoNotificaciones.NotificationContentInput;
  trigger: TipoNotificaciones.SchedulableNotificationTriggerInput;
}

type Registro = Record<string, unknown>;

const esNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/**
 * La salida de la librería dice `'default' | 'custom' | null`; la entrada quiere el booleano o el
 * archivo. `'custom'` no dice cuál: desde que hay voces (2026-09-26) se deduce del canal, que es uno
 * por sonido. En Android 8+ igual manda el del canal; esto es para que el aviso no lo contradiga.
 */
function sonidoDeEntrada(sonido: unknown, canalId: unknown): boolean | string {
  if (sonido === 'default') return true;
  if (sonido === 'custom') return archivoDelCanal(canalId) ?? ARCHIVO_CAMPANA;
  return false;
}

function contenidoDeEntrada(c: AlarmaProgramada['content'], canalId: unknown): TipoNotificaciones.NotificationContentInput {
  const contenido: TipoNotificaciones.NotificationContentInput = {
    title: c.title ?? null,
    body: c.body ?? null,
    sound: sonidoDeEntrada(c.sound, canalId),
  };
  if (c.subtitle) contenido.subtitle = c.subtitle;
  if (c.data && typeof c.data === 'object') contenido.data = c.data;
  if (c.color) contenido.color = c.color;
  if (c.priority) contenido.priority = c.priority;
  if (typeof c.autoDismiss === 'boolean') contenido.autoDismiss = c.autoDismiss;
  if (typeof c.sticky === 'boolean') contenido.sticky = c.sticky;
  if (c.categoryIdentifier) contenido.categoryIdentifier = c.categoryIdentifier;
  return contenido;
}

/** Cuánto hace que tocó por última vez una alarma diaria/semanal (hora del teléfono), en ms. */
function desdeLaUltimaHoraNominal(ahora: Date, hora: number, minuto: number, weekday?: number): number {
  const nominal = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hora, minuto, 0, 0);
  if (weekday === undefined) {
    if (nominal.getTime() > ahora.getTime()) nominal.setDate(nominal.getDate() - 1);
    return ahora.getTime() - nominal.getTime();
  }
  // `weekday` de expo: 1 = domingo … 7 = sábado; `getDay()`: 0 = domingo.
  let dias = (ahora.getDay() - (weekday - 1) + 7) % 7;
  nominal.setDate(nominal.getDate() - dias);
  if (nominal.getTime() > ahora.getTime()) {
    dias = 7;
    nominal.setDate(nominal.getDate() - dias);
  }
  return ahora.getTime() - nominal.getTime();
}

function disparadorDeEntrada(
  crudo: unknown,
  ahoraMs: number,
  margenMs: number,
): TipoNotificaciones.SchedulableNotificationTriggerInput | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const t = crudo as Registro;
  const canal = typeof t.channelId === 'string' && t.channelId ? { channelId: t.channelId } : {};
  const ahora = new Date(ahoraMs);
  if (t.type === 'daily' && esNumero(t.hour) && esNumero(t.minute)) {
    if (desdeLaUltimaHoraNominal(ahora, t.hour, t.minute) < margenMs) return null;
    return { type: 'daily' as TipoNotificaciones.SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute, ...canal };
  }
  if (t.type === 'weekly' && esNumero(t.weekday) && esNumero(t.hour) && esNumero(t.minute)) {
    if (desdeLaUltimaHoraNominal(ahora, t.hour, t.minute, t.weekday) < margenMs) return null;
    return {
      type: 'weekly' as TipoNotificaciones.SchedulableTriggerInputTypes.WEEKLY,
      weekday: t.weekday,
      hour: t.hour,
      minute: t.minute,
      ...canal,
    };
  }
  if (t.type === 'date' && esNumero(t.value) && t.value > ahoraMs) {
    return { type: 'date' as TipoNotificaciones.SchedulableTriggerInputTypes.DATE, date: t.value, ...canal };
  }
  return null;
}

/**
 * Qué alarmas se re-arman y con qué pedido. Pura: la prueban los tests.
 *
 * `margenMs` es cuánto se respeta una diaria o semanal recién vencida (ver arriba). El cambio de
 * sonido (`cambioDeSonido.ts`) pasa `0`: si la saltara, esa alarma diaria quedaría en el canal viejo
 * —con el sonido viejo— todos los días, no solo hoy.
 */
export function planDeRearmado(
  programadas: AlarmaProgramada[],
  ahoraMs: number,
  margenMs: number = MARGEN_RECIEN_VENCIDA_MS,
): PedidoDeRearmado[] {
  const pedidos: PedidoDeRearmado[] = [];
  const vistos = new Set<string>();
  for (const alarma of programadas) {
    if (!alarma?.identifier || vistos.has(alarma.identifier)) continue;
    const trigger = disparadorDeEntrada(alarma.trigger, ahoraMs, margenMs);
    if (!trigger) continue;
    vistos.add(alarma.identifier);
    const canalId = (alarma.trigger as Registro | null)?.channelId;
    pedidos.push({ identifier: alarma.identifier, content: contenidoDeEntrada(alarma.content ?? {}, canalId), trigger });
  }
  return pedidos;
}

/** Si toca correr: siempre la primera vez (arranque); después, con `INTERVALO_MINIMO_MS` de por medio. */
export function tocaRearmar(ultimaMs: number | null, ahoraMs: number): boolean {
  return ultimaMs === null || ahoraMs - ultimaMs >= INTERVALO_MINIMO_MS;
}

let ultimaCorrida: number | null = null;
let corriendo = false;

/** Solo para los tests. */
export function olvidarUltimaCorrida(): void {
  ultimaCorrida = null;
  corriendo = false;
}

/**
 * Re-arma las alarmas ya programadas. Devuelve cuántas re-armó, o `null` si no correspondía correr
 * (otra plataforma, intervalo mínimo, o ya había una corrida en curso).
 */
export async function rearmarAlarmasProgramadas(
  ahoraMs: number = Date.now(),
  plataforma: string = Platform.OS,
): Promise<number | null> {
  if (!HAY_RECORDATORIOS_LOCALES || plataforma !== 'android') return null;
  if (corriendo || !tocaRearmar(ultimaCorrida, ahoraMs)) return null;
  const N = cargarNotificaciones();
  if (!N) return null;
  corriendo = true;
  ultimaCorrida = ahoraMs;
  try {
    const plan = planDeRearmado((await N.getAllScheduledNotificationsAsync()) as AlarmaProgramada[], ahoraMs);
    let rearmadas = 0;
    for (const pedido of plan) {
      try {
        // Se relee justo antes: si Plan, «No voy» o Yo → Alarmas la cancelaron mientras tanto, no se
        // la resucita (su id ya no está guardado en ningún lado y no se podría volver a cancelar).
        const vigentes = await N.getAllScheduledNotificationsAsync();
        if (!vigentes.some(v => v.identifier === pedido.identifier)) continue;
        await N.scheduleNotificationAsync(pedido);
        rearmadas++;
      } catch {
        // Una que falla no impide las demás.
      }
    }
    return rearmadas;
  } catch {
    return 0;
  } finally {
    corriendo = false;
  }
}

/**
 * Qué alarmas de hábitos hay que volver a programar para que lleven su ruta (D-218, 2026-09-28). Pura.
 *
 * Las alarmas programadas antes de D-218 no llevan `data.route`, y tocarlas solo abría la app. Se
 * re-programan con el MISMO id, contenido y disparador (como el rearmado de arriba), sumando la ruta
 * `/habitos/{id}`: sin la dimensión, que el teléfono no guardó; Training la busca por el id. Una diaria
 * que acaba de sonar se deja para la próxima vuelta, por el mismo motivo que en `planDeRearmado`.
 */
export function planDeRutasDeHabitos(
  programadas: AlarmaProgramada[],
  idsPorHabito: ReadonlyMap<string, string[]>,
  ahoraMs: number,
): PedidoDeRearmado[] {
  const habitoDelId = new Map<string, string>();
  idsPorHabito.forEach((ids, habitoId) => ids.forEach(id => habitoDelId.set(id, habitoId)));
  const sinRuta = programadas.filter(a => {
    const datos = a?.content?.data as Registro | null | undefined;
    return habitoDelId.has(a?.identifier) && typeof datos?.route !== 'string';
  });
  return planDeRearmado(sinRuta, ahoraMs).map(pedido => ({
    ...pedido,
    content: {
      ...pedido.content,
      data: { ...(pedido.content.data ?? {}), route: rutaDelAvisoDeHabito(habitoDelId.get(pedido.identifier) as string) },
    },
  }));
}

/** Aplica `planDeRutasDeHabitos` en el teléfono (solo Android). Devuelve cuántas completó. */
export async function agregarRutaALasAlarmasDeHabitos(
  idsPorHabito: ReadonlyMap<string, string[]>,
  ahoraMs: number = Date.now(),
  plataforma: string = Platform.OS,
): Promise<number> {
  if (!HAY_RECORDATORIOS_LOCALES || plataforma !== 'android' || idsPorHabito.size === 0) return 0;
  const N = cargarNotificaciones();
  if (!N) return 0;
  try {
    const plan = planDeRutasDeHabitos((await N.getAllScheduledNotificationsAsync()) as AlarmaProgramada[], idsPorHabito, ahoraMs);
    let completadas = 0;
    for (const pedido of plan) {
      try {
        await N.scheduleNotificationAsync(pedido);
        completadas++;
      } catch {
        // Una que falla no impide las demás.
      }
    }
    return completadas;
  } catch {
    return 0;
  }
}
