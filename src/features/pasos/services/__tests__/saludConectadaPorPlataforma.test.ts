/**
 * La plataforma se elige en UN solo lugar (spec 037 FR-016, D-362): `saludConectada.ts` (Android), `saludConectada.ios.ts` (iPhone) y
 * `saludConectada.web.ts` (web) tienen la misma forma, y quien las usa no ramifica por plataforma. Metro toma el archivo de la plataforma;
 * aquí se carga cada uno por su nombre.
 */
import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

jest.mock('react-native-health-connect', () => ({
  aggregateRecord: jest.fn(),
  getGrantedPermissions: jest.fn(),
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  openHealthConnectSettings: jest.fn(),
  readRecords: jest.fn(),
  requestPermission: jest.fn(),
  SdkAvailabilityStatus: { SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2, SDK_AVAILABLE: 3 },
}));
jest.mock('@kingstinct/react-native-healthkit', () => ({
  getRequestStatusForAuthorization: jest.fn(),
  isHealthDataAvailableAsync: jest.fn(),
  queryStatisticsForQuantity: jest.fn(),
  requestAuthorization: jest.fn(),
}));

import * as ios from '../saludConectada.ios';
import * as web from '../saludConectada.web';
import * as deApple from '../saludDeApple';
import * as deHealthConnect from '../saludDeHealthConnect';

/** Con el archivo completo en el nombre: Jest corre como iOS y `'../saludConectada'` a secas daría `saludConectada.ios.ts`. */
const android = jest.requireActual<typeof deHealthConnect>('../saludConectada.ts');

const FUNCIONES = ['soporteDeSalud', 'permisosDeSalud', 'pedirPermisosDeSalud', 'leerLosPasosDelDia', 'abrirHealthConnect'] as const;

describe('las tres plataformas, una sola forma', () => {
  // spec 037 FR-016
  it.each([
    ['Android', android],
    ['iPhone', ios],
    ['la web', web],
  ])('%s exporta las mismas funciones que usa la app', (_nombre, modulo) => {
    for (const funcion of FUNCIONES) expect(typeof (modulo as Record<string, unknown>)[funcion]).toBe('function');
    expect(typeof modulo.API_MINIMA_DE_ANDROID).toBe('number');
  });

  // spec 037 FR-016
  it('iPhone usa la app Salud de Apple y Android sigue con Health Connect', () => {
    for (const funcion of FUNCIONES) {
      expect((ios as Record<string, unknown>)[funcion]).toBe((deApple as Record<string, unknown>)[funcion]);
      expect((android as Record<string, unknown>)[funcion]).toBe((deHealthConnect as Record<string, unknown>)[funcion]);
    }
  });

  // spec 037 FR-016
  it('la web nunca tiene soporte, ni permisos, ni lee nada', async () => {
    expect(await web.soporteDeSalud()).toBe('no-disponible');
    expect(await web.permisosDeSalud()).toBe('faltan');
    expect(await web.pedirPermisosDeSalud()).toBe(false);
    expect(await web.leerLosPasosDelDia(new Date(), new Date())).toEqual({ pasos: null, distanciaM: null, origenesUsados: [], registros: [] });
  });

  // spec 037 FR-016
  it('la app solo importa `saludConectada` (nunca una implementación suelta): la plataforma no se elige en otro lugar', () => {
    const raiz = path.resolve(__dirname, '..', '..', '..', '..', '..');
    const quienesImportan: string[] = [];
    const recorrer = (carpeta: string) => {
      for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
        const ruta = path.join(carpeta, entrada.name);
        if (entrada.isDirectory()) {
          if (entrada.name !== '__tests__') recorrer(ruta);
        } else if (/\.(ts|tsx)$/.test(entrada.name) && /saludDe(Apple|HealthConnect)'/.test(fs.readFileSync(ruta, 'utf-8'))) {
          quienesImportan.push(path.basename(ruta));
        }
      }
    };
    recorrer(path.join(raiz, 'src'));
    expect(quienesImportan.sort()).toEqual(['saludConectada.ios.ts', 'saludConectada.ts']);
  });
});
