import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  pedirPermiso,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import { preferenciasDeAlarmas } from '../../alarmas/preferenciasDeAlarmas';
import { canalDeAlarma } from '../../alarmas/sonidoDeAlarma';
import type { Ocurrencia } from '../types/eventos.types';
import {
  claveDeOcurrencia,
  instantesDeAviso,
  planDeSincronizacion,
  textoDeLaAlarma,
  type AlarmaGuardada,
} from '../utils/alarmasDelEvento';

/**
 * Las alarmas de eventos en el teléfono (E-7): «Voy» la programa; «No voy», o que el evento se
 * cancele, la quita.
 *
 * Mismo mecanismo que las de hábitos (`recordatoriosDeHabito.ts`): `expo-notifications` cargado
 * perezoso —importarlo arriba rompe Expo Go—, un canal propio de Android y los ids guardados por
 * persona, porque el id es la ÚNICA forma de cancelar una alarma después.
 *
 * Tocar la alarma abre el detalle del evento: lleva la misma ruta que el push del servidor
 * (`/eventos/{id}`), y la atiende el mismo `rutaDeAviso`.
 *
 * En web y en Expo Go no hay alarmas locales: todo esto no hace nada y devuelve `false`.
 */

const CLAVE = 'renaser.eventos.alarmas.';

async function leerGuardadas(userId: string): Promise<Record<string, AlarmaGuardada>> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE + userId);
    const leido = crudo ? JSON.parse(crudo) : {};
    return leido && typeof leido === 'object' ? (leido as Record<string, AlarmaGuardada>) : {};
  } catch {
    return {};
  }
}

async function escribirGuardadas(userId: string, guardadas: Record<string, AlarmaGuardada>): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE + userId, JSON.stringify(guardadas));
  } catch {
    // Sin poder guardar, la próxima sincronización vuelve a intentarlo.
  }
}

async function cancelarIds(ids: string[]): Promise<void> {
  const N = cargarNotificaciones();
  if (!N) return;
  for (const id of ids) {
    try {
      await N.cancelScheduledNotificationAsync(id);
    } catch {
      // Una que ya sonó o que el sistema ya olvidó no es un error.
    }
  }
}

/** Programa las alarmas de UNA ocurrencia. Devuelve los ids, o `null` si no se pudo. */
async function programarUna(oc: Ocurrencia, ahoraMs: number, userId: string): Promise<string[] | null> {
  const N = cargarNotificaciones();
  if (!N) return null;
  const instantes = instantesDeAviso(oc, ahoraMs);
  if (instantes.length === 0) return [];
  const canal = canalDeAlarma('eventos', (await preferenciasDeAlarmas(userId)).sonido);
  await asegurarCanal(canal);
  const ids: string[] = [];
  for (const cuando of instantes) {
    const texto = textoDeLaAlarma(oc, cuando);
    ids.push(
      await N.scheduleNotificationAsync({
        content: {
          title: texto.titulo,
          body: texto.cuerpo,
          sound: canal.sonidoDelAviso,
          data: { route: `/eventos/${encodeURIComponent(oc.evento.id)}` },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(cuando), channelId: canal.id },
      }),
    );
  }
  return ids;
}

export type ResultadoAlarma = 'programada' | 'sin_permiso' | 'no_aplica' | 'apagadas' | 'sin_aviso_futuro';

/**
 * «Voy»: programa la alarma de esa fecha. Reemplaza la que hubiera (responder «Voy» dos veces no
 * duplica nada).
 */
export async function programarAlarmaDeEvento(userId: string, oc: Ocurrencia, ahoraMs = Date.now()): Promise<ResultadoAlarma> {
  if (!HAY_RECORDATORIOS_LOCALES) return 'no_aplica';
  if (!(await preferenciasDeAlarmas(userId)).eventosActivas) return 'apagadas';
  if (instantesDeAviso(oc, ahoraMs).length === 0) return 'sin_aviso_futuro';
  if (!(await pedirPermiso())) return 'sin_permiso';
  await cancelarAlarmaDeEvento(userId, oc.evento.id, oc.inicioOcurrencia);
  try {
    const ids = await programarUna(oc, ahoraMs, userId);
    if (ids === null) return 'no_aplica';
    const guardadas = await leerGuardadas(userId);
    guardadas[claveDeOcurrencia(oc.evento.id, oc.inicioOcurrencia)] = { ids, iniciaEn: oc.iniciaEn };
    await escribirGuardadas(userId, guardadas);
    return 'programada';
  } catch {
    return 'sin_permiso';
  }
}

