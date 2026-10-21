#!/usr/bin/env node
/**
 * Hace que toda alarma programada con `expo-notifications` (57.0.17) sea una alarma tipo despertador
 * de Android (`AlarmManager.setAlarmClock`) cuando el teléfono tiene el permiso «Alarmas y recordatorios».
 *
 * EL PEDIDO (spec 007, 2026-10-19). Los usuarios decían que los recordatorios de sus hábitos no sonaban
 * y el dueño dijo: «la alarma creo que quiere así como la alarma en Android». O sea: a la hora exacta
 * aunque el teléfono lleve rato en reposo, y con el trato de alarma del usuario (aparece como «próxima
 * alarma» y con el ícono del despertador en la barra de estado).
 *
 * EL PROBLEMA. `ExpoSchedulingDelegate.setupAlarm` programa TODA alarma con
 * `AlarmManagerCompat.setExactAndAllowWhileIdle`. Es exacta, pero en Doze Android la limita a una vez
 * cada 9 minutos por app: dos hábitos a 2 minutos de distancia, y el segundo se corre. Android lo dice
 * así de `setAlarmClock`: «continúan sonando con normalidad; el sistema sale de Doze poco antes de que
 * suenen» y «nunca ajusta su hora de entrega». La clase que decide el tipo de alarma no es configurable
 * (no hay config plugin que la reemplace), y un módulo propio duplicaría canales, voces, ruta, agrupación
 * de avisos (E-410) y cancelación. Por eso se parcha esa línea, como los otros scripts de `postinstall`.
 *
 * EL ARREGLO. Dos ediciones en `ExpoSchedulingDelegate.kt`:
 *  (a) `scheduleNotification` le pasa a `setupAlarm` un tercer argumento, `request.trigger !is
 *      TimeIntervalTrigger` (con su import): todo disparador programable (fecha, diario, semanal) pasa
 *      por ahí, también el rearmado tras sonar (`triggerNotification` -> `schedule`) y el del arranque
 *      (`setupScheduledNotifications`), así que un solo punto cubre todo.
 *  (b) `setupAlarm(..., comoDespertador: Boolean = false)`: en la rama exacta, si `comoDespertador`,
 *      usa `setAlarmClock(AlarmClockInfo(hora, show), operation)`. `show` es el intent de arranque de la
 *      app, inmutable (tocar la «próxima alarma» del reloj o de la pantalla de bloqueo abre Renaser);
 *      puede ser nulo. El `operation` (el `PendingIntent` por identificador) no cambia, así que
 *      re-programar una alarma vieja con el mismo identificador la REEMPLAZA por la de tipo despertador:
 *      el rearmado que ya corre al abrir la app (`rearmarAlarmas.ts`) convierte las instaladas.
 *
 * LO QUE NO CAMBIA.
 *  - Sin el permiso de alarmas exactas (Android 12+), sigue `setAndAllowWhileIdle` como hoy.
 *  - El disparador de intervalo (`TimeIntervalTrigger`) sigue como estaba: en la app es solo la prueba
 *    de sonido de Yo -> Alarmas (3 s), que no debe aparecer como «próxima alarma» (FR-005). Las
 *    notificaciones inmediatas ni se programan (`NotificationsService.receive`).
 *  - Aplica a TODAS las alarmas de la app (hábitos, Despertar, eventos, objetivos, Código Renaser,
 *    repaso del domingo): el delegado no distingue de dónde vienen. Es un borde anotado en la spec.
 *
 * ES IDEMPOTENTE (deja una marca al principio del archivo), falla FUERTE si el Kotlin de la 57.0.17 ya no
 * trae alguno de los fragmentos que reemplaza (mejor que `npm ci` se caiga a que la app salga sin el
 * arreglo creyendo que lo tiene) y no toca nada si la versión instalada es otra: ahí hay que mirar a mano
 * si `setupAlarm` sigue igual, o si el paquete ya usa `setAlarmClock`, y quitar o ajustar este script.
 *
 * CÓMO SE PRUEBA. `src/__tests__/alarmasTipoDespertador.test.ts` (paquete falso en `os.tmpdir()`; exige
 * además que el instalado lleve la marca). En el emulador, con el APK del worktree: `adb shell dumpsys
 * alarm` muestra las alarmas de Renaser como alarma del usuario («next alarm clock»), suenan con el
 * teléfono en Doze forzado, y la prueba de sonido no aparece como próxima alarma (quickstart A1-A6).
 */
const fs = require('fs');
const path = require('path');

const VERSION = '57.0.17';

const MARCA = '// [renaser] alarmas tipo despertador, setAlarmClock (scripts/arreglar-alarmas-tipo-despertador.js)';

