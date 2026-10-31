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

/** Qué pantalla abrió `abrirAjusteDeLaMarca`: la de la marca, la lista de batería del sistema o los ajustes de Renaser. */
export type AjusteDeLaMarcaAbierto = 'pantalla_de_la_marca' | 'lista_de_bateria' | 'ajustes_de_la_app' | 'ninguna';

const PASOS_DE_LA_MARCA: readonly AjusteDeLaMarcaAbierto[] = [
  'pantalla_de_la_marca',
  'lista_de_bateria',
  'ajustes_de_la_app',
  'ninguna',
];

/**
 * `abrirAjusteDeLaMarca` (spec 007) es OPCIONAL: un APK compilado antes de ella tiene el módulo (las dos primeras
 * funciones) pero no esta, y la app no puede caerse por eso (`contracts/modulo-renaser-alarmas.md`).
 *
 * El módulo nativo conserva además `detencionForzadaDesde` y `proximaAlarmaPropia`, que desde el 2026-10-31 (alarmas
 * silenciosas) ya no se llaman desde JavaScript: se dejan porque quitarlas exigiría un APK nativo nuevo.
 */
interface ModuloDeAlarmas {
  puedeProgramarAlarmasExactas(): boolean | null;
  abrirAjusteDeAlarmasExactas(): boolean;
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

/**
 * Abre la pantalla del fabricante donde se deja a Renaser funcionar en segundo plano («Inicio de aplicaciones» en Honor y
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
