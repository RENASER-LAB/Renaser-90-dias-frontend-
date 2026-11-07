import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ID_ANDROID_DEL_SERVICIO_GPS, ID_NOTIFICACION_CARRERA } from '../features/carrera/utils/avisoDeCarrera';

/**
 * Spec 042 (2026-11-05): durante una carrera con GPS salían DOS notificaciones (la del servicio en primer plano de `expo-location`
 * y la nuestra con los km y los botones). El dueño pidió una sola. `scripts/arreglar-notificacion-de-carrera.js` (en
 * `postinstall`) fija el id de la del servicio y hace que `expo-notifications` publique la de la carrera con ese id y sin tag: así
 * Android la toma como la del servicio y la reemplaza. El Kotlin no se ejercita en jest; se exige que el código que se compila sea
 * el parchado (y que se compile desde el código, no desde el .aar).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const script = require('../../scripts/arreglar-notificacion-de-carrera.js') as {
  aplicar: (nodeModules: string) => { location: string; notifications: string };
  MARCA: string;
  MARCA_V1: string;
  ID_DEL_SERVICIO: number;
  IDENTIFICADOR_DE_LA_CARRERA: string;
  LOCATION: { archivo: string };
  NOTIFICATIONS: { archivo: string; ediciones: { original: string; nuevo: string; nuevoV1?: string }[] };
};

/** Lo de `LocationTaskService.kt` de la 57.0.22 que toca el script, tal cual. */
const SERVICIO_ORIGINAL = `package expo.modules.location.services

class LocationTaskService : Service() {
  private var mChannelId: String? = null
  private var mKillService = false
  private lateinit var mParentContext: Context
  private val mServiceId = sServiceId++
  private val mBinder: IBinder = ServiceBinder()

  fun startForeground(serviceOptions: Bundle) {
    val notification = buildServiceNotification(serviceOptions)
    startForeground(mServiceId, notification)
  }

  companion object {
    private var sServiceId = 481756
  }
}
`;

/** Lo de `ExpoPresentationDelegate.kt` de la 57.0.17 que toca el script, tal cual. */
const PRESENTACION_ORIGINAL = `package expo.modules.notifications.service.delegates

import androidx.core.app.NotificationManagerCompat

open class ExpoPresentationDelegate(
  protected val context: Context,
  private val notificationManager: NotificationManagerCompat = NotificationManagerCompat.from(context)
) : PresentationDelegate {

  override fun presentNotification(notification: Notification, behavior: NotificationBehaviorRecord?) {
    CoroutineScope(Dispatchers.IO).launch {
      val androidNotification = createNotification(notification, behavior)

      NotificationManagerCompat.from(context).notify(
        notification.notificationRequest.identifier,
        getNotifyId(notification.notificationRequest),
        androidNotification
      )
    }
  }

  override fun dismissNotifications(identifiers: Collection<String>) {
    identifiers.forEach { identifier ->
      val foreignNotification = parseNotificationIdentifier(identifier)
      if (foreignNotification != null) {
        NotificationManagerCompat.from(context).cancel(foreignNotification.first, foreignNotification.second)
      } else {
        val existingNotification = this.getAllPresentedNotifications().find { it.notificationRequest.identifier == identifier }
        NotificationManagerCompat.from(context).cancel(identifier, getNotifyId(existingNotification?.notificationRequest))
      }
    }
  }
}
`;

function nodeModulesFalso(opc: { location?: string; notifications?: string; servicio?: string; presentacion?: string } = {}): string {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'nm-carrera-'));
  const poner = (paquete: string, version: string, archivo: string, kotlin: string) => {
    fs.mkdirSync(path.dirname(path.join(raiz, paquete, archivo)), { recursive: true });
    fs.writeFileSync(path.join(raiz, paquete, 'package.json'), JSON.stringify({ name: paquete, version }));
    fs.writeFileSync(path.join(raiz, paquete, archivo), kotlin);
  };
  poner('expo-location', opc.location ?? '57.0.22', script.LOCATION.archivo, opc.servicio ?? SERVICIO_ORIGINAL);
  poner('expo-notifications', opc.notifications ?? '57.0.17', script.NOTIFICATIONS.archivo, opc.presentacion ?? PRESENTACION_ORIGINAL);
  return raiz;
}

const leer = (raiz: string, paquete: string, archivo: string) => fs.readFileSync(path.join(raiz, paquete, archivo), 'utf8');
const veces = (donde: string, texto: string): number => donde.split(texto).length - 1;

