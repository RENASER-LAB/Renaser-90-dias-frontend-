/**
 * Health Connect en la configuración de la app (spec 037, D-310): lo que hace falta para que el build nativo traiga la librería, pida
 * SOLO los permisos de lectura de pasos y distancia, suba el `minSdk` que exige y muestre NUESTRA política de privacidad desde la
 * pantalla de permisos del sistema. Se prueba sin generar el proyecto Android: el plugin expone sus funciones puras.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { RUTA_POLITICA_DE_PRIVACIDAD, WEB_PUBLICA_POR_DEFECTO } from '../features/legal/enlacesLegales';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../plugins/withHealthConnect.js') as {
  aplicarAlManifiesto: (m: unknown) => ManifiestoDePrueba;
  codigoDeLaActividad: (paquete: string, url?: string) => string;
  URL_DE_LA_POLITICA: string;
  NOMBRE_DE_LA_ACTIVIDAD: string;
};

type Nodo = { $: Record<string, string>; 'intent-filter'?: Filtro[] };
type Filtro = { action?: { $: Record<string, string> }[]; category?: { $: Record<string, string> }[] };
type ManifiestoDePrueba = {
  manifest: { application: { $: Record<string, string>; activity: Nodo[]; 'activity-alias'?: Nodo[] }[] };
};

const raiz = path.resolve(__dirname, '..', '..');
const leer = (ruta: string) => fs.readFileSync(path.join(raiz, ruta), 'utf-8');
const json = (ruta: string) => JSON.parse(leer(ruta)) as Record<string, any>;

const RATIONALE = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';

function manifiesto(extra: { filtroDeLaLibreria?: boolean; aliasDeLaLibreria?: boolean } = {}): ManifiestoDePrueba {
  const principal: Nodo = {
    $: { 'android:name': '.MainActivity' },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
      },
    ],
  };
  if (extra.filtroDeLaLibreria) principal['intent-filter']!.push({ action: [{ $: { 'android:name': RATIONALE } }] });
  const aplicacion: ManifiestoDePrueba['manifest']['application'][number] = { $: { 'android:name': '.MainApplication' }, activity: [principal] };
  if (extra.aliasDeLaLibreria) {
    aplicacion['activity-alias'] = [
      {
        $: { 'android:name': 'ViewPermissionUsageActivity', 'android:targetActivity': '.MainActivity' },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }] }],
      },
    ];
  }
  return { manifest: { application: [aplicacion] } };
}

const aplicacionDe = (m: ManifiestoDePrueba) => m.manifest.application[0];
const accionesDe = (nodo: Nodo) => (nodo['intent-filter'] ?? []).flatMap(f => (f.action ?? []).map(a => a.$['android:name']));

describe('el manifiesto', () => {
  it('declara nuestra actividad de la política con el filtro de Health Connect (hasta Android 13)', () => {
    const resultado = plugin.aplicarAlManifiesto(manifiesto());
    const actividad = aplicacionDe(resultado).activity.find(a => a.$['android:name'] === '.PoliticaDePrivacidadDeSaludActivity');
    expect(actividad).toBeDefined();
    expect(actividad!.$['android:exported']).toBe('true');
    expect(accionesDe(actividad!)).toEqual([RATIONALE]);
  });

  it('declara el alias de Android 14 con el permiso del sistema, apuntando a NUESTRA actividad', () => {
    const alias = aplicacionDe(plugin.aplicarAlManifiesto(manifiesto()))['activity-alias']!.find(
      a => a.$['android:name'] === 'ViewPermissionUsageActivity',
    )!;
    expect(alias.$['android:targetActivity']).toBe('.PoliticaDePrivacidadDeSaludActivity');
    expect(alias.$['android:permission']).toBe('android.permission.START_VIEW_PERMISSION_USAGE');
    expect(alias.$['android:exported']).toBe('true');
    expect(alias['intent-filter']![0].category![0].$['android:name']).toBe('android.intent.category.HEALTH_PERMISSIONS');
    expect(accionesDe(alias)).toEqual(['android.intent.action.VIEW_PERMISSION_USAGE']);
  });

  it('si la librería dejó su filtro y su alias apuntando a la actividad principal, se corrigen: tocar el enlace no abre la app', () => {
    const resultado = plugin.aplicarAlManifiesto(manifiesto({ filtroDeLaLibreria: true, aliasDeLaLibreria: true }));
    const principal = aplicacionDe(resultado).activity.find(a => a.$['android:name'] === '.MainActivity')!;
    expect(accionesDe(principal)).toEqual(['android.intent.action.MAIN']);
    const aliases = aplicacionDe(resultado)['activity-alias']!;
    expect(aliases).toHaveLength(1);
    expect(aliases[0].$['android:targetActivity']).toBe('.PoliticaDePrivacidadDeSaludActivity');
  });

  it('es idempotente: aplicarlo dos veces no duplica nada', () => {
    const dos = plugin.aplicarAlManifiesto(plugin.aplicarAlManifiesto(manifiesto()));
    const nuestras = aplicacionDe(dos).activity.filter(a => a.$['android:name'] === '.PoliticaDePrivacidadDeSaludActivity');
    expect(nuestras).toHaveLength(1);
    expect(aplicacionDe(dos)['activity-alias']).toHaveLength(1);
  });
});

describe('la actividad de la política', () => {
  const codigo = plugin.codigoDeLaActividad('com.renaser.app');

  it('abre la misma política de la ficha de Play y de Ajustes, y se cierra', () => {
    expect(plugin.URL_DE_LA_POLITICA).toBe('https://renaser-90-dias-frontend-livid.vercel.app/privacidad/');
    expect(codigo).toContain('package com.renaser.app');
    expect(codigo).toContain(`Uri.parse("${plugin.URL_DE_LA_POLITICA}")`);
    expect(codigo).toContain('class PoliticaDePrivacidadDeSaludActivity : Activity()');
    // `Theme.NoDisplay` exige terminar antes de `onResume`.
    expect(codigo).toMatch(/finish\(\)/);
  });

  it('usa la misma URL que enlacesLegales.ts (una sola política)', () => {
    expect(plugin.URL_DE_LA_POLITICA).toBe(`${WEB_PUBLICA_POR_DEFECTO}${RUTA_POLITICA_DE_PRIVACIDAD}`);
  });
});

describe('app.json', () => {
  const expo = json('app.json').expo as { android: { permissions: string[] }; plugins: unknown[] };

  // spec 037 FR-003
  it('pide SOLO los permisos de lectura de pasos y de distancia de Health Connect', () => {
    const salud = expo.android.permissions.filter(p => p.startsWith('android.permission.health.'));
    expect(salud.sort()).toEqual(['android.permission.health.READ_DISTANCE', 'android.permission.health.READ_STEPS']);
    expect(expo.android.permissions).not.toContain('android.permission.ACTIVITY_RECOGNITION');
    expect(expo.android.permissions.join(' ')).not.toMatch(/WRITE_|READ_HEART|READ_SLEEP|READ_EXERCISE|BACKGROUND|HISTORY/);
  });

  it('sube el minSdk a 26 (lo exige la librería) y usa nuestro plugin, no el de la librería', () => {
    const buildProperties = expo.plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties') as [string, { android: { minSdkVersion: number } }];
    expect(buildProperties[1].android.minSdkVersion).toBe(26);
    expect(expo.plugins).toContain('./plugins/withHealthConnect');
    expect(expo.plugins).not.toContain('react-native-health-connect');
  });

  // spec 037 FR-001
  it('no suma Recording API, Google Fit ni un módulo propio de pasos (cambio del dueño del 2026-11-02)', () => {
    const todo = leer('package.json') + leer('app.json');
    // `expo-sensors` sí está desde la spec 042 (2026-11-05), pero solo para el podómetro del avatar de la carrera con GPS: los km del
    // hábito de los pasos siguen saliendo SOLO de Health Connect (lo que cuida esta prueba). Que no se use para eso lo vigila la de abajo.
    expect(todo).not.toMatch(/play-services-fitness|react-native-google-fit|renaser-pasos/);
    expect(fs.existsSync(path.join(raiz, 'modules', 'renaser-pasos'))).toBe(false);
  });

  // spec 037 FR-001, spec 042 FR-031
  it('el podómetro de expo-sensors solo lo usa la carrera con GPS, nunca los km de los pasos', () => {
    const pasos = path.join(raiz, 'src', 'features', 'pasos');
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p);
        else if (/\.tsx?$/.test(e.name)) archivos.push(p);
      }
    };
    recorrer(pasos);
    for (const a of archivos) expect(fs.readFileSync(a, 'utf8')).not.toMatch(/expo-sensors/);
  });
});

describe('las dependencias', () => {
  const dependencias = json('package.json').dependencies as Record<string, string>;

  it('la librería de Health Connect está fijada a la versión revisada, sin ^ ni ~', () => {
    expect(dependencias['react-native-health-connect']).toBe('4.1.3');
  });

  it('expo-build-properties es el de la línea del SDK 57', () => {
    expect(dependencias['expo-build-properties']).toMatch(/^~57\./);
  });
});

describe('eas.json', () => {
  it('tiene un perfil de depuración para probar los pasos: el mismo APK de `expo run:android`, sin dev client', () => {
    const perfil = json('eas.json').build['debug-pasos'];
    expect(perfil.android.gradleCommand).toBe(':app:assembleDebug');
    expect(perfil.distribution).toBe('internal');
    expect(perfil.developmentClient).toBeUndefined();
  });
});
