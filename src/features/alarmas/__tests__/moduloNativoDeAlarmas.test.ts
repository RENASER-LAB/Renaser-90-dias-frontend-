/**
 * El módulo nativo `renaser-alarmas` y su envoltorio en JS (spec 007, historia 2).
 *
 * Desde el 2026-10-31 (alarmas silenciosas) la app solo llama a `abrirAjusteDeLaMarca`: el botón «Revisar» de Yo →
 * Alarmas. El Kotlin conserva `detencionForzadaDesde` y `proximaAlarmaPropia`, que ya nada llama; no se prueban
 * porque el módulo no se toca (quitarlas exigiría un APK nativo nuevo).
 *
 * El Kotlin no se compila en Jest: se lee como texto, como las otras pruebas del módulo
 * (`pedirAlarmaExactaYBateria.test.ts`). Lo que de verdad prueba el compilador y el teléfono (el APK) se
 * valida en el emulador y en un Honor real, no acá.
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { abrirAjusteDeLaMarca, usarModuloDeAlarmas } from '../alarmaExactaNativa';

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

  it('expone abrirAjusteDeLaMarca', () => {
    expect(kotlin).toContain('Function("abrirAjusteDeLaMarca")');
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
