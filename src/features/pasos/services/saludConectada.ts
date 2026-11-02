import { Platform } from 'react-native';
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import type { LecturaCrudaDelDia, RegistroDeSalud } from '../types/pasos.types';
import { origenesDelDia } from '../utils/fuentesDeSalud';

/**
 * El único lugar que habla con Health Connect (spec 037, D-310). La app lee de ahí los pasos y la distancia del día; el
 * conteo lo hace el sistema (Android 14 o más) y los relojes, no nosotros. **Solo lectura**, solo `Steps` y `Distance`:
 * nada de frecuencia cardiaca, sueño, ejercicio, ubicación, segundo plano ni historial.
 *
 * - `soporteDeSalud`: Android 14 o más (API 34) **y** Health Connect presente y listo. En cualquier otro caso —Android
 *   menor a 14, un teléfono sin Health Connect, Huawei sin Google— la app se queda con la captura. **No se ofrece instalar nada**
 *   (decisión del dueño, 2026-11-02).
 * - `leerLosPasosDelDia`: lee los REGISTROS del día para saber qué orígenes son de fiar (método de registro) y pide después
 *   el AGREGADO solo a esos orígenes: Health Connect elimina duplicados con la prioridad que fijó la persona, así que el
 *   teléfono y el reloj no se suman dos veces.
 *
 * Este archivo es nativo de Android; en la web existe `saludConectada.web.ts` con la misma forma y sin la librería.
 */

/** Android 14 = API 34: desde ahí el sistema cuenta los pasos del teléfono en cuanto una app tiene permiso de lectura. */
export const API_MINIMA_DE_ANDROID = 34;
/** Registros por página y páginas como máximo: un día completo cabe de sobra (un registro por minuto en el peor caso: 1 440). */
const REGISTROS_POR_PAGINA = 1000;
const PAGINAS_COMO_MAXIMO = 20;

const PERMISOS_DE_LECTURA = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
] as const;

let inicializacion: Promise<boolean> | null = null;

export async function soporteDeSalud(): Promise<'disponible' | 'no-disponible'> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < API_MINIMA_DE_ANDROID) return 'no-disponible';
  try {
    if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return 'no-disponible';
    inicializacion = inicializacion ?? initialize();
    return (await inicializacion) ? 'disponible' : 'no-disponible';
  } catch {
    inicializacion = null;
    return 'no-disponible';
  }
}

function tienePasos(permisos: readonly { accessType: string; recordType: string }[]): boolean {
  return permisos.some(p => p.accessType === 'read' && p.recordType === 'Steps');
}

/** `otorgados` si la persona dejó leer los pasos. La distancia es un extra: sin ella se estiman los km con los pasos. */
export async function permisosDeSalud(): Promise<'otorgados' | 'faltan'> {
  try {
    return tienePasos(await getGrantedPermissions()) ? 'otorgados' : 'faltan';
  } catch {
    return 'faltan';
  }
}

/** Abre la pantalla de permisos del sistema (Pasos y Distancia, solo lectura). `true` si dejó leer los pasos. */
export async function pedirPermisosDeSalud(): Promise<boolean> {
  try {
    return tienePasos(await requestPermission([...PERMISOS_DE_LECTURA]));
  } catch {
    return false;
  }
}

/** La pantalla de Health Connect: ahí se quita el permiso o se cambia qué fuente va primero. */
export function abrirHealthConnect(): void {
  try {
    openHealthConnectSettings();
  } catch {
    /* sin Health Connect no hay nada que abrir */
  }
}

type Metadatos = { dataOrigin?: string; recordingMethod?: number; device?: { type?: number; model?: string; manufacturer?: string } };

function aRegistro(metadata: Metadatos | undefined): RegistroDeSalud {
  return {
    origen: metadata?.dataOrigin ?? '',
    metodo: metadata?.recordingMethod,
    tipoDeDispositivo: metadata?.device?.type,
    modelo: metadata?.device?.model ?? null,
    fabricante: metadata?.device?.manufacturer ?? null,
  };
}

async function registrosDelDia(tipo: 'Steps' | 'Distance', desde: Date, hasta: Date): Promise<RegistroDeSalud[]> {
  const registros: RegistroDeSalud[] = [];
  let pageToken: string | undefined;
  for (let pagina = 0; pagina < PAGINAS_COMO_MAXIMO; pagina += 1) {
    const respuesta = await readRecords(tipo, {
      timeRangeFilter: { operator: 'between', startTime: desde.toISOString(), endTime: hasta.toISOString() },
      pageSize: REGISTROS_POR_PAGINA,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const registro of respuesta.records) registros.push(aRegistro((registro as unknown as { metadata?: Metadatos }).metadata));
    pageToken = respuesta.pageToken;
    if (!pageToken) break;
  }
  return registros.filter(r => r.origen !== '');
}

/**
 * Los pasos y la distancia de `desde` a `hasta` (hoy, de las 00:00 al instante actual). El agregado se pide SOLO a los orígenes
 * limpios: lo escrito a mano o de método desconocido no entra al número.
 */
export async function leerLosPasosDelDia(desde: Date, hasta: Date): Promise<LecturaCrudaDelDia> {
  const registros = [...(await registrosDelDia('Steps', desde, hasta)), ...(await registrosDelDia('Distance', desde, hasta))];
  const { limpios } = origenesDelDia(registros);
  if (limpios.length === 0) return { pasos: null, distanciaM: null, origenesUsados: [], registros };
  const rango = { operator: 'between', startTime: desde.toISOString(), endTime: hasta.toISOString() } as const;
  const [pasos, distancia] = await Promise.all([
    aggregateRecord({ recordType: 'Steps', timeRangeFilter: rango, dataOriginFilter: limpios }),
    aggregateRecord({ recordType: 'Distance', timeRangeFilter: rango, dataOriginFilter: limpios }),
  ]);
  const totalDePasos = pasos.COUNT_TOTAL;
  const metros = distancia.DISTANCE?.inMeters;
  return {
    pasos: typeof totalDePasos === 'number' && totalDePasos > 0 ? totalDePasos : null,
    distanciaM: typeof metros === 'number' && metros > 0 ? metros : null,
    origenesUsados: [...new Set([...(pasos.dataOrigins ?? []), ...(distancia.dataOrigins ?? [])])],
    registros,
  };
}