const ARCHIVO = 'android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt';

/* ------------------------------------------------------------------------------------------------
 * Los fragmentos tal cual están en la 57.0.17
 * ---------------------------------------------------------------------------------------------- */

const IMPORT_ORIGINAL = 'import expo.modules.notifications.notifications.triggers.ChannelAwareTrigger\n';
const IMPORT_NUEVO =
  IMPORT_ORIGINAL + 'import expo.modules.notifications.notifications.triggers.TimeIntervalTrigger\n';

const LLAMADA_ORIGINAL =
  'setupAlarm(nextTriggerDate.time, NotificationsService.createNotificationTrigger(context, request.identifier))';
const LLAMADA_NUEVA =
  'setupAlarm(nextTriggerDate.time, NotificationsService.createNotificationTrigger(context, request.identifier), request.trigger !is TimeIntervalTrigger)';

const SETUP_ALARM_ORIGINAL = `  private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent) {
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
  }`;

const SETUP_ALARM_NUEVO = `  // [renaser] \`comoDespertador\`: alarma del usuario (setAlarmClock) en vez de una exacta cualquiera. Solo en
  // la rama exacta: sin el permiso de alarmas exactas queda la inexacta de siempre.
  private fun setupAlarm(triggerAtMillis: Long, operation: PendingIntent, comoDespertador: Boolean = false) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
      if (comoDespertador) {
        // Lo que se abre al tocar la «próxima alarma» del reloj o de la pantalla de bloqueo: la app.
        val show = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
          PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        }
        alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAtMillis, show), operation)
      } else {
        AlarmManagerCompat.setExactAndAllowWhileIdle(
          alarmManager,
          AlarmManager.RTC_WAKEUP,
          triggerAtMillis,
          operation
        )
      }
    } else {
      AlarmManagerCompat.setAndAllowWhileIdle(
        alarmManager,
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        operation
      )
    }
  }`;

/** Cada edición: qué buscar, qué poner y cómo se llama en el error si no está. */
const EDICIONES = [
  { nombre: 'el import de TimeIntervalTrigger', original: IMPORT_ORIGINAL, nuevo: IMPORT_NUEVO },
  { nombre: 'la llamada a setupAlarm de scheduleNotification', original: LLAMADA_ORIGINAL, nuevo: LLAMADA_NUEVA },
  { nombre: 'la función setupAlarm', original: SETUP_ALARM_ORIGINAL, nuevo: SETUP_ALARM_NUEVO },
];

/** Cuántas veces aparece `texto` en `donde`. */
function veces(donde, texto) {
  return donde.split(texto).length - 1;
}

/** Devuelve lo que hizo: 'sin-paquete' | 'otra-version' | 'ya-aplicado' | 'aplicado'. */
function aplicar(raiz) {
  const pkg = path.join(raiz, 'package.json');
  if (!fs.existsSync(pkg)) return 'sin-paquete';
  const version = JSON.parse(fs.readFileSync(pkg, 'utf8')).version;
  if (version !== VERSION) return 'otra-version';
  const archivo = path.join(raiz, ARCHIVO);
  if (!fs.existsSync(archivo)) {
    throw new Error(`[renaser] expo-notifications ${VERSION}: falta ${ARCHIVO}; revisa scripts/arreglar-alarmas-tipo-despertador.js`);
  }
  let kotlin = fs.readFileSync(archivo, 'utf8');
  if (kotlin.includes(MARCA)) return 'ya-aplicado';
  // Todo en memoria primero: si falta un fragmento no se escribe nada a medias.
  for (const { nombre, original, nuevo } of EDICIONES) {
    if (veces(kotlin, original) !== 1) {
      throw new Error(
        `[renaser] expo-notifications ${VERSION}: no encuentro ${nombre} en ExpoSchedulingDelegate.kt; ` +
          'revisa scripts/arreglar-alarmas-tipo-despertador.js',
      );
    }
    kotlin = kotlin.replace(original, () => nuevo);
  }
  fs.writeFileSync(archivo, `${MARCA}\n${kotlin}`);
  return 'aplicado';
}

module.exports = { aplicar, MARCA };

if (require.main === module) {
  const raiz = path.join(__dirname, '..', 'node_modules', 'expo-notifications');
  const resultado = aplicar(raiz);
  if (resultado === 'aplicado') {
    console.log('[renaser] expo-notifications: las alarmas pasan a tipo despertador (setAlarmClock)');
  } else if (resultado === 'otra-version') {
    console.log(
      `[renaser] expo-notifications no es ${VERSION}: revisa si ExpoSchedulingDelegate.setupAlarm sigue igual y ajusta o quita este script`,
    );
  }
}
