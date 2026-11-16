/**
 * La app Salud de Apple (HealthKit) en la configuración de la app (spec 037, D-362): lo que hace falta para que el build de iOS traiga la
 * librería, pida SOLO la lectura de pasos y distancia, diga por qué en español, y para que el APK de Android NO la lleve ni se rompa.
 * Se prueba sin generar el proyecto: `app.json` y `package.json` son los que mandan.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const raiz = path.resolve(__dirname, '..', '..');
const json = (ruta: string) => JSON.parse(fs.readFileSync(path.join(raiz, ruta), 'utf-8')) as Record<string, any>;
const LIBRERIA = '@kingstinct/react-native-healthkit';

const plugins: unknown[] = json('app.json').expo.plugins;
const pluginDeHealthKit = plugins.find(p => Array.isArray(p) && p[0] === LIBRERIA) as [string, Record<string, unknown>] | undefined;
const paquete = json('package.json');

describe('el plugin de HealthKit en app.json', () => {
  // spec 037 FR-018
  it('está, y pide solo leer: sin escribir en Salud y sin entrega en segundo plano', () => {
    expect(pluginDeHealthKit).toBeDefined();
    const opciones = pluginDeHealthKit![1];
    // `false` quita `NSHealthUpdateUsageDescription`: la app no escribe nada en Salud.
    expect(opciones.NSHealthUpdateUsageDescription).toBe(false);
    // `false` quita el entitlement `com.apple.developer.healthkit.background-delivery`: no hay lectura en segundo plano.
    expect(opciones.background).toBe(false);
  });

  // spec 037 FR-018
  it('dice por qué se lee, en español de Perú con tuteo, y que el mentor y la tabla ven el total de km', () => {
    const descripcion = String(pluginDeHealthKit![1].NSHealthShareUsageDescription);
    expect(descripcion).toMatch(/pasos/);
    expect(descripcion).toMatch(/distancia/);
    expect(descripcion).toMatch(/mentor/);
    expect(descripcion).toMatch(/tabla de kilómetros/);
    expect(descripcion).toMatch(/\btu(s)?\b/);
    expect(descripcion).not.toMatch(/\b(tenés|podés|querés|sabés|caminás|corrés|subí)\b/i);
    expect(descripcion).not.toMatch(/ Health Connect|Android/);
  });

  // spec 037 FR-018
  it('no se pide a la persona ningún otro dato de salud: el texto solo habla de pasos y distancia', () => {
    const descripcion = String(pluginDeHealthKit![1].NSHealthShareUsageDescription);
    expect(descripcion).not.toMatch(/frecuencia|sue[ñn]o|peso|ejercicio|ubicaci[oó]n|historial/i);
  });
});

describe('las dependencias', () => {
  // spec 037 FR-016
  it('la librería y Nitro (que ella exige) van con versión exacta, como el resto de lo nativo', () => {
    expect(paquete.dependencies[LIBRERIA]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(paquete.dependencies['react-native-nitro-modules']).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('Android no cambia', () => {
  const excluidas: string[] = paquete.expo.autolinking.android.exclude ?? [];

  // spec 037 FR-024
  it('el autolinking de Android deja fuera la librería de iOS y lo que ella necesita', () => {
    expect(excluidas).toEqual(expect.arrayContaining([LIBRERIA, '@react-native-healthkit/core', 'react-native-nitro-modules']));
  });

  // spec 037 FR-024
  it('lo que ya estaba en el autolinking de Android sigue ahí', () => {
    expect(paquete.expo.autolinking.android.buildFromSource).toEqual(['expo-notifications', 'expo-location']);
  });

  // spec 037 FR-024
  it('solo `saludDeApple.ts` importa la librería de iOS: ningún archivo de Android ni de la web la llega a empaquetar', () => {
    const importan: string[] = [];
    const recorrer = (carpeta: string) => {
      for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
        const ruta = path.join(carpeta, entrada.name);
        if (entrada.isDirectory()) {
          if (entrada.name !== '__tests__') recorrer(ruta);
        } else if (/\.(ts|tsx)$/.test(entrada.name) && /(from|require\()\s*['"]@kingstinct\/react-native-healthkit/.test(fs.readFileSync(ruta, 'utf-8'))) {
          importan.push(path.relative(raiz, ruta));
        }
      }
    };
    recorrer(path.join(raiz, 'src'));
    expect(importan).toEqual([path.join('src', 'features', 'pasos', 'services', 'saludDeApple.ts')]);
  });

  // spec 037 FR-024
  it('los permisos de Android siguen siendo solo pasos y distancia, de lectura', () => {
    const permisos: string[] = json('app.json').expo.android.permissions.filter((p: string) => p.includes('.health.'));
    expect(permisos.sort()).toEqual(['android.permission.health.READ_DISTANCE', 'android.permission.health.READ_STEPS']);
  });
});
