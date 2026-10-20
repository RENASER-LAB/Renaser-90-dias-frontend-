import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Spec 007 (2026-10-19): «la alarma creo que quiere así como la alarma en Android». Los usuarios decían
 * que sus recordatorios no sonaban; el dueño pidió que se comporten como la alarma del reloj: a la hora
 * exacta aunque el teléfono esté en reposo, y con el trato de «próxima alarma» (ícono en la barra).
 *
 * `expo-notifications` 57.0.17 programa TODA alarma con `setExactAndAllowWhileIdle`, que en Doze solo
 * puede sonar una vez cada 9 min por app (dos hábitos a 2 minutos de distancia: el segundo se corre).
 * `AlarmManager.setAlarmClock` no tiene ese límite y el sistema no mueve su hora. La clase que elige la
 * alarma es `ExpoSchedulingDelegate.setupAlarm` y no es configurable, así que
 * `scripts/arreglar-alarmas-tipo-despertador.js` (en `postinstall`) la parcha: toda alarma pasa a tipo
 * despertador cuando hay permiso de alarmas exactas, salvo las de intervalo (`TimeIntervalTrigger`), que
 * en la app es solo la prueba de sonido de 3 s y no debe aparecer como próxima alarma (FR-005).
 *
 * Lo que hace el Kotlin no se puede ejercitar en jest; lo que sí se exige es que el código nativo que se
 * compila sea el parchado. Sin el script en `postinstall`, la última prueba falla. El instalado se vigila
 * por versión: si `expo-notifications` sube, la prueba obliga a revisar si el parche sigue haciendo falta.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { aplicar, MARCA } = require('../../scripts/arreglar-alarmas-tipo-despertador.js') as {
  aplicar: (raiz: string) => string;
  MARCA: string;
};

const DELEGADO = 'android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt';

/** Los fragmentos de `ExpoSchedulingDelegate.kt` de la 57.0.17 que el script reemplaza, tal cual. */
const KOTLIN_ORIGINAL = `package expo.modules.notifications.service.delegates

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.AlarmManagerCompat
import expo.modules.notifications.notifications.interfaces.SchedulableNotificationTrigger
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.notifications.triggers.ChannelAwareTrigger
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.interfaces.SchedulingDelegate
import java.io.IOException
import java.io.InvalidClassException

class ExpoSchedulingDelegate(protected val context: Context) : SchedulingDelegate {
  protected val store = SharedPreferencesNotificationsStore(context)
  protected val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  override fun scheduleNotification(request: NotificationRequest) {
    (request.trigger as SchedulableNotificationTrigger).nextTriggerDate().let { nextTriggerDate ->
      if (nextTriggerDate == null) {
        NotificationsService.removeScheduledNotification(context, request.identifier)
      } else {
        store.saveNotificationRequest(request)
        setupAlarm(nextTriggerDate.time, NotificationsService.createNotificationTrigger(context, request.identifier))
      }
    }
  }

  private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
      AlarmManagerCompat.setExactAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    } else {
      AlarmManagerCompat.setAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    }
  }
}
`;

/** La rama sin permiso de `setupAlarm` (setAndAllowWhileIdle): el parche no la toca. */
const RAMA_SIN_PERMISO = `    } else {
      AlarmManagerCompat.setAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    }
  }
}
`;

function paqueteFalso(version: string, kotlin: string = KOTLIN_ORIGINAL): string {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'exponotif-'));
  fs.mkdirSync(path.dirname(path.join(raiz, DELEGADO)), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'package.json'), JSON.stringify({ name: 'expo-notifications', version }));
  fs.writeFileSync(path.join(raiz, DELEGADO), kotlin);
  return raiz;
}

const leer = (raiz: string): string => fs.readFileSync(path.join(raiz, DELEGADO), 'utf8');

/** Cuenta cuántas veces aparece `texto` (para exigir que un fragmento entre una sola vez). */
const veces = (donde: string, texto: string): number => donde.split(texto).length - 1;

