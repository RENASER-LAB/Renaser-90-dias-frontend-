/**
 * Spec 007, refuerzos generales (T053, FR-021): en las marcas que detienen apps, la primera vez que la persona
 * activa un recordatorio en este teléfono se le ofrece, una vez, la guía de su marca ANTES de que el teléfono
 * borre la primera alarma.
 *
 * Contra el código de antes falla: `guiaPreventiva.ts` no existía. Hasta ahora la guía solo aparecía después
 * del daño («tu teléfono cerró Renaser») o si la persona entraba a Yo → Alarmas por su cuenta.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
}));

import { soltarAlarmasDeLaCuenta } from '../alarmasDeLaCuenta';
import { lineaDeLaGuia, TEXTO_PREVENTIVO, TITULO_PREVENTIVO } from '../data/guiasPorMarca';
import {
  CLAVE_GUIA_PREVENTIVA,
  hayQueOfrecerLaGuiaPreventiva,
  ofrecerLaGuiaPreventiva,
  type DependenciasDeLaGuiaPreventiva,
} from '../guiaPreventiva';
import { alPedirLaGuiaPreventiva, pedirLaGuiaPreventiva } from '../pedidoDeLaGuia';
import type { MarcaDelTelefono } from '../utils/marcaDelTelefono';

const RAIZ = path.join(__dirname, '../../../..');
const leerDeLaRaiz = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

const MARCAS_QUE_DETIENEN_APPS: MarcaDelTelefono[] = ['honor', 'huawei', 'xiaomi', 'samsung', 'oppo', 'vivo'];

function dependencias(marca: MarcaDelTelefono, hoja: { mostrar: () => boolean } = { mostrar: () => true }): DependenciasDeLaGuiaPreventiva {
  return { marca: () => marca, sistema: 'android', pedirLaHoja: () => hoja.mostrar() };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('cuándo se ofrece', () => {
  it.each(MARCAS_QUE_DETIENEN_APPS)('%s: la primera vez que activa un recordatorio sí', async marca => {
    expect(await hayQueOfrecerLaGuiaPreventiva('u-1', marca, 'android')).toBe(true);
  });

  it('otra marca: nunca (la guía de siempre sigue en Yo → Alarmas)', async () => {
    expect(await hayQueOfrecerLaGuiaPreventiva('u-1', 'otra', 'android')).toBe(false);
    expect(await ofrecerLaGuiaPreventiva('u-1', dependencias('otra'))).toBe(false);
    expect(await AsyncStorage.getItem(CLAVE_GUIA_PREVENTIVA + 'u-1')).toBeNull();
  });

  it('fuera de Android (iOS, web) nunca', async () => {
    for (const sistema of ['ios', 'web']) {
      expect(await hayQueOfrecerLaGuiaPreventiva('u-1', 'honor', sistema)).toBe(false);
    }
  });

  it('una sola vez por cuenta en este teléfono', async () => {
    expect(await ofrecerLaGuiaPreventiva('u-1', dependencias('honor'))).toBe(true);
    expect(await AsyncStorage.getItem(CLAVE_GUIA_PREVENTIVA + 'u-1')).not.toBeNull();
    expect(await hayQueOfrecerLaGuiaPreventiva('u-1', 'honor', 'android')).toBe(false);
    expect(await ofrecerLaGuiaPreventiva('u-1', dependencias('honor'))).toBe(false);
    // Otra cuenta en el mismo teléfono tiene lo suyo.
    expect(await ofrecerLaGuiaPreventiva('u-2', dependencias('honor'))).toBe(true);
  });

  it('la clave es la de la spec', () => {
    expect(CLAVE_GUIA_PREVENTIVA).toBe('renaser.alarmas.guiaPreventiva.');
  });

  it('si no hay hoja montada que la muestre, no cuenta como ofrecida y se intentará la próxima vez', async () => {
    expect(await ofrecerLaGuiaPreventiva('u-1', dependencias('honor', { mostrar: () => false }))).toBe(false);
    expect(await AsyncStorage.getItem(CLAVE_GUIA_PREVENTIVA + 'u-1')).toBeNull();
    expect(await ofrecerLaGuiaPreventiva('u-1', dependencias('honor'))).toBe(true);
  });

  it('un almacenamiento que falla no lanza ni la muestra: sin poder anotarlo, insistiría en cada guardado', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disco'));
    const mostrar = jest.fn(() => true);
    await expect(ofrecerLaGuiaPreventiva('u-1', dependencias('honor', { mostrar }))).resolves.toBe(false);
    expect(mostrar).not.toHaveBeenCalled();

    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco'));
    await expect(ofrecerLaGuiaPreventiva('u-1', dependencias('honor', { mostrar }))).resolves.toBe(false);
    expect(mostrar).not.toHaveBeenCalled();
  });
});

describe('al cerrar sesión', () => {
  it('soltarAlarmasDeLaCuenta borra la clave junto con lo demás de las alarmas', async () => {
    await ofrecerLaGuiaPreventiva('u-1', dependencias('honor'));
    await AsyncStorage.setItem('renaser.alarmas.sonido.u-1', 'campana');
    await soltarAlarmasDeLaCuenta();
    expect(await AsyncStorage.getItem(CLAVE_GUIA_PREVENTIVA + 'u-1')).toBeNull();
    expect(await AsyncStorage.getItem('renaser.alarmas.sonido.u-1')).toBe('campana');
  });
});

describe('el pedido a la hoja', () => {
  it('llega a quien está escuchando y dice si alguien lo recibió', () => {
    expect(pedirLaGuiaPreventiva()).toBe(false);
    const oyente = jest.fn<() => void>();
    const soltar = alPedirLaGuiaPreventiva(oyente);
    expect(pedirLaGuiaPreventiva()).toBe(true);
    expect(oyente).toHaveBeenCalledTimes(1);
    soltar();
    expect(pedirLaGuiaPreventiva()).toBe(false);
    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('si quien escucha dice que no la puede mostrar ahora (ya hay otra hoja), el pedido no cuenta', () => {
    const soltar = alPedirLaGuiaPreventiva(() => false);
    expect(pedirLaGuiaPreventiva()).toBe(false);
    soltar();
  });

  it('un oyente que lanza no rompe el guardado del recordatorio', () => {
    const soltar = alPedirLaGuiaPreventiva(() => {
      throw new Error('boom');
    });
    expect(() => pedirLaGuiaPreventiva()).not.toThrow();
    soltar();
  });
});

describe('el texto', () => {
  const frases = (t: string) => t.split(/[.!?](\s|$)/).filter(x => x.trim().length > 1).length;

  it('dice lo que pidió el dueño y es corto: una frase, en tuteo', () => {
    expect(TEXTO_PREVENTIVO).toBe('En tu teléfono, Renaser necesita un ajuste para que tus alarmas suenen siempre.');
    expect(frases(TEXTO_PREVENTIVO)).toBe(1);
    expect(frases(TITULO_PREVENTIVO)).toBeLessThanOrEqual(2);
    // Sin voseo (español de Perú).
    expect(`${TITULO_PREVENTIVO} ${TEXTO_PREVENTIVO}`).not.toMatch(/\b(tenés|podés|elegí|activá|vos)\b/i);
  });

  it('cada marca tiene su línea, para mostrarla debajo', () => {
    for (const marca of MARCAS_QUE_DETIENEN_APPS) expect(lineaDeLaGuia(marca).length).toBeGreaterThan(10);
  });
});

describe('dónde se engancha', () => {
  it('la hoja de Training la ofrece al guardar un recordatorio, después de decidir lo del permiso exacto', () => {
    const fuente = leerDeLaRaiz('src/features/training/components/PlanificarDimensionModal.tsx');
    expect(fuente).toContain('ofrecerLaGuiaPreventiva(claveUsuario)');
    // No se le pone encima al pedido del permiso de «Alarmas y recordatorios»: dos avisos juntos marean.
    const posicionDelPedido = fuente.indexOf('hayQuePedirAlarmaExactaAlGuardar(claveUsuario)');
    const posicionDeLaGuia = fuente.indexOf('ofrecerLaGuiaPreventiva(claveUsuario)');
    expect(posicionDeLaGuia).toBeGreaterThan(posicionDelPedido);
  });

  it('no toca los interruptores de avisos ni la API de preferencias (spec 005)', () => {
    const fuente = leerDeLaRaiz('src/features/alarmas/guiaPreventiva.ts');
    expect(fuente).not.toContain('InterruptoresDeAvisos');
    expect(fuente).not.toContain('preferenciasDeNotificacion');
  });

  it('la hoja global escucha el pedido', () => {
    const hoja = leerDeLaRaiz('src/features/alarmas/components/AvisoDeAlarmasBorradas.tsx');
    expect(hoja).toContain('alPedirLaGuiaPreventiva');
  });
});
