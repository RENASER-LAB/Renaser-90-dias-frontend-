#!/usr/bin/env node
/**
 * Una sola notificación durante la carrera con GPS (spec 042, FR-011).
 *
 * EL PEDIDO (2026-11-05). Durante una carrera salían DOS notificaciones a la vez: la del servicio en primer plano de
 * `expo-location` (la que Android exige para el GPS, con un título fijo y sin botones) y la nuestra, con los km, el tiempo y
 * «Pausar» / «Abrir». El dueño pidió una sola.
 *
 * POR QUÉ UN PARCHE. El texto de la del servicio no se puede cambiar desde JavaScript sin cortar el GPS:
 * `startLocationUpdatesAsync` con opciones nuevas pasa por `LocationTaskConsumer.setOptions`, que detiene y vuelve a empezar las
 * lecturas. Pero Android deja que la app REEMPLACE la notificación de un servicio en primer plano: si publica otra con el mismo id
 * y sin tag, el sistema la toma como la del servicio (le conserva la marca de servicio y la deja fija). Para eso hacen falta dos
 * cosas que ningún módulo deja configurar:
 *
 *  (a) `expo-location` 57.0.22, `LocationTaskService.kt`: el id de la notificación del servicio sale de un contador
 *      (`sServiceId++`, desde 481756): la segunda carrera del mismo proceso usaría 481757. Se fija en 481756.
 *  (b) `expo-notifications` 57.0.17, `ExpoPresentationDelegate.kt`: toda notificación se publica con tag = identificador y
 *      id = 0. La de la carrera (identificador `carrera-en-vivo`) se publica SIN tag y con el id 481756, y con
 *      `FLAG_ONLY_ALERT_ONCE` (no suena ni vibra en cada actualización) y fija. Quitarla (`dismissNotificationAsync`) cancela
 *      ese mismo id: con el servicio vivo Android no deja quitarla, y al terminar la carrera el servicio ya se fue
 *      (`stopForeground(true)`), así que desaparece.
 *
 * Las dos constantes viven también en `src/features/carrera/utils/avisoDeCarrera.ts`; `notificacionUnica.test.ts` exige que
 * coincidan. Los dos módulos van en `expo.autolinking.android.buildFromSource` de `package.json`: sin eso gradle enlaza el `.aar`
 * precompilado y el parche no llega al APK.
 *
 * Idempotente (marca al principio de cada archivo), falla FUERTE si en la versión esperada falta un fragmento, y no toca nada si
 * la versión instalada es otra (ahí hay que revisar a mano y ajustar este script).
 */
const fs = require('fs');
const path = require('path');

const MARCA = '// [renaser] una sola notificación de la carrera, dorada y con cronómetro (scripts/arreglar-notificacion-de-carrera.js, v2)';

/**
 * La marca de la versión anterior (v1, 2026-11-05: una sola notificación, sin color ni cronómetro). Vercel y otros armados
 * reusan node_modules ya parchados con v1: sin reconocerla, el script no encontraba los originales y cortaba la instalación
 * (2026-11-07). Un archivo con v1 se devuelve a su original y se le aplica la versión actual.
 */
const MARCA_V1 = '// [renaser] una sola notificación de la carrera (scripts/arreglar-notificacion-de-carrera.js)';

const ID_DEL_SERVICIO = 481756;
const IDENTIFICADOR_DE_LA_CARRERA = 'carrera-en-vivo';

const LOCATION = {
  paquete: 'expo-location',
  version: '57.0.22',
  archivo: 'android/src/main/java/expo/modules/location/services/LocationTaskService.kt',
  ediciones: [
    {
      nombre: 'el id de la notificación del servicio',
      original: '  private val mServiceId = sServiceId++\n',
      nuevo:
        '  // [renaser] id fijo: la notificación de la carrera (expo-notifications) lo usa para reemplazar esta y quedar una sola.\n' +
        '  private val mServiceId = sServiceId\n',
    },
  ],
};