describe('una sola notificación durante la carrera (parche nativo)', () => {
  // spec 042 FR-011
  it('un node_modules ya parchado con la versión anterior (v1) se actualiza a la dorada sin cortar la instalación', () => {
    // Así quedaba el archivo con v1: cada edición aplicada con su texto de entonces y la marca vieja arriba.
    let conV1 = PRESENTACION_ORIGINAL;
    for (const e of script.NOTIFICATIONS.ediciones) conV1 = conV1.replace(e.original, () => e.nuevoV1 ?? e.nuevo);
    const nm = nodeModulesFalso({ presentacion: `${script.MARCA_V1}\n${conV1}` });
    expect(() => script.aplicar(nm)).not.toThrow();
    const presentacion = leer(nm, 'expo-notifications', script.NOTIFICATIONS.archivo);
    expect(presentacion.startsWith(script.MARCA)).toBe(true);
    expect(presentacion).not.toContain(script.MARCA_V1 + '\n');
    expect(presentacion).toContain('.setColorized(true)');
    expect(veces(presentacion, 'RENASER_ID_DEL_SERVICIO_GPS = ')).toBe(1);
  });

  // spec 042 FR-011
  it('fija el id del servicio del GPS y publica la de la carrera con ese id y sin tag', () => {
    const nm = nodeModulesFalso();
    expect(script.aplicar(nm)).toEqual({ location: 'aplicado', notifications: 'aplicado' });

    const servicio = leer(nm, 'expo-location', script.LOCATION.archivo);
    expect(servicio.startsWith(script.MARCA)).toBe(true);
    expect(servicio).toContain('private val mServiceId = sServiceId\n');
    expect(servicio).not.toContain('sServiceId++');
    expect(servicio).toContain('startForeground(mServiceId, notification)');

    const presentacion = leer(nm, 'expo-notifications', script.NOTIFICATIONS.archivo);
    expect(presentacion.startsWith(script.MARCA)).toBe(true);
    expect(presentacion).toContain(`private const val RENASER_IDENTIFICADOR_CARRERA = "${ID_NOTIFICACION_CARRERA}"`);
    expect(presentacion).toContain(`private const val RENASER_ID_DEL_SERVICIO_GPS = ${ID_ANDROID_DEL_SERVICIO_GPS}`);
    // Sin tag: `notify(id, n)` y `cancel(id)` de NotificationManagerCompat usan tag null, como el servicio.
    expect(presentacion).toContain('NotificationManagerCompat.from(context).notify(RENASER_ID_DEL_SERVICIO_GPS, androidNotification)');
    expect(presentacion).toContain('NotificationManagerCompat.from(context).cancel(RENASER_ID_DEL_SERVICIO_GPS)');
    // Dorada y con cronómetro (2026-11-07): coloreada (solo se permite en la de un servicio en primer plano) y el tiempo lo
    // lleva el cronómetro del sistema mientras corre.
    expect(presentacion).toContain('Notification.Builder.recoverBuilder(context, androidNotification)');
    expect(presentacion).toContain('.setColorized(true)');
    expect(presentacion).toContain('.setColor(0xFFB2924F.toInt())');
    expect(presentacion).toContain('setUsesChronometer(true)');
    expect(presentacion).toContain('optLong("inicioCronometroMs", 0L)');
    // No suena ni vibra en cada actualización, y queda fija.
    expect(presentacion).toContain('FLAG_ONLY_ALERT_ONCE');
    expect(presentacion).toContain('FLAG_ONGOING_EVENT');
    // El resto de las notificaciones, como siempre (tag = identificador).
    expect(presentacion).toContain('notification.notificationRequest.identifier,\n          getNotifyId(notification.notificationRequest),');
    expect(presentacion).toContain('cancel(identifier, getNotifyId(existingNotification?.notificationRequest))');
    expect(veces(presentacion, '{')).toBe(veces(presentacion, '}'));
    expect(veces(presentacion, '(')).toBe(veces(presentacion, ')'));
  });

  // spec 042 FR-011
  it('el id y el identificador del script son los mismos que usa la app', () => {
    expect(script.ID_DEL_SERVICIO).toBe(ID_ANDROID_DEL_SERVICIO_GPS);
    expect(script.IDENTIFICADOR_DE_LA_CARRERA).toBe(ID_NOTIFICACION_CARRERA);
    // El contador de expo-location arranca en ese número: la primera carrera del proceso ya lo usaba.
    expect(SERVICIO_ORIGINAL).toContain(`private var sServiceId = ${ID_ANDROID_DEL_SERVICIO_GPS}`);
  });

  it('es idempotente', () => {
    const nm = nodeModulesFalso();
    script.aplicar(nm);
    const antes = leer(nm, 'expo-notifications', script.NOTIFICATIONS.archivo);
    expect(script.aplicar(nm)).toEqual({ location: 'ya-aplicado', notifications: 'ya-aplicado' });
    expect(leer(nm, 'expo-notifications', script.NOTIFICATIONS.archivo)).toBe(antes);
  });

  it('no toca otras versiones y falla fuerte si falta un fragmento, sin dejar nada a medias', () => {
    const otra = nodeModulesFalso({ location: '58.0.0', notifications: '58.0.0' });
    expect(script.aplicar(otra)).toEqual({ location: 'otra-version', notifications: 'otra-version' });
    expect(leer(otra, 'expo-location', script.LOCATION.archivo)).toBe(SERVICIO_ORIGINAL);

    const rota = PRESENTACION_ORIGINAL.replace('getNotifyId(existingNotification?.notificationRequest)', 'otraCosa()');
    const nm = nodeModulesFalso({ presentacion: rota });
    expect(() => script.aplicar(nm)).toThrow(/cancelación/);
    expect(leer(nm, 'expo-notifications', script.NOTIFICATIONS.archivo)).toBe(rota);
  });

  // spec 042 FR-011
  it('corre en postinstall y los dos módulos se compilan desde el código parchado', () => {
    const paquete = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
      scripts: { postinstall: string };
      expo: { autolinking: { android: { buildFromSource: string[] } } };
    };
    const pasos = paquete.scripts.postinstall.split('&&').map(p => p.trim());
    expect(pasos).toContain('node scripts/arreglar-notificacion-de-carrera.js');
    expect(paquete.expo.autolinking.android.buildFromSource).toEqual(expect.arrayContaining(['expo-location', 'expo-notifications']));
  });

  // spec 042 FR-011
  it('lo instalado en node_modules lleva el parche', () => {
    const nm = path.join(__dirname, '../../node_modules');
    expect(leer(nm, 'expo-location', script.LOCATION.archivo)).toContain(script.MARCA);
    expect(leer(nm, 'expo-notifications', script.NOTIFICATIONS.archivo)).toContain(script.MARCA);
  });
});
