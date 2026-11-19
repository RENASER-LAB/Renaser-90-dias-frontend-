import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * #235 (2026-11-19): el botón «Usar mi ubicación» de la ficha usaba `navigator.geolocation`, que React Native dejó de traer en la
 * 0.60 y aquí no tiene polyfill. En Android y en iPhone ese objeto no existe, así que el código caía siempre en el plan B (la IP)
 * y la persona creía que se había usado su GPS. En la web sí funciona, por eso nadie lo notó.
 *
 * La regla: en el código que corre en el teléfono (cualquier `.ts` / `.tsx` de `src/` que no sea `.web.ts` / `.web.tsx`) no se
 * usa `navigator.geolocation`.
 *
 * Si falla: pide el permiso y la posición con `expo-location` (`Location.requestForegroundPermissionsAsync()` y
 * `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })`), que sí funciona en Android y en iPhone. Si de verdad
 * es código solo de la web, ponlo en un archivo `.web.ts` / `.web.tsx`.
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const rel = (p: string) => path.relative(RAIZ, p).split(path.sep).join('/');

function archivosNativos(dir: string): string[] {
  const out: string[] = [];
  const pila = [path.join(RAIZ, dir)];
  while (pila.length) {
    const d = pila.pop()!;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') pila.push(p);
      } else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !/\.web\.tsx?$/.test(e.name)) {
        out.push(p);
      }
    }
  }
  return out;
}

/** El código usa la geolocalización del navegador (`navigator.geolocation`, `'geolocation' in navigator`). */
export function usaGeolocalizacionDelNavegador(texto: string): boolean {
  // Los comentarios no cuentan: nombrarla para explicar por qué no se usa está bien.
  const codigo = texto
    .split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
  return /navigator\s*\??\.\s*geolocation/.test(codigo) || /['"]geolocation['"]\s+in\s+navigator/.test(codigo);
}

describe('Ubicación del teléfono sin navigator.geolocation (#235)', () => {
  it('ningún archivo nativo de src/ usa navigator.geolocation', () => {
    const mal = archivosNativos('src')
      .filter(f => usaGeolocalizacionDelNavegador(fs.readFileSync(f, 'utf8')))
      .map(
        f =>
          `${rel(f)} → navigator.geolocation no existe en React Native: usa expo-location ` +
          `(Location.requestForegroundPermissionsAsync + Location.getCurrentPositionAsync), o muévelo a un archivo .web.ts / .web.tsx`,
      );
    expect(mal).toEqual([]);
  });

  it('la guarda detecta lo que se coló (#235) y deja pasar los comentarios y expo-location', () => {
    expect(usaGeolocalizacionDelNavegador("if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {")).toBe(true);
    expect(usaGeolocalizacionDelNavegador('navigator.geolocation.getCurrentPosition(ok, fallo);')).toBe(true);
    expect(usaGeolocalizacionDelNavegador('navigator?.geolocation?.watchPosition(ok);')).toBe(true);
    expect(usaGeolocalizacionDelNavegador(' * no usa `navigator.geolocation` porque no existe en el teléfono')).toBe(false);
    expect(usaGeolocalizacionDelNavegador('// navigator.geolocation: solo web\nconst x = 1;')).toBe(false);
    expect(usaGeolocalizacionDelNavegador('await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });')).toBe(false);
  });
});