const NOTIFICATIONS = {
  paquete: 'expo-notifications',
  version: '57.0.17',
  archivo: 'android/src/main/java/expo/modules/notifications/service/delegates/ExpoPresentationDelegate.kt',
  ediciones: [
    {
      nombre: 'la clase ExpoPresentationDelegate',
      original: 'open class ExpoPresentationDelegate(\n',
      nuevo:
        '// [renaser] La notificación de la carrera con GPS reemplaza la del servicio en primer plano de expo-location:\n' +
        '// mismo id (481756, fijo en LocationTaskService) y sin tag.\n' +
        `private const val RENASER_IDENTIFICADOR_CARRERA = "${IDENTIFICADOR_DE_LA_CARRERA}"\n` +
        `private const val RENASER_ID_DEL_SERVICIO_GPS = ${ID_DEL_SERVICIO}\n\n` +
        'open class ExpoPresentationDelegate(\n',
    },
    {
      nombre: 'la publicación de la notificación',
      nuevoV1: "      if (notification.notificationRequest.identifier == RENASER_IDENTIFICADOR_CARRERA) {\n        androidNotification.flags = androidNotification.flags or\n          android.app.Notification.FLAG_ONLY_ALERT_ONCE or\n          android.app.Notification.FLAG_ONGOING_EVENT or\n          android.app.Notification.FLAG_NO_CLEAR\n        NotificationManagerCompat.from(context).notify(RENASER_ID_DEL_SERVICIO_GPS, androidNotification)\n      } else {\n        NotificationManagerCompat.from(context).notify(\n          notification.notificationRequest.identifier,\n          getNotifyId(notification.notificationRequest),\n          androidNotification\n        )\n      }",
      original: `      NotificationManagerCompat.from(context).notify(
        notification.notificationRequest.identifier,
        getNotifyId(notification.notificationRequest),
        androidNotification
      )`,
      nuevo: `      if (notification.notificationRequest.identifier == RENASER_IDENTIFICADOR_CARRERA) {
        // [renaser] Dorada y con cronómetro (2026-11-07): la de un servicio en primer plano puede ir coloreada. Corriendo, el
        // cronómetro del sistema lleva el tiempo activo (sube solo); en pausa se apaga y el tiempo va en el texto.
        val renaserDatos = notification.notificationRequest.content.body
        val renaserBuilder = android.app.Notification.Builder.recoverBuilder(context, androidNotification)
          .setColor(0xFFB2924F.toInt())
          .setColorized(true)
        val renaserInicio = renaserDatos?.optLong("inicioCronometroMs", 0L) ?: 0L
        if (renaserDatos?.optBoolean("enPausa", true) == false && renaserInicio > 0L) {
          renaserBuilder.setWhen(renaserInicio).setShowWhen(true).setUsesChronometer(true)
        } else {
          renaserBuilder.setShowWhen(false).setUsesChronometer(false)
        }
        val androidNotification = renaserBuilder.build()
        androidNotification.flags = androidNotification.flags or
          android.app.Notification.FLAG_ONLY_ALERT_ONCE or
          android.app.Notification.FLAG_ONGOING_EVENT or
          android.app.Notification.FLAG_NO_CLEAR
        NotificationManagerCompat.from(context).notify(RENASER_ID_DEL_SERVICIO_GPS, androidNotification)
      } else {
        NotificationManagerCompat.from(context).notify(
          notification.notificationRequest.identifier,
          getNotifyId(notification.notificationRequest),
          androidNotification
        )
      }`,
    },
    {
      nombre: 'la cancelación de una notificación propia',
      original:
        '        NotificationManagerCompat.from(context).cancel(identifier, getNotifyId(existingNotification?.notificationRequest))\n',
      nuevo:
        '        if (identifier == RENASER_IDENTIFICADOR_CARRERA) {\n' +
        '          NotificationManagerCompat.from(context).cancel(RENASER_ID_DEL_SERVICIO_GPS)\n' +
        '        } else {\n' +
        '          NotificationManagerCompat.from(context).cancel(identifier, getNotifyId(existingNotification?.notificationRequest))\n' +
        '        }\n',
    },
  ],
};

function veces(donde, texto) {
  return donde.split(texto).length - 1;
}

/** Aplica un parche a la raíz de un paquete. Devuelve 'sin-paquete' | 'otra-version' | 'ya-aplicado' | 'aplicado'. */
function aplicarA(raiz, parche) {
  const pkg = path.join(raiz, 'package.json');
  if (!fs.existsSync(pkg)) return 'sin-paquete';
  const version = JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
  if (version !== parche.version) return 'otra-version';
  const archivo = path.join(raiz, parche.archivo);
  if (!fs.existsSync(archivo)) {
    throw new Error(`[renaser] ${parche.paquete} ${parche.version}: falta ${parche.archivo}; revisa scripts/arreglar-notificacion-de-carrera.js`);
  }
  let kotlin = fs.readFileSync(archivo, 'utf8');
  if (kotlin.includes(MARCA)) return 'ya-aplicado';
  if (kotlin.startsWith(`${MARCA_V1}\n`)) {
    // Parchado con v1: se deshace (cada edición vuelve a su original) y sigue como un archivo limpio.
    kotlin = kotlin.slice(MARCA_V1.length + 1);
    for (const { original, nuevo, nuevoV1 } of parche.ediciones) {
      const deV1 = nuevoV1 ?? nuevo;
      if (veces(kotlin, deV1) === 1) kotlin = kotlin.replace(deV1, () => original);
    }
  }
  for (const { nombre, original, nuevo } of parche.ediciones) {
    if (veces(kotlin, original) !== 1) {
      throw new Error(
        `[renaser] ${parche.paquete} ${parche.version}: no encuentro ${nombre} en ${path.basename(parche.archivo)}; ` +
          'revisa scripts/arreglar-notificacion-de-carrera.js',
      );
    }
    kotlin = kotlin.replace(original, () => nuevo);
  }
  fs.writeFileSync(archivo, `${MARCA}\n${kotlin}`);
  return 'aplicado';
}

/** Aplica los dos parches bajo `nodeModules`. */
function aplicar(nodeModules) {
  return {
    location: aplicarA(path.join(nodeModules, LOCATION.paquete), LOCATION),
    notifications: aplicarA(path.join(nodeModules, NOTIFICATIONS.paquete), NOTIFICATIONS),
  };
}

module.exports = { aplicar, aplicarA, MARCA, MARCA_V1, ID_DEL_SERVICIO, IDENTIFICADOR_DE_LA_CARRERA, LOCATION, NOTIFICATIONS };

if (require.main === module) {
  const r = aplicar(path.join(__dirname, '..', 'node_modules'));
  for (const [modulo, resultado] of Object.entries(r)) {
    if (resultado === 'aplicado') console.log(`[renaser] expo-${modulo}: una sola notificación durante la carrera`);
    if (resultado === 'otra-version') {
      console.log(`[renaser] expo-${modulo} cambió de versión: revisa scripts/arreglar-notificacion-de-carrera.js`);
    }
  }
}