describe('alarmas de expo-notifications como alarma del reloj (setAlarmClock)', () => {
  it('en 57.0.17 deja la alarma tipo despertador cuando hay permiso, y la de intervalo como estaba', () => {
    const raiz = paqueteFalso('57.0.17');
    expect(aplicar(raiz)).toBe('aplicado');
    const kotlin = leer(raiz);
    expect(kotlin.startsWith(MARCA)).toBe(true);

    // (a) scheduleNotification: solo el disparador de intervalo (la prueba de sonido) queda fuera.
    expect(kotlin).toContain('import expo.modules.notifications.notifications.triggers.TimeIntervalTrigger');
    expect(kotlin).toContain(
      'setupAlarm(nextTriggerDate.time, NotificationsService.createNotificationTrigger(context, request.identifier), request.trigger !is TimeIntervalTrigger)',
    );

    // (b) setupAlarm: despertador en la rama exacta, con la app como «mostrar» de la alarma.
    expect(kotlin).toContain('private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent, comoDespertador: Boolean = false)');
    expect(kotlin).toContain('alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAtMillis, show), operation)');
    expect(kotlin).toContain('getLaunchIntentForPackage(context.packageName)');
    expect(kotlin).toContain('PendingIntent.FLAG_IMMUTABLE');

    // La rama exacta de antes sigue para lo que no es despertador, y la rama SIN permiso no cambió.
    expect(kotlin).toContain('AlarmManagerCompat.setExactAndAllowWhileIdle(');
    expect(kotlin).toContain(RAMA_SIN_PERMISO);
    expect(veces(kotlin, 'AlarmManagerCompat.setAndAllowWhileIdle(')).toBe(1);
  });

  it('el Kotlin resultante queda con llaves y paréntesis balanceados (sin compilador a mano)', () => {
    const raiz = paqueteFalso('57.0.17');
    aplicar(raiz);
    const kotlin = leer(raiz);
    expect(veces(kotlin, '{')).toBe(veces(kotlin, '}'));
    expect(veces(kotlin, '(')).toBe(veces(kotlin, ')'));
  });

  it('es idempotente', () => {
    const raiz = paqueteFalso('57.0.17');
    aplicar(raiz);
    const despues = leer(raiz);
    expect(aplicar(raiz)).toBe('ya-aplicado');
    expect(leer(raiz)).toBe(despues);
    expect(veces(despues, MARCA)).toBe(1);
  });

  it('sin el paquete instalado no hace nada', () => {
    const vacio = fs.mkdtempSync(path.join(os.tmpdir(), 'exponotif-'));
    expect(aplicar(vacio)).toBe('sin-paquete');
  });

  it('no toca otras versiones: el Kotlin de otra versión hay que revisarlo a mano', () => {
    const raiz = paqueteFalso('57.1.0');
    expect(aplicar(raiz)).toBe('otra-version');
    expect(leer(raiz)).toBe(KOTLIN_ORIGINAL);
  });

  it('si el archivo de la 57.0.17 ya no trae un fragmento esperado, falla fuerte y no deja nada a medias', () => {
    const sinLlamada = KOTLIN_ORIGINAL.replace(
      'setupAlarm(nextTriggerDate.time, NotificationsService.createNotificationTrigger(context, request.identifier))',
      'setupAlarm(nextTriggerDate.time, operacionNueva)',
    );
    const a = paqueteFalso('57.0.17', sinLlamada);
    expect(() => aplicar(a)).toThrow(/scheduleNotification/);
    expect(leer(a)).toBe(sinLlamada);

    const sinImport = KOTLIN_ORIGINAL.replace(
      'import expo.modules.notifications.notifications.triggers.ChannelAwareTrigger\n',
      '',
    );
    const b = paqueteFalso('57.0.17', sinImport);
    expect(() => aplicar(b)).toThrow(/import/);
    expect(leer(b)).toBe(sinImport);

    const sinSetupAlarm = KOTLIN_ORIGINAL.replace('AlarmManagerCompat.setExactAndAllowWhileIdle(', 'AlarmManagerCompat.otraCosa(');
    const c = paqueteFalso('57.0.17', sinSetupAlarm);
    expect(() => aplicar(c)).toThrow(/setupAlarm/);
    expect(leer(c)).toBe(sinSetupAlarm);
  });

  it('el script corre al final de postinstall, para que npm ci deje el parche puesto', () => {
    const paquete = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
      scripts: { postinstall: string };
    };
    const pasos = paquete.scripts.postinstall.split('&&').map(p => p.trim());
    expect(pasos).toContain('node scripts/arreglar-alarmas-tipo-despertador.js');
    expect(pasos[pasos.length - 1]).toBe('node scripts/arreglar-alarmas-tipo-despertador.js');
  });

  // E-637: Expo 57 enlaza `expo-notifications` como .aar precompilado (`local-maven-repo`) y el Kotlin
  // parchado en `node_modules` no se compilaba: el APK salía con `setExactAndAllowWhileIdle` (flags=0x5,
  // sin «Next alarm clock» en `dumpsys alarm`). Solo `buildFromSource` hace que gradle use el código.
  it('expo-notifications se compila desde el código parchado y no desde el .aar precompilado', () => {
    const paquete = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
      expo?: { autolinking?: { android?: { buildFromSource?: string[] } } };
    };
    const desdeElCodigo = paquete.expo?.autolinking?.android?.buildFromSource ?? [];
    expect(desdeElCodigo.some(patron => new RegExp(patron).test('expo-notifications'))).toBe(true);
  });

  it('el expo-notifications instalado está parchado (o cambió de versión y hay que revisar el parche)', () => {
    const raiz = path.join(__dirname, '../../node_modules/expo-notifications');
    const version: string = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8')).version;
    if (version === '57.0.17') {
      expect(leer(raiz)).toContain(MARCA);
    } else {
      // El parche solo conoce el Kotlin de la 57.0.17. Si la versión subió, hay que mirar si
      // `ExpoSchedulingDelegate.setupAlarm` sigue igual (o si ya usa setAlarmClock) y ajustar el script.
      throw new Error(`expo-notifications ${version}: revisa scripts/arreglar-alarmas-tipo-despertador.js (pensado para 57.0.17)`);
    }
  });
});
