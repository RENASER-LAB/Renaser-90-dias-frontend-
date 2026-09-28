/**
 * D-217 (2026-09-28): pedir «Alarmas y recordatorios» al guardar el primer recordatorio, la guía de batería
 * de Yo → Alarmas, y el rearmado al actualizar la app.
 *
 * Contra el código viejo falla: `pedirAlarmaExacta.ts`, `GuiaDeBateria.tsx` y el módulo nativo no
 * existían; la app no podía saber si el permiso estaba dado y no lo pedía en ningún guardado.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  abrirPermisoDeAlarmasExactas,
  anotarQueSePidioAlarmaExacta,
  hayQuePedirAlarmaExactaAlGuardar,
  hayQueRecordarAlarmaExacta,
  LINEA_ALARMA_EXACTA_PENDIENTE,
  TEXTO_PEDIDO_ALARMA_EXACTA,
} from '../pedirAlarmaExacta';
import { TEXTO_DE_BATERIA } from '../components/GuiaDeBateria';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('pedir el permiso al guardar el primer recordatorio', () => {
  it('solo si el sistema dice que está negado, y una sola vez', async () => {
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-1', 'concedido')).toBe(false);
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-1', 'desconocido')).toBe(false);
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-1', 'no_hace_falta')).toBe(false);
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-1', 'denegado')).toBe(true);
    await anotarQueSePidioAlarmaExacta('u-1');
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-1', 'denegado')).toBe(false);
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-2', 'denegado')).toBe(true);
  });

  it('abre la pantalla del sistema directo en Renaser; sin el módulo, la lista como antes', async () => {
    const linking = { sendIntent: jest.fn(async (_a: string) => {}), openSettings: jest.fn(async () => {}) };
    await expect(abrirPermisoDeAlarmasExactas(linking, () => true)).resolves.toBe('alarmas_y_recordatorios');
    expect(linking.sendIntent).not.toHaveBeenCalled();
    await expect(abrirPermisoDeAlarmasExactas(linking, () => false)).resolves.toBe('alarmas_y_recordatorios');
    expect(linking.sendIntent).toHaveBeenCalledWith('android.settings.REQUEST_SCHEDULE_EXACT_ALARM');
  });

  it('la hoja de Training lo pide al guardar', () => {
    const fuente = leer('features/training/components/PlanificarDimensionModal.tsx');
    expect(fuente).toContain('hayQuePedirAlarmaExactaAlGuardar(claveUsuario)');
  });
});

describe('después del único pedido (dueño, 28/09)', () => {
  it('si sigue negado, solo una línea discreta al guardar; nunca otra vez el diálogo', async () => {
    expect(await hayQueRecordarAlarmaExacta('u-1', 'denegado')).toBe(false);
    await anotarQueSePidioAlarmaExacta('u-1');
    expect(await hayQuePedirAlarmaExactaAlGuardar('u-1', 'denegado')).toBe(false);
    expect(await hayQueRecordarAlarmaExacta('u-1', 'denegado')).toBe(true);
    expect(await hayQueRecordarAlarmaExacta('u-1', 'concedido')).toBe(false);
  });

  it('los textos nuevos son cortos: una o dos frases («mucho texto marea al usuario»)', () => {
    const frases = (t: string) => t.split(/[.!?](\s|$)/).filter(x => x.trim().length > 1).length;
    for (const texto of [TEXTO_PEDIDO_ALARMA_EXACTA, LINEA_ALARMA_EXACTA_PENDIENTE, TEXTO_DE_BATERIA]) {
      expect(frases(texto)).toBeLessThanOrEqual(2);
      expect(texto.length).toBeLessThanOrEqual(120);
    }
  });
});

describe('Yo → Alarmas', () => {
  it('muestra la guía de batería y el estado real del permiso', () => {
    const seccion = leer('features/alarmas/components/SeccionAlarmas.tsx');
    expect(seccion).toContain('<GuiaDeBateria />');
    expect(seccion).toContain('<AvisoAlarmaExacta />');
    expect(leer('features/alarmas/components/AvisoAlarmaExacta.tsx')).toContain('estadoDeAlarmaExacta()');
  });
});

describe('el módulo nativo', () => {
  it('existe, está declarado para Android y expone lo que usa la app', () => {
    const config = JSON.parse(leer('../modules/renaser-alarmas/expo-module.config.json'));
    expect(config.android.modules).toEqual(['expo.modules.renaseralarmas.RenaserAlarmasModule']);
    const kotlin = leer('../modules/renaser-alarmas/android/src/main/java/expo/modules/renaseralarmas/RenaserAlarmasModule.kt');
    expect(kotlin).toContain('Name("RenaserAlarmas")');
    expect(kotlin).toContain('Function("puedeProgramarAlarmasExactas")');
    expect(kotlin).toContain('canScheduleExactAlarms()');
    expect(kotlin).toContain('Function("abrirAjusteDeAlarmasExactas")');
  });
});

/**
 * Arreglo 7 del diagnóstico: «el manifest no escucha MY_PACKAGE_REPLACED». Revisado el 28/09: SÍ lo
 * escucha. `expo-notifications` 57 declara en su propio manifiesto (que se fusiona en el APK) el receptor
 * `NotificationsService` con `MY_PACKAGE_REPLACED`, y en ese evento vuelve a programar todas las alarmas
 * guardadas (`SETUP_ACTIONS` → `onSetupScheduledNotifications`). Por eso no hace falta ningún plugin. Esta
 * prueba es la guarda: si una actualización de la librería lo saca, falla acá y no en un teléfono.
 */
describe('rearmar al actualizar la app', () => {
  it('expo-notifications trae MY_PACKAGE_REPLACED en su receptor y lo trata como un arranque', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    const base = require.resolve('expo-notifications/package.json').replace(/package\.json$/, '');
    const manifiesto = fs.readFileSync(`${base}android/src/main/AndroidManifest.xml`, 'utf8');
    expect(manifiesto).toMatch(/NotificationsService[\s\S]*android\.intent\.action\.MY_PACKAGE_REPLACED/);
    const servicio = fs.readFileSync(
      `${base}android/src/main/java/expo/modules/notifications/service/NotificationsService.kt`,
      'utf8',
    );
    expect(servicio).toMatch(/SETUP_ACTIONS = listOf\([\s\S]*Intent\.ACTION_MY_PACKAGE_REPLACED/);
  });
});

function leer(desdeSrc: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');
  return fs.readFileSync(path.join(__dirname, '../../..', desdeSrc), 'utf8');
}
