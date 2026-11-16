import { Linking, Platform } from 'react-native';

import type { LecturaCrudaDelDia, RegistroDeSalud } from '../types/pasos.types';
import { ORIGEN_APPLE_DEL_RELOJ, ORIGEN_APPLE_DEL_TELEFONO, origenDeAppDeApple } from '../utils/fuentesDeSalud';

/**
 * El único lugar que habla con la app Salud de Apple, HealthKit (spec 037, D-362, FR-016 a FR-021). Es el equivalente de
 * `saludDeHealthConnect.ts` en iPhone, con las mismas funciones: la app no ramifica por plataforma (`saludConectada.ios.ts` lo elige).
 * **Solo lectura**, solo Pasos y Distancia caminando y corriendo: no se escribe nada, no se pide entrega en segundo plano ni otros datos.
 *
 * - `soporteDeSalud`: HealthKit dice que el dispositivo tiene datos de salud. Sin Salud (un iPad sin la app) la app se queda con la
 *   captura y no ofrece instalar nada.
 * - **Apple no dice si la lectura se negó** (privacidad de Apple): `permisosDeSalud` solo sabe si el sistema ya mostró el diálogo. Si la
 *   persona lo negó, la lectura sale vacía y la pantalla dice «Todavía no vemos pasos hoy» (con la captura de siempre).
 * - `leerLosPasosDelDia`: estadísticas acumuladas del día. HealthKit ya elimina duplicados entre iPhone, Apple Watch y apps con la prioridad
 *   que fijó la persona en Salud (como el agregado de Health Connect); se descartan los datos escritos a mano (`HKWasUserEntered`).
 *
 * La librería se carga al usarla (no al importar el archivo): es un módulo nativo que solo existe en iOS y así nada que importe este
 * archivo —una prueba, otra pantalla— lo despierta antes de tiempo.
 */

type LibreriaDeHealthKit = typeof import('@kingstinct/react-native-healthkit');

function healthkit(): LibreriaDeHealthKit {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@kingstinct/react-native-healthkit') as LibreriaDeHealthKit;
}

const PASOS = 'HKQuantityTypeIdentifierStepCount';
const DISTANCIA = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
/** Lo único que se pide: leer pasos y distancia. Sin `toShare`: la app no escribe en Salud. */
const PERMISOS_DE_LECTURA = [PASOS, DISTANCIA] as const;

/** `HKAuthorizationRequestStatus.unnecessary`: el sistema ya mostró el diálogo (no dice qué contestó la persona). */
const YA_SE_PREGUNTO = 2;

/** Lo que la persona escribió a mano en Salud no cuenta (como los `MANUAL_ENTRY` de Health Connect, FR-005). */
const NO_ESCRITO_A_MANO = [{ metadata: { withMetadataKey: 'HKWasUserEntered', value: true } }];

const ABRIR_SALUD = 'x-apple-health://';

/** Para quien lo use en Android: aquí no se usa nunca, pero la forma es la misma que en `saludDeHealthConnect`. */
export const API_MINIMA_DE_ANDROID = 34;

export async function soporteDeSalud(): Promise<'disponible' | 'no-disponible'> {
  if (Platform.OS !== 'ios') return 'no-disponible';
  try {
    return (await healthkit().isHealthDataAvailableAsync()) ? 'disponible' : 'no-disponible';
  } catch {
    return 'no-disponible';
  }
}

/** `otorgados` si el sistema ya mostró el diálogo de Salud; `faltan` si todavía no (o si no se pudo preguntar). */
export async function permisosDeSalud(_opciones: { reintentos?: number; esperaMs?: number } = {}): Promise<'otorgados' | 'faltan'> {
  try {
    const estado = await healthkit().getRequestStatusForAuthorization({ toRead: [...PERMISOS_DE_LECTURA] });
    return Number(estado) === YA_SE_PREGUNTO ? 'otorgados' : 'faltan';
  } catch (error) {
    console.warn('[pasos] no se pudo preguntar a Salud por el permiso:', error);
    return 'faltan';
  }
}

/**
 * Abre el diálogo de Salud (solo lectura de pasos y distancia). `true` si terminó: iOS no dice qué contestó la persona. Si ya se
 * le preguntó antes no se abre otra vez (el sistema no lo mostraría de nuevo): se da por hecho y, si ella lo negó, la lectura sale vacía.
 */
