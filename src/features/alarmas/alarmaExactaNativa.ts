import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

import { hayQueRevisarAlarmaExacta } from './permisoDeAlarmaExacta';

/**
 * Si Android deja programar alarmas EXACTAS, leído del sistema por el módulo nativo local
 * `modules/renaser-alarmas` (D-217, 2026-09-28).
 *
 * - `concedido`: las alarmas salen a la hora exacta.
 * - `denegado`: salen inexactas, hasta ~40 min tarde (E-314). Hay que pedir «Alarmas y recordatorios».
 * - `no_hace_falta`: Android 11 o menos, iOS o web.
 * - `desconocido`: un APK compilado antes de este módulo. La app se comporta como antes: muestra el
 *   aviso siempre, porque no puede saberlo.
 *
 * `requireOptionalNativeModule` y no `requireNativeModule`: este último lanza al importarse si el
 * binario instalado no trae el módulo (lo que pasó con el dictado, `useDictado.ts`), y la app sin
 * actualizar por aire no puede caerse por un JS nuevo sobre un APK viejo.
 */
export type EstadoDeAlarmaExacta = 'concedido' | 'denegado' | 'no_hace_falta' | 'desconocido';

/**
 * Spec 007: lo que el módulo cuenta de una posible detención forzada. `cuando` es el instante (ms desde 1970) de
 * la detención o del arranque que la siguió; `motivo`, un resumen corto que el módulo también escribe en el log.
 */
export interface DetencionForzada {
  detenida: boolean;
  cuando: number | null;
  motivo: string | null;
}

/** Qué pantalla abrió `abrirAjusteDeLaMarca`: la de la marca, la lista de batería del sistema o los ajustes de Renaser. */
export type AjusteDeLaMarcaAbierto = 'pantalla_de_la_marca' | 'lista_de_bateria' | 'ajustes_de_la_app' | 'ninguna';

const PASOS_DE_LA_MARCA: readonly AjusteDeLaMarcaAbierto[] = [
  'pantalla_de_la_marca',
  'lista_de_bateria',
  'ajustes_de_la_app',
  'ninguna',
];

/**
 * Las dos funciones de la spec 007 son OPCIONALES: un APK compilado antes de ellas tiene el módulo (las
 * dos de arriba) pero no estas, y la app no puede caerse por eso (`contracts/modulo-renaser-alarmas.md`).
 */
interface ModuloDeAlarmas {
  puedeProgramarAlarmasExactas(): boolean | null;
  abrirAjusteDeAlarmasExactas(): boolean;
  detencionForzadaDesde?(desdeMs: number): DetencionForzada;
  abrirAjusteDeLaMarca?(): AjusteDeLaMarcaAbierto;
}

let modulo: ModuloDeAlarmas | null | undefined;

function moduloNativo(): ModuloDeAlarmas | null {
  if (modulo === undefined) {
    try {
      modulo = requireOptionalNativeModule<ModuloDeAlarmas>('RenaserAlarmas');
    } catch {
      modulo = null;
    }
  }
  return modulo;
}

/** Solo para las pruebas. */
export function usarModuloDeAlarmas(falso: ModuloDeAlarmas | null): void {
  modulo = falso;
}

export function estadoDeAlarmaExacta(
  sistema: string = Platform.OS,
  version: string | number = Platform.Version,
): EstadoDeAlarmaExacta {
  if (!hayQueRevisarAlarmaExacta(sistema, version)) return 'no_hace_falta';
  const nativo = moduloNativo();
  if (!nativo) return 'desconocido';
  try {
    const puede = nativo.puedeProgramarAlarmasExactas();
    if (puede === null || puede === undefined) return 'desconocido';
    return puede ? 'concedido' : 'denegado';
  } catch {
    return 'desconocido';
  }
}

/**
 * Abre «Alarmas y recordatorios» directo en Renaser. `false` si no se pudo (APK sin el módulo, o el
 * teléfono no tiene esa pantalla): quien llama cae a `abrirAlarmasYRecordatorios` con `Linking`.
 */
export function abrirAjusteNativoDeAlarmaExacta(): boolean {
  const nativo = moduloNativo();
  if (!nativo) return false;
  try {
    return nativo.abrirAjusteDeAlarmasExactas() === true;
  } catch {
    return false;
  }
}

const SIN_DETENCION_FORZADA: DetencionForzada = { detenida: false, cuando: null, motivo: null };

/**
 * ¿El sistema detuvo Renaser a la fuerza después de `desdeMs` (ms desde 1970)? Android 11 o más nuevo; en
 * Android 10, iOS, la web o un APK sin esta función, nunca (`detenida: false`). No lanza (spec 007, FR-006).
 */
export function detencionForzadaDesde(desdeMs: number): DetencionForzada {
  const nativo = moduloNativo();
  if (!nativo?.detencionForzadaDesde) return SIN_DETENCION_FORZADA;
  try {
    const respuesta = nativo.detencionForzadaDesde(desdeMs);
    if (!respuesta || typeof respuesta !== 'object' || respuesta.detenida !== true) {
      return { ...SIN_DETENCION_FORZADA, motivo: typeof respuesta?.motivo === 'string' ? respuesta.motivo : null };
    }
    return {
      detenida: true,
      cuando: typeof respuesta.cuando === 'number' && Number.isFinite(respuesta.cuando) ? respuesta.cuando : null,
      motivo: typeof respuesta.motivo === 'string' ? respuesta.motivo : null,
    };
  } catch {
    return SIN_DETENCION_FORZADA;
  }
}

/**
 * Abre la pantalla del fabricante donde se evita que cierre Renaser («Inicio de aplicaciones» en Honor y
 * Huawei, «Inicio automático» en Xiaomi…); si no existe, la lista de batería del sistema y, por último, los
 * ajustes de la app. `'ninguna'` si no se pudo abrir nada o el APK no trae la función: quien llama cae a
 * `Linking.openSettings` (spec 007, FR-008). No lanza.
 */
export function abrirAjusteDeLaMarca(): AjusteDeLaMarcaAbierto {
  const nativo = moduloNativo();
  if (!nativo?.abrirAjusteDeLaMarca) return 'ninguna';
  try {
    const paso = nativo.abrirAjusteDeLaMarca();
    return PASOS_DE_LA_MARCA.includes(paso) ? paso : 'ninguna';
  } catch {
    return 'ninguna';
  }
}
