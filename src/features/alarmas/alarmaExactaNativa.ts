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

interface ModuloDeAlarmas {
  puedeProgramarAlarmasExactas(): boolean | null;
  abrirAjusteDeAlarmasExactas(): boolean;
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