/** «No voy»: quita la alarma de esa fecha. Sin `inicioOcurrencia`, las de todas las fechas del evento. */
export async function cancelarAlarmaDeEvento(userId: string, eventoId: string, inicioOcurrencia?: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const guardadas = await leerGuardadas(userId);
  let cambio = false;
  for (const clave of Object.keys(guardadas)) {
    const coincide = inicioOcurrencia
      ? clave === claveDeOcurrencia(eventoId, inicioOcurrencia)
      : clave.startsWith(`${eventoId}|`);
    if (!coincide) continue;
    await cancelarIds(guardadas[clave].ids);
    delete guardadas[clave];
    cambio = true;
  }
  if (cambio) await escribirGuardadas(userId, guardadas);
}

/**
 * Pone las alarmas del teléfono de acuerdo con la lista que acaba de llegar del servidor: quita las de
 * eventos cancelados o a los que ya no va, y pone las que falten. Se llama cada vez que se lee la
 * lista, y al apagar o prender las alarmas de eventos en Yo.
 */
export async function sincronizarAlarmasDeEventos(
  userId: string,
  ocurrencias: Ocurrencia[],
  ventana: { desdeMs: number; hastaMs: number },
  ahoraMs = Date.now(),
): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const guardadas = await leerGuardadas(userId);
  const { eventosActivas } = await preferenciasDeAlarmas(userId);
  const plan = planDeSincronizacion({ guardadas, ocurrencias, ventana, ahoraMs, activas: eventosActivas });
  if (plan.cancelar.length === 0 && plan.programar.length === 0) return;
  for (const clave of plan.cancelar) {
    await cancelarIds(guardadas[clave].ids);
    delete guardadas[clave];
  }
  // Programar sin pedir permiso: esto corre al abrir una pantalla, no por un toque. Si no hay
  // permiso, se deja para el próximo «Voy», que sí lo pide.
  const N = cargarNotificaciones();
  const permiso = N ? (await N.getPermissionsAsync().catch(() => ({ granted: false }))).granted : false;
  if (permiso) {
    for (const oc of plan.programar) {
      try {
        const ids = await programarUna(oc, ahoraMs, userId);
        if (ids) guardadas[claveDeOcurrencia(oc.evento.id, oc.inicioOcurrencia)] = { ids, iniciaEn: oc.iniciaEn };
      } catch {
        // Una que falla no impide las demás.
      }
    }
  }
  await escribirGuardadas(userId, guardadas);
}

/** Apaga todas las alarmas de eventos de esta persona en este teléfono (Yo → Alarmas). */
export async function cancelarTodasLasAlarmasDeEventos(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const guardadas = await leerGuardadas(userId);
  for (const alarma of Object.values(guardadas)) await cancelarIds(alarma.ids);
  await escribirGuardadas(userId, {});
}

/** Vuelve a programar las alarmas guardadas con el sonido nuevo (cambiar el sonido cambia el canal). */
export async function reprogramarConSonidoNuevo(userId: string, ocurrencias: Ocurrencia[], ahoraMs = Date.now()): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const guardadas = await leerGuardadas(userId);
  for (const oc of ocurrencias) {
    const clave = claveDeOcurrencia(oc.evento.id, oc.inicioOcurrencia);
    if (!guardadas[clave]) continue;
    await cancelarIds(guardadas[clave].ids);
    try {
      const ids = await programarUna(oc, ahoraMs, userId);
      if (ids) guardadas[clave] = { ids, iniciaEn: oc.iniciaEn };
      else delete guardadas[clave];
    } catch {
      delete guardadas[clave];
    }
  }
  await escribirGuardadas(userId, guardadas);
}

/**
 * Al abrir la app: si este teléfono tiene alguna alarma de evento puesta, relee la lista y la pone al
 * día. Es lo que quita la alarma de un evento cancelado aunque la persona no vuelva a entrar a
 * Eventos. Sin alarmas guardadas no pide nada: quien no usa eventos no paga la lectura.
 */
export async function sincronizarAlAbrir(
  userId: string,
  listar: (ahoraMs: number) => Promise<Ocurrencia[]>,
  diasALaVista: number,
  ahoraMs = Date.now(),
): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const guardadas = await leerGuardadas(userId);
  if (Object.keys(guardadas).length === 0) return;
  const lista = await listar(ahoraMs);
  await sincronizarAlarmasDeEventos(
    userId,
    lista,
    { desdeMs: ahoraMs - 60 * 60 * 1000, hastaMs: ahoraMs + diasALaVista * 24 * 60 * 60 * 1000 },
    ahoraMs,
  );
}
