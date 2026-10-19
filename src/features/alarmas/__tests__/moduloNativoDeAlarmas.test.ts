/**
 * Spec 007, historia 2 (T024 y T025): el módulo nativo `renaser-alarmas` suma `detencionForzadaDesde` y
 * `abrirAjusteDeLaMarca`, y la app los envuelve con valores neutros para un APK que no los trae.
 *
 * El Kotlin no se compila en Jest: se lee como texto, como las otras pruebas del módulo
 * (`pedirAlarmaExactaYBateria.test.ts`). Lo que de verdad prueba el compilador y el teléfono (el APK) se
 * valida en el emulador y en un Honor real, no acá.
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import {
  abrirAjusteDeLaMarca,
  detencionForzadaDesde,
  usarModuloDeAlarmas,
} from '../alarmaExactaNativa';

const RAIZ = path.join(__dirname, '../../../..');
const leerDeLaRaiz = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');
const KOTLIN = 'modules/renaser-alarmas/android/src/main/java/expo/modules/renaseralarmas/RenaserAlarmasModule.kt';

afterEach(() => usarModuloDeAlarmas(null));

describe('el Kotlin del módulo', () => {
  const kotlin = leerDeLaRaiz(KOTLIN);

  it('conserva las dos funciones de antes', () => {
    expect(kotlin).toContain('Function("puedeProgramarAlarmasExactas")');
    expect(kotlin).toContain('canScheduleExactAlarms()');
    expect(kotlin).toContain('Function("abrirAjusteDeAlarmasExactas")');
    expect(kotlin).toContain('Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM');
  });

  it('expone las dos nuevas', () => {
    expect(kotlin).toContain('Function("detencionForzadaDesde")');
    expect(kotlin).toContain('Function("abrirAjusteDeLaMarca")');
  });

  it('detecta la detención forzada: wasForceStopped en Android 15+ y el historial de salidas en 11–14', () => {
    expect(kotlin).toContain('getHistoricalProcessStartReasons');
    expect(kotlin).toContain('wasForceStopped()');
    expect(kotlin).toContain('getHistoricalProcessExitReasons');
    expect(kotlin).toContain('REASON_USER_REQUESTED');
    // Quitar de recientes (un Android sin capa del fabricante) no borra las alarmas: no es una detención.
    expect(kotlin).toContain('subreason=22');
    expect(kotlin.toLowerCase()).toContain('remove task');
    expect(kotlin).toContain('Log.i("RenaserAlarmas"');
    expect(kotlin).toMatch(/SDK_INT\s*>=\s*Build\.VERSION_CODES\.VANILLA_ICE_CREAM/);
    expect(kotlin).toMatch(/SDK_INT\s*<\s*Build\.VERSION_CODES\.R/);
  });

  it('cada marca de la guía tiene sus pantallas en el orden de research R3, y nada lanza', () => {
    for (const componente of [
      'com.hihonor.systemmanager',
      'com.huawei.systemmanager',
      'com.miui.securitycenter',
      'com.miui.powerkeeper',
      'com.samsung.android.lool',
      'com.coloros.safecenter',
      'com.oplus.safecenter',
      'com.oppo.safe',
      'com.vivo.permissionmanager',
      'com.iqoo.secure',
      'com.oneplus.security',
    ]) {
      expect(kotlin).toContain(componente);
    }
    expect(kotlin).toContain('package_name');
    expect(kotlin).toContain('package_label');
    expect(kotlin).toContain('ActivityNotFoundException');
    expect(kotlin).toContain('SecurityException');
    expect(kotlin).toContain('Build.MANUFACTURER');
    expect(kotlin).toContain('Build.BRAND');
    expect(kotlin).toContain('Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
    expect(kotlin).toContain('Settings.ACTION_APPLICATION_DETAILS_SETTINGS');
    expect(kotlin).toContain('Intent.FLAG_ACTIVITY_NEW_TASK');
    for (const paso of ['pantalla_de_la_marca', 'lista_de_bateria', 'ajustes_de_la_app', 'ninguna']) {
      expect(kotlin).toContain(`"${paso}"`);
    }
  });

  it('FR-009: no pide la excepción directa de optimización de batería', () => {
    expect(kotlin).not.toContain('REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
    const manifiestoDelModulo = leerDeLaRaiz('modules/renaser-alarmas/android/src/main/AndroidManifest.xml');
    expect(manifiestoDelModulo).not.toContain('REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
    expect(manifiestoDelModulo).not.toContain('<queries');
    const appJson = leerDeLaRaiz('app.json');
    expect(appJson).not.toContain('REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
  });
});

describe('detencionForzadaDesde en JS', () => {
  const NEUTRO = { detenida: false, cuando: null, motivo: null };
  const base = { puedeProgramarAlarmasExactas: () => true, abrirAjusteDeAlarmasExactas: () => true };

  it('sin módulo, o con un módulo que no la trae: nunca detenida', () => {
    usarModuloDeAlarmas(null);
    expect(detencionForzadaDesde(1)).toEqual(NEUTRO);
    usarModuloDeAlarmas(base);
    expect(detencionForzadaDesde(1)).toEqual(NEUTRO);
  });

  it('pasa el instante y devuelve lo que dice el módulo', () => {
    let recibido = -1;
    usarModuloDeAlarmas({
      ...base,
      detencionForzadaDesde: desde => {
        recibido = desde;
        return { detenida: true, cuando: 1234, motivo: 'reason=10' };
      },
    });
    expect(detencionForzadaDesde(99)).toEqual({ detenida: true, cuando: 1234, motivo: 'reason=10' });
    expect(recibido).toBe(99);
  });

  it('si lanza, o devuelve algo raro, es el valor neutro', () => {
    usarModuloDeAlarmas({
      ...base,
      detencionForzadaDesde: () => {
        throw new Error('boom');
      },
    });
    expect(detencionForzadaDesde(1)).toEqual(NEUTRO);
    usarModuloDeAlarmas({ ...base, detencionForzadaDesde: () => null as never });
    expect(detencionForzadaDesde(1)).toEqual(NEUTRO);
    usarModuloDeAlarmas({ ...base, detencionForzadaDesde: () => ({ detenida: 'sí', cuando: 'ayer', motivo: 3 }) as never });
    expect(detencionForzadaDesde(1)).toEqual(NEUTRO);
  });

  it('detenida sin instante conocido sigue siendo detenida, con `cuando` nulo', () => {
    usarModuloDeAlarmas({ ...base, detencionForzadaDesde: () => ({ detenida: true, cuando: null, motivo: null }) });
    expect(detencionForzadaDesde(1)).toEqual({ detenida: true, cuando: null, motivo: null });
  });
});

describe('abrirAjusteDeLaMarca en JS', () => {
  const base = { puedeProgramarAlarmasExactas: () => true, abrirAjusteDeAlarmasExactas: () => true };

  it('sin módulo, o sin la función: `ninguna` (la app cae a Linking.openSettings)', () => {
    usarModuloDeAlarmas(null);
    expect(abrirAjusteDeLaMarca()).toBe('ninguna');
    usarModuloDeAlarmas(base);
    expect(abrirAjusteDeLaMarca()).toBe('ninguna');
  });

  it('devuelve el paso que abrió el módulo', () => {
    for (const paso of ['pantalla_de_la_marca', 'lista_de_bateria', 'ajustes_de_la_app', 'ninguna'] as const) {
      usarModuloDeAlarmas({ ...base, abrirAjusteDeLaMarca: () => paso });
      expect(abrirAjusteDeLaMarca()).toBe(paso);
    }
  });

  it('si lanza o devuelve un paso que no existe, `ninguna`', () => {
    usarModuloDeAlarmas({
      ...base,
      abrirAjusteDeLaMarca: () => {
        throw new Error('boom');
      },
    });
    expect(abrirAjusteDeLaMarca()).toBe('ninguna');
    usarModuloDeAlarmas({ ...base, abrirAjusteDeLaMarca: () => 'otro' as never });
    expect(abrirAjusteDeLaMarca()).toBe('ninguna');
  });
});
