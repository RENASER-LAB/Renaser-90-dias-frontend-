import { describe, expect, it } from '@jest/globals';
import { execFileSync } from 'child_process';
import * as path from 'path';

/**
 * Los textos de permiso de iOS (`NS*UsageDescription`) están en español y nombran a Renaser.
 *
 * Apple revisa que cada texto explique para qué se usa el permiso, y los plugins de Expo traen uno por defecto en inglés
 * («Allow $(PRODUCT_NAME) to access your location»). Esos textos no salen de `app.json` sino de los plugins, así que la guarda lee
 * la configuración ya resuelta (`expo config --type introspect`), la misma que termina en el `Info.plist` del build de iOS.
 *
 * Si falla: pon el texto en la opción del plugin que lo genera en `app.json`, en español de Perú con tuteo y diciendo para qué lo
 * usa Renaser (modelo: `locationWhenInUsePermission` de `expo-location`):
 *   NSFaceIDUsageDescription → expo-secure-store `faceIDPermission`
 *   NSLocationAlways…UsageDescription → expo-location `locationAlwaysAndWhenInUsePermission` / `locationAlwaysPermission`
 *   NSMotionUsageDescription → expo-sensors `motionPermission`
 * Si el permiso no se usa en iOS, no inventes un texto: pregunta al dueño si se quita (queda en PENDIENTES_DEL_DUENO con su motivo).
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');

/**
 * Claves que hoy siguen con el texto en inglés porque la app NO usa ese permiso en iOS (2026-11-16): `Face ID` (no hay
 * `requireAuthentication` en SecureStore), «ubicación siempre» (el GPS de la carrera es solo de Android y en iOS no hay modo
 * de fondo `location`) y `movimiento` (el podómetro es solo de Android). Un texto inventado para algo que no se usa sería falso
 * ante Apple; quitarlas o dejarlas lo decide el dueño. Solo se achica: al decidir, se borra la clave de aquí.
 */
const PENDIENTES_DEL_DUENO: string[] = [
  'NSFaceIDUsageDescription',
  'NSLocationAlwaysAndWhenInUseUsageDescription',
  'NSLocationAlwaysUsageDescription',
  'NSMotionUsageDescription',
];

function textosDePermiso(): Record<string, string> {
  const salida = execFileSync(path.join(RAIZ, 'node_modules', '.bin', 'expo'), ['config', '--type', 'introspect', '--json'], {
    cwd: RAIZ,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const plist = (JSON.parse(salida).ios?.infoPlist ?? {}) as Record<string, unknown>;
  const textos: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(plist)) {
    if (/^NS.*UsageDescription$/.test(clave) && typeof valor === 'string') textos[clave] = valor;
  }
  return textos;
}

describe('Textos de permiso de iOS en español', () => {
  const textos = textosDePermiso();

  it('hay textos de permiso que revisar', () => {
    expect(Object.keys(textos).length).toBeGreaterThan(0);
  });

  it('ninguno trae el texto en inglés por defecto ni se queda sin nombrar a Renaser', () => {
    const mal = Object.entries(textos)
      .filter(([clave]) => !PENDIENTES_DEL_DUENO.includes(clave))
      .filter(([, texto]) => /\bAllow\b/.test(texto) || texto.includes('$(PRODUCT_NAME)') || !texto.includes('Renaser'))
      .map(([clave, texto]) => `${clave}: «${texto}»`);
    expect(mal).toEqual([]);
  });

  it('PENDIENTES_DEL_DUENO solo guarda claves que siguen en inglés (si ya se arregló, se borra de la lista)', () => {
    const ya = PENDIENTES_DEL_DUENO.filter(c => textos[c] === undefined || !/\bAllow\b/.test(textos[c]));
    expect(ya).toEqual([]);
  });
});
