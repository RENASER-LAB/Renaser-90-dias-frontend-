import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  asegurarCanal,
  cargarNotificaciones,
  HAY_RECORDATORIOS_LOCALES,
  pedirPermiso,
} from '../../habits/notificaciones/recordatoriosDeHabito';
import type { CanalDeAlarma } from '../../alarmas/sonidoDeAlarma';
import type { PagosDeLaPersona } from '../api/pagosSchemas';
import {
  diferenciaDeAlarmas,
  planDeAlarmasDePago,
  PREFIJO_DE_ALARMA_DE_PAGO,
  type AlarmaDePago,
} from './planDeAlarmasDePago';
import { preferenciasDePagos, type PreferenciasDePagos } from './preferenciasDePagos';

/**
 * Los recordatorios de pago en el teléfono (spec 032, decisión del dueño del 2026-11-01: alarmas locales, como las de eventos y acciones).
 *
 * Mismo mecanismo que el resto (`expo-notifications` cargado perezoso —importarlo arriba rompe Expo Go—, canal propio de Android), con tres
 * diferencias que vienen de ser un solo tipo de alarma sencillo:
 * - **El identificador es el instante** (`pago-<ms>`): programar con el mismo id REEMPLAZA la alarma, y lo que empieza con `pago-` es nuestro, así
 *   que se puede cancelar sin llevar la cuenta de cada id.
 * - **Se compara con lo que el sistema tiene** (`getAllScheduledNotificationsAsync`): una alarma que el teléfono olvidó se vuelve a poner y una que ya
 *   no corresponde (la cuota se pagó) se quita. Lo que no cambió no se toca: poner al día no cancela y programa en cada apertura.
 * - **Su propio canal con vibración** (`recordatorios-pagos-vib`, E-641): el sonido es el del teléfono y vibra siempre; Android no puede cambiarlo
 *   después de crearlo, así que el canal se crea con la vibración dicha de forma explícita.
 *
 * Tocar el aviso abre Yo → «Mi ingreso» (ruta `/mi-ingreso`, la misma que un aviso del servidor si algún día lo hubiera).
 *
 * En web y en Expo Go no hay alarmas locales: nada de esto hace nada.
 */

export const CANAL_DE_PAGOS: CanalDeAlarma = {
  id: 'recordatorios-pagos-vib',
  nombre: 'Recordatorios de pago',
  sonidoDelCanal: undefined,
  sonidoDelAviso: true,
  vibra: true,
};

/** La ruta de los avisos de pago: `abrirAviso` la lleva a Yo → «Mi ingreso». */
export const RUTA_DEL_AVISO_DE_PAGO = '/mi-ingreso';

const CLAVE_DE_LO_PUESTO = 'renaser.pagos.alarmas.';

type Puestas = Record<string, string>;

async function leerPuestas(userId: string): Promise<Puestas> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_DE_LO_PUESTO + userId);
    const leido: unknown = crudo ? JSON.parse(crudo) : {};
    if (!leido || typeof leido !== 'object') return {};
    return Object.fromEntries(Object.entries(leido as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Puestas;
  } catch {
    return {};
  }
}

async function escribirPuestas(userId: string, puestas: Puestas): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_DE_LO_PUESTO + userId, JSON.stringify(puestas));
  } catch {
    // Sin poder guardar, la próxima puesta al día compara con el sistema y lo corrige.
  }
}

async function cancelarIds(ids: readonly string[]): Promise<void> {
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

async function identificadoresPuestos(): Promise<Set<string>> {
  const N = cargarNotificaciones();
  if (!N) return new Set();
  try {
    return new Set((await N.getAllScheduledNotificationsAsync()).map(n => n.identifier));
  } catch {
    return new Set();
  }
}

async function programarUna(alarma: AlarmaDePago): Promise<boolean> {
  const N = cargarNotificaciones();
  if (!N) return false;
  try {
    await N.scheduleNotificationAsync({
      identifier: alarma.id,
      content: {
        title: alarma.titulo,
        body: alarma.cuerpo,
        sound: CANAL_DE_PAGOS.sonidoDelAviso,
        data: { route: RUTA_DEL_AVISO_DE_PAGO },
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(alarma.cuandoMs), channelId: CANAL_DE_PAGOS.id },
    });
    return true;
  } catch {
    return false;
  }
}

export type ResultadoDeLaPuestaAlDia = 'puestas' | 'sin_permiso' | 'no_aplica';

/**
 * Pone las alarmas del teléfono de acuerdo con lo que el servidor dice hoy del pago de la persona: quita las de cuotas que se pagaron o ya no
 * existen, y pone las que falten. Se llama al abrir la app, al volver al frente, cada vez que se lee «Mi ingreso» y al cambiar los recordatorios.
 *
 * @param pagos lo último que dijo el servidor; `null` (nada anotado) y «sin cronograma» no tienen alarmas
 * @param pedirElPermiso solo con un toque de la persona (encender o cambiar los recordatorios): al abrir la app no se abre el diálogo del sistema
 */
export async function ponerAlDiaLosRecordatoriosDePago(
  userId: string,
  pagos: PagosDeLaPersona | null,
  opciones: { preferencias?: PreferenciasDePagos; pedirElPermiso?: boolean; ahoraMs?: number } = {},
): Promise<ResultadoDeLaPuestaAlDia> {
  if (!HAY_RECORDATORIOS_LOCALES) return 'no_aplica';
  const N = cargarNotificaciones();
  if (!N) return 'no_aplica';
  const preferencias = opciones.preferencias ?? (await preferenciasDePagos(userId));
  const plan =
    pagos && pagos.modo === 'CON_CRONOGRAMA'
      ? planDeAlarmasDePago({ cuotas: pagos.cuotas, moneda: pagos.moneda, preferencias, ahoraMs: opciones.ahoraMs ?? Date.now() })
      : [];
  const puestas = await leerPuestas(userId);
  const existentes = await identificadoresPuestos();
  const { cancelar, programar } = diferenciaDeAlarmas(plan, puestas, existentes);
  await cancelarIds(cancelar);
  for (const id of cancelar) delete puestas[id];
  let resultado: ResultadoDeLaPuestaAlDia = 'puestas';
  if (programar.length > 0) {
    const permiso = opciones.pedirElPermiso
      ? await pedirPermiso()
      : await N.getPermissionsAsync().then(p => p.granted, () => false);
    if (permiso) {
      await asegurarCanal(CANAL_DE_PAGOS);
      for (const alarma of programar) {
        if (await programarUna(alarma)) puestas[alarma.id] = alarma.firma;
        else delete puestas[alarma.id];
      }
    } else {
      // Sin permiso no hay alarmas: lo anotado de ellas ya no es cierto.
      for (const alarma of programar) delete puestas[alarma.id];
      resultado = 'sin_permiso';
    }
  }
  await escribirPuestas(userId, puestas);
  return resultado;
}

/** Quita todas las alarmas de pago de esta persona en este teléfono (apagar los recordatorios, o cerrar sesión por otro camino). */
export async function cancelarLosRecordatoriosDePago(userId: string): Promise<void> {
  if (!HAY_RECORDATORIOS_LOCALES) return;
  const existentes = [...(await identificadoresPuestos())].filter(id => id.startsWith(PREFIJO_DE_ALARMA_DE_PAGO));
  await cancelarIds([...new Set([...existentes, ...Object.keys(await leerPuestas(userId))])]);
  await escribirPuestas(userId, {});
}
