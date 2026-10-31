import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Issue #40 (2026-10-31): «un aviso de inicio vale hasta la hora del hábito; después no se muestra». Una alarma inexacta
 * (sin el permiso «Alarmas y recordatorios») la entrega Android mucho después (el rearmado documenta `window=+1h`, el e2e del
 * 26/10 midió `+40m59s`) y `ExpoSchedulingDelegate.triggerNotification` la mostraba igual, con su texto fijo «Te toca a las
 * 07:00.». `scripts/arreglar-aviso-tardio.js` (en `postinstall`) parcha esa función: si el aviso lleva `data.vigenteMin` y el
 * atraso desde su hora nominal lo pasa, no se muestra (la alarma diaria o semanal se vuelve a armar igual).
 *
 * Lo que hace el Kotlin no se puede ejercitar en Jest (ni se compiló al escribirlo: se valida al armar el APK); lo que sí se
 * exige es que el parche se aplique sobre el Kotlin de la 57.0.17, que conviva con el de las alarmas tipo despertador (otras
 * líneas del mismo archivo, en cualquier orden) y que el nombre del campo sea el mismo que escribe la app.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { aplicar, MARCA } = require('../../scripts/arreglar-aviso-tardio.js') as {
  aplicar: (raiz: string) => string;
  MARCA: string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const despertador = require('../../scripts/arreglar-alarmas-tipo-despertador.js') as {
  aplicar: (raiz: string) => string;
  MARCA: string;
};

const DELEGADO = 'android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt';

/** Los fragmentos de `ExpoSchedulingDelegate.kt` de la 57.0.17 que tocan los dos scripts, tal cual. */
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
    // If the trigger is empty, handle receive immediately and return.
    if (request.trigger == null) {
      NotificationsService.receive(context, Notification(request))
      return
    }
    (request.trigger as SchedulableNotificationTrigger).nextTriggerDate().let { nextTriggerDate ->
      if (nextTriggerDate == null) {
        NotificationsService.removeScheduledNotification(context, request.identifier)
      } else {
        store.saveNotificationRequest(request)
        setupAlarm(nextTriggerDate.time, NotificationsService.createNotificationTrigger(context, request.identifier))
      }
    }
  }

  override fun triggerNotification(identifier: String) {
    try {
      val notificationRequest: NotificationRequest = store.getNotificationRequest(identifier)!!
      NotificationsService.receive(context, Notification(notificationRequest))
      NotificationsService.schedule(context, notificationRequest)
    } catch (e: ClassNotFoundException) {
      Log.e("expo-notifications", "An exception occurred while triggering notification " + identifier + ", removing. " + e.message)
      NotificationsService.removeScheduledNotification(context, identifier)
    }
  }

  override fun removeScheduledNotifications(identifiers: Collection<String>) {
    identifiers.forEach {
      alarmManager.cancel(NotificationsService.createNotificationTrigger(context, it))
      store.removeNotificationRequest(it)
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

describe('el aviso que llega después de su hora no se muestra (issue #40)', () => {
  it('en 57.0.17 la entrega mira la vigencia antes de mostrar y la alarma se vuelve a armar igual', () => {
    const raiz = paqueteFalso('57.0.17');
    expect(aplicar(raiz)).toBe('aplicado');
    const kotlin = leer(raiz);
    expect(kotlin.startsWith(MARCA)).toBe(true);

    // La entrega: solo se muestra si no está vencido; `schedule` queda donde estaba, fuera del `if`, así la diaria/semanal se re-arma.
    expect(kotlin).toContain('if (avisoVencido(notificationRequest)) {');
    expect(kotlin).toMatch(/\} else \{\s+NotificationsService\.receive\(context, Notification\(notificationRequest\)\)\s+\}\s+NotificationsService\.schedule\(context, notificationRequest\)/);
    // La entrega INMEDIATA de scheduleNotification (disparador vacío) no pasa por la guarda.
    expect(kotlin).toContain('NotificationsService.receive(context, Notification(request))');
    expect(veces(kotlin, 'NotificationsService.receive(')).toBe(2);

    // El campo es el que escribe la app y se lee del `data` del aviso (en Android, el «body» del contenido).
    expect(kotlin).toContain('request.content.body?.optDouble("vigenteMin", -1.0)');
    // Sin el campo no se examina nada: lo que no es un aviso de inicio de hábito se muestra como siempre.
    expect(kotlin).toContain('if (vigenteMin < 0) return false');

    // Tres tipos de disparador con hora nominal, y nada más.
    expect(kotlin).toContain('is DateTrigger -> trigger.timestamp');
    expect(kotlin).toContain('is DailyTrigger -> ultimaOcurrencia(ahora, null, trigger.hour, trigger.minute)');
    expect(kotlin).toContain('is WeeklyTrigger -> ultimaOcurrencia(ahora, trigger.weekday, trigger.hour, trigger.minute)');
    expect(kotlin).toContain('else -> null');
    // Unos milisegundos antes de la hora no es «ayer».
    expect(kotlin).toContain('if (ocurrencia.timeInMillis - ahora > 60_000)');

    // Los imports que usa, una sola vez cada uno.
    for (const importado of [
      'expo.modules.notifications.notifications.interfaces.NotificationTrigger',
      'expo.modules.notifications.notifications.triggers.DailyTrigger',
      'expo.modules.notifications.notifications.triggers.DateTrigger',
      'expo.modules.notifications.notifications.triggers.WeeklyTrigger',
      'java.util.Calendar',
    ]) {
      expect(veces(kotlin, `import ${importado}\n`)).toBe(1);
    }
    // El resto del archivo no cambió.
    expect(kotlin).toContain('private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent) {');
    expect(kotlin).toContain('AlarmManagerCompat.setExactAndAllowWhileIdle(');
  });

  it('el Kotlin resultante queda con llaves y paréntesis balanceados (sin compilador a mano)', () => {
    const raiz = paqueteFalso('57.0.17');
    aplicar(raiz);
    const kotlin = leer(raiz);
    expect(veces(kotlin, '{')).toBe(veces(kotlin, '}'));
    expect(veces(kotlin, '(')).toBe(veces(kotlin, ')'));
    // El `${…}` del registro quedó como plantilla de Kotlin y no como texto de JavaScript.
    expect(kotlin).toContain('Notification ${notificationRequest.identifier} arrived after its time');
  });

  it('convive con el parche de las alarmas tipo despertador, en cualquier orden', () => {
    const primeroEste = paqueteFalso('57.0.17');
    expect(aplicar(primeroEste)).toBe('aplicado');
    expect(despertador.aplicar(primeroEste)).toBe('aplicado');

    const primeroElOtro = paqueteFalso('57.0.17');
    expect(despertador.aplicar(primeroElOtro)).toBe('aplicado');
    expect(aplicar(primeroElOtro)).toBe('aplicado');

    for (const raiz of [primeroEste, primeroElOtro]) {
      const kotlin = leer(raiz);
      expect(kotlin).toContain(MARCA);
      expect(kotlin).toContain(despertador.MARCA);
      expect(kotlin).toContain('if (avisoVencido(notificationRequest)) {');
      expect(kotlin).toContain('alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAtMillis, show), operation)');
      expect(veces(kotlin, '{')).toBe(veces(kotlin, '}'));
      expect(veces(kotlin, '(')).toBe(veces(kotlin, ')'));
    }
    // Y el mismo resultado sea cual sea el orden, salvo el de las dos marcas del principio.
    const sinMarcas = (k: string) => k.replace(MARCA, '').replace(despertador.MARCA, '');
    expect(sinMarcas(leer(primeroEste))).toBe(sinMarcas(leer(primeroElOtro)));
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
    const sinEntrega = KOTLIN_ORIGINAL.replace(
      'NotificationsService.receive(context, Notification(notificationRequest))',
      'NotificationsService.mostrar(context, notificationRequest)',
    );
    const a = paqueteFalso('57.0.17', sinEntrega);
    expect(() => aplicar(a)).toThrow(/triggerNotification/);
    expect(leer(a)).toBe(sinEntrega);

    const sinImport = KOTLIN_ORIGINAL.replace('import java.io.InvalidClassException\n', '');
    const b = paqueteFalso('57.0.17', sinImport);
    expect(() => aplicar(b)).toThrow(/imports/);
    expect(leer(b)).toBe(sinImport);

    const sinAncla = KOTLIN_ORIGINAL.replace('override fun removeScheduledNotifications(', 'override fun quitar(');
    const c = paqueteFalso('57.0.17', sinAncla);
    expect(() => aplicar(c)).toThrow(/auxiliares/);
    expect(leer(c)).toBe(sinAncla);
  });

  it('el script corre en postinstall (antes del de las alarmas tipo despertador, que queda de último)', () => {
    const paquete = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
      scripts: { postinstall: string };
    };
    const pasos = paquete.scripts.postinstall.split('&&').map(p => p.trim());
    expect(pasos).toContain('node scripts/arreglar-aviso-tardio.js');
    expect(pasos[pasos.length - 1]).toBe('node scripts/arreglar-alarmas-tipo-despertador.js');
  });
});

describe('el campo que lee Android es el que escribe la app', () => {
  it('`contenidoDelAviso` escribe `vigenteMin` y el parche lo lee con ese mismo nombre', () => {
    const app = fs.readFileSync(path.join(__dirname, '../features/habits/notificaciones/recordatoriosDeHabito.ts'), 'utf8');
    expect(app).toMatch(/vigenteMin: vigenciaDelAvisoMin\(minutosAntes\)/);
    const script = fs.readFileSync(path.join(__dirname, '../../scripts/arreglar-aviso-tardio.js'), 'utf8');
    expect(script).toContain('optDouble("vigenteMin", -1.0)');
  });
});
