/**
 * Permisos de Android que la app declara y los que NO debe llevar (spec 060, cumplimiento de tiendas).
 * Se prueba sin generar el proyecto: `app.json` manda. Origen: revisión del manifiesto del AAB 136 (versionCode 136, targetSdk 36),
 * que traía `SYSTEM_ALERT_WINDOW` y `WRITE_EXTERNAL_STORAGE` de la plantilla de Expo sin que la app los use.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

const raiz = path.resolve(__dirname, '..', '..');
const android = JSON.parse(fs.readFileSync(path.join(raiz, 'app.json'), 'utf-8')).expo.android as Record<string, any>;
const pedidos: string[] = android.permissions;
const bloqueados: string[] = android.blockedPermissions ?? [];

describe('permisos de Android en app.json', () => {
  // spec 060 FR-010
  it('bloquea SYSTEM_ALERT_WINDOW: ninguna pantalla se dibuja sobre otras apps (riesgo de tapjacking, ANDROID-OVERLAY-TAPJACKING)', () => {
    expect(bloqueados).toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(pedidos).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
  });

  // spec 060 FR-011
  it('bloquea WRITE_EXTERNAL_STORAGE: la app no escribe en el almacenamiento compartido (cámara y fotos van por el selector del sistema)', () => {
    expect(bloqueados).toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    expect(pedidos).not.toContain('android.permission.WRITE_EXTERNAL_STORAGE');
  });

  // spec 060 FR-012
  it('no pide los permisos de fotos y videos READ_MEDIA_*: Google exige declaración y el selector del sistema no los necesita', () => {
    const todos = [...pedidos];
    expect(todos.filter(p => /READ_MEDIA_(IMAGES|VIDEO|AUDIO|VISUAL_USER_SELECTED)/.test(p))).toEqual([]);
  });

  // spec 060 FR-013
  it('lo que la app sí usa sigue pedido: audio, servicio en primer plano de reproducción, alarma exacta y Health Connect de solo lectura', () => {
    for (const p of [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_DISTANCE',
    ]) {
      expect(pedidos).toContain(p);
    }
    // Health Connect: solo lectura de pasos y distancia, nada de escritura ni de datos en segundo plano.
    expect(pedidos.filter(p => p.startsWith('android.permission.health.')).sort()).toEqual([
      'android.permission.health.READ_DISTANCE',
      'android.permission.health.READ_STEPS',
    ]);
  });

  // spec 060 FR-014
  it('no bloquea lo que traen las librerías y la app necesita (cámara, GPS, reconocimiento de actividad, notificaciones)', () => {
    for (const p of bloqueados) {
      expect(p).not.toMatch(/CAMERA|ACCESS_(FINE|COARSE)_LOCATION|ACTIVITY_RECOGNITION|POST_NOTIFICATIONS|FOREGROUND_SERVICE|RECORD_AUDIO|health\./);
    }
  });

  // spec 060 FR-015
  it('la orientación es vertical (issue #252) y el GPS es solo con la app abierta', () => {
    const expo = JSON.parse(fs.readFileSync(path.join(raiz, 'app.json'), 'utf-8')).expo;
    expect(expo.orientation).toBe('portrait');
    const ubicacion = (expo.plugins as unknown[]).find(p => Array.isArray(p) && p[0] === 'expo-location') as [string, Record<string, unknown>];
    expect(ubicacion[1].isAndroidBackgroundLocationEnabled).toBe(false);
    expect(ubicacion[1].isAndroidForegroundServiceEnabled).toBe(true);
  });
});
