import { describe, expect, it } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as path from 'path';

/**
 * Spec 042 FR-048 a FR-052 (decisión del dueño, 2026-11-16): la carrera con GPS corre también en iPhone y la app no pide Face ID.
 * Lo que decide el sistema sale del `Info.plist` que arma Expo, así que la guarda lee la configuración ya resuelta
 * (`expo config --type introspect`), la misma que llega al build de iOS.
 *
 * Si falla: revisa los plugins de `app.json`:
 *   modo de fondo `location`     → expo-location `isIosBackgroundLocationEnabled: true`
 *   sin «siempre»                → expo-location `locationAlwaysAndWhenInUsePermission: false` y `locationAlwaysPermission: false`
 *   texto de movimiento          → expo-sensors `motionPermission` (y `motionUsagePermission` de expo-location, el mismo texto)
 *   sin Face ID                  → expo-secure-store `faceIDPermission: false`
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');

function infoPlist(): Record<string, unknown> {
  const salida = execFileSync(path.join(RAIZ, 'node_modules', '.bin', 'expo'), ['config', '--type', 'introspect', '--json'], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return (JSON.parse(salida).ios?.infoPlist ?? {}) as Record<string, unknown>;
}

describe('Permisos de iOS de la carrera con GPS', () => {
  const plist = infoPlist();

  // spec 042 FR-048
  it('declara el modo de fondo de ubicación, para que la carrera siga con la pantalla apagada', () => {
    expect(plist.UIBackgroundModes).toEqual(expect.arrayContaining(['location']));
  });

  // spec 042 FR-049
  it('pide la ubicación solo «mientras se usa», con el texto en español y sin las claves de «siempre»', () => {
    expect(plist.NSLocationWhenInUseUsageDescription).toMatch(/Renaser.*Correr con GPS/);
    expect(plist.NSLocationWhenInUseUsageDescription).not.toMatch(/\bAllow\b/);
    expect(plist.NSLocationAlwaysAndWhenInUseUsageDescription).toBeUndefined();
    expect(plist.NSLocationAlwaysUsageDescription).toBeUndefined();
  });

  // spec 042 FR-050
  it('el texto del permiso de movimiento (los pasos de la carrera) está en español y dice para qué', () => {
    const texto = String(plist.NSMotionUsageDescription ?? '');
    expect(texto).toMatch(/Renaser.*pasos.*Correr con GPS/);
    expect(texto).not.toMatch(/\bAllow\b|\$\(PRODUCT_NAME\)/);
  });

  // spec 042 FR-052
  it('no declara Face ID: la app no lo usa', () => {
    expect(plist.NSFaceIDUsageDescription).toBeUndefined();
  });

  // spec 042 FR-052
  it('todo NS*UsageDescription que declara la app está en español y nombra a Renaser', () => {
    const mal = Object.entries(plist)
      .filter(([clave, v]) => /^NS.*UsageDescription$/.test(clave) && typeof v === 'string')
      .filter(([, v]) => /\bAllow\b/.test(v as string) || !(v as string).includes('Renaser'))
      .map(([clave, v]) => `${clave}: «${v}»`);
    expect(mal).toEqual([]);
  });
});