export async function pedirPermisosDeSalud(): Promise<boolean> {
  if ((await soporteDeSalud()) !== 'disponible') return false;
  if ((await permisosDeSalud()) === 'otorgados') return true;
  try {
    return (await healthkit().requestAuthorization({ toRead: [...PERMISOS_DE_LECTURA] })) === true;
  } catch (error) {
    console.warn('[pasos] falló el diálogo de permisos de Salud:', error);
    return false;
  }
}

/**
 * Abre la app Salud: ahí se cambia qué fuente va primero y, en Datos y acceso, el permiso de Renaser (iOS no deja abrir esa pantalla
 * directamente). Sin Salud no hay nada que abrir.
 */
export function abrirHealthConnect(): void {
  try {
    void Linking.openURL(ABRIR_SALUD).catch(() => undefined);
  } catch {
    /* sin la app Salud no hay nada que abrir */
  }
}

type FuenteDeHealthKit = { name?: string; bundleIdentifier?: string };

/** Una fuente de HealthKit como registro: el nombre del dispositivo de Apple lleva el de la persona, así que NO se copia. */
function aRegistro(fuente: FuenteDeHealthKit): RegistroDeSalud {
  const nombre = (fuente.name ?? '').trim();
  const paquete = fuente.bundleIdentifier ?? '';
  if (paquete.startsWith('com.apple.health')) {
    if (/watch/i.test(nombre)) return { origen: ORIGEN_APPLE_DEL_RELOJ, metodo: 2, tipoDeDispositivo: 1, modelo: 'Apple Watch' };
    return { origen: ORIGEN_APPLE_DEL_TELEFONO, metodo: 2, tipoDeDispositivo: 2, modelo: null };
  }
  return { origen: origenDeAppDeApple(paquete || nombre), metodo: 2, modelo: nombre || null };
}

async function sumaDelDia(tipo: typeof PASOS | typeof DISTANCIA, unidad: 'count' | 'm', desde: Date, hasta: Date) {
  const respuesta = await healthkit().queryStatisticsForQuantity(tipo, ['cumulativeSum'], {
    unit: unidad,
    filter: { date: { startDate: desde, endDate: hasta, strictStartDate: true, strictEndDate: true }, NOT: NO_ESCRITO_A_MANO },
  } as never);
  const cantidad = respuesta.sumQuantity?.quantity;
  return { total: typeof cantidad === 'number' && Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null, fuentes: respuesta.sources ?? [] };
}

/**
 * Los pasos y la distancia de `desde` a `hasta` (hoy, de las 00:00 al instante actual). La distancia es un extra: si falla, los km se
 * estiman con los pasos. Si fallan los pasos, la lectura falla y la pantalla lo muestra como «sin datos».
 */
export async function leerLosPasosDelDia(desde: Date, hasta: Date): Promise<LecturaCrudaDelDia> {
  const [pasos, distancia] = await Promise.all([
    sumaDelDia(PASOS, 'count', desde, hasta),
    sumaDelDia(DISTANCIA, 'm', desde, hasta).catch(error => {
      console.warn('[pasos] no se pudo leer la distancia de Salud; se estiman los km con los pasos:', error);
      return { total: null, fuentes: [] as FuenteDeHealthKit[] };
    }),
  ]);
  if (pasos.total == null && distancia.total == null) return { pasos: null, distanciaM: null, origenesUsados: [], registros: [] };

  const porOrigen = new Map<string, RegistroDeSalud>();
  for (const fuente of [...pasos.fuentes, ...distancia.fuentes]) {
    const registro = aRegistro(fuente);
    if (!porOrigen.has(registro.origen)) porOrigen.set(registro.origen, registro);
  }
  // Hubo datos pero HealthKit no dijo de quién: se da por el iPhone para que se pueda registrar.
  if (porOrigen.size === 0) porOrigen.set(ORIGEN_APPLE_DEL_TELEFONO, aRegistro({ name: 'iPhone', bundleIdentifier: 'com.apple.health' }));
  return {
    pasos: pasos.total,
    distanciaM: distancia.total,
    origenesUsados: [...porOrigen.keys()],
    registros: [...porOrigen.values()],
  };
}
