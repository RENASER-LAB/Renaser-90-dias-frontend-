#!/usr/bin/env node
/**
 * Hace que `expo-notifications` (57.0.17) NO muestre el aviso de inicio de un hábito que Android entregó cuando la hora del
 * hábito ya pasó (issue #40, 2026-10-31).
 *
 * LA REGLA. «Un aviso de inicio vale hasta la hora del hábito; después no se muestra» (el mismo criterio que el dueño ya
 * aceptó para el servidor: es preferible no avisar a avisar algo falso). Un aviso que dice «Te toca a las 07:00.» a las 08:58
 * es falso. Ver `src/features/habits/notificaciones/utils/vigenciaDelAviso.ts`.
 *
 * EL PROBLEMA. Cuando suena la alarma, `ExpoSchedulingDelegate.triggerNotification` muestra el aviso y lo vuelve a armar, sin
 * mirar qué tan tarde llegó. Con el permiso «Alarmas y recordatorios» la alarma es del reloj (`setAlarmClock`, spec 007) y
 * suena a su hora. Sin el permiso es inexacta y Android la puede entregar mucho después (el rearmado documenta alarmas con
 * `window=+1h`; el e2e del 26/10 midió `+40m59s`). Nada en la librería es configurable para esto.
 *
 * EL ARREGLO. Tres ediciones en `ExpoSchedulingDelegate.kt`, junto a las de `arreglar-alarmas-tipo-despertador.js` (otras líneas
 * del mismo archivo; se pueden aplicar en cualquier orden):
 *  (a) los imports que hacen falta (`NotificationTrigger`, `DailyTrigger`, `DateTrigger`, `WeeklyTrigger`, `Calendar`);
 *  (b) `triggerNotification`: si `avisoVencido(request)`, no se llama a `receive` (no se muestra). `schedule` sigue donde
 *      estaba: la alarma diaria o semanal se vuelve a armar para el día siguiente y la de fecha se descarta sola;
 *  (c) `avisoVencido` y sus auxiliares: el aviso lleva `data.vigenteMin` (los minutos, desde su hora nominal, durante los
 *      que sigue siendo verdad; lo escribe `contenidoDelAviso`). La hora nominal es la de su disparador: la fecha de uno
 *      de fecha, o la última vez que fueron la hora y minuto de uno diario o semanal. Vencido = el atraso pasa `vigenteMin`.
 *
 * LO QUE NO CAMBIA. Un aviso SIN `vigenteMin` (todo lo que no es el aviso de inicio de un hábito: eventos, acciones, Código
 * Renaser, repeticiones, la prueba de sonido) se muestra como siempre. Un disparador que no es de fecha, diario ni semanal
 * tampoco se examina. Una alarma que dispara unos milisegundos ANTES de su hora nominal no cuenta como atrasada.
 *
 * ES IDEMPOTENTE (deja una marca al principio del archivo), falla FUERTE si el Kotlin de la 57.0.17 ya no trae alguno de los
 * fragmentos que reemplaza (mejor que `npm ci` se caiga a que la app salga sin el arreglo creyendo que lo tiene) y no toca nada
 * si la versión instalada es otra: ahí hay que mirar a mano si `triggerNotification` sigue igual y ajustar o quitar este script.
 *
 * CÓMO SE PRUEBA. `src/__tests__/avisoTardio.test.ts` (paquete falso en `os.tmpdir()`; el Kotlin no se puede ejercitar en
 * Jest). En el emulador, con el APK del worktree: una alarma de hábito con `vigenteMin` que Android entrega tarde (reloj
 * adelantado, o sin el permiso de alarmas exactas y `dumpsys deviceidle force-idle`) no aparece, y la de mañana sigue
 * programada (`dumpsys alarm`). **Este Kotlin no se compiló al escribirlo**: se valida al armar el APK.
 */
const fs = require('fs');
const path = require('path');

const VERSION = '57.0.17';

const MARCA = '// [renaser] aviso tardío, vigenteMin (scripts/arreglar-aviso-tardio.js)';

const ARCHIVO = 'android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt';

/* ------------------------------------------------------------------------------------------------
 * Los fragmentos tal cual están en la 57.0.17
 * ---------------------------------------------------------------------------------------------- */

const IMPORT_ORIGINAL = 'import java.io.InvalidClassException\n';
const IMPORT_NUEVO =
  'import expo.modules.notifications.notifications.interfaces.NotificationTrigger\n' +
  'import expo.modules.notifications.notifications.triggers.DailyTrigger\n' +
  'import expo.modules.notifications.notifications.triggers.DateTrigger\n' +
  'import expo.modules.notifications.notifications.triggers.WeeklyTrigger\n' +
  IMPORT_ORIGINAL +
  'import java.util.Calendar\n';

const RECIBIR_ORIGINAL = `      NotificationsService.receive(context, Notification(notificationRequest))
      NotificationsService.schedule(context, notificationRequest)
`;
const RECIBIR_NUEVO = `      // [renaser] issue #40: el aviso de inicio de un hábito que llegó cuando su hora ya pasó no se muestra; la alarma
      // diaria o semanal se vuelve a armar igual (la línea de abajo) para el día siguiente.
      if (avisoVencido(notificationRequest)) {
        Log.d("expo-notifications", "Notification \${notificationRequest.identifier} arrived after its time, not showing it.")
      } else {
        NotificationsService.receive(context, Notification(notificationRequest))
      }
      NotificationsService.schedule(context, notificationRequest)
`;

const ANCLA_AUXILIARES = '  override fun removeScheduledNotifications(identifiers: Collection<String>) {\n';
const AUXILIARES = `  // [renaser] issue #40. \`data.vigenteMin\` = minutos, desde la hora nominal del disparador, durante los que el aviso sigue
  // siendo verdad. Sin él (todo lo que no es el aviso de inicio de un hábito) nunca está vencido.
  private fun avisoVencido(request: NotificationRequest): Boolean {
    val vigenteMin = request.content.body?.optDouble("vigenteMin", -1.0) ?: -1.0
    if (vigenteMin < 0) return false
    val ahora = System.currentTimeMillis()
    val nominal = horaNominal(request.trigger, ahora) ?: return false
    return ahora - nominal > (vigenteMin * 60_000).toLong()
  }

  // La hora a la que le tocaba sonar a este disparador: la de uno de fecha, o la última vez que fueron su hora y minuto.
  private fun horaNominal(trigger: NotificationTrigger?, ahora: Long): Long? = when (trigger) {
    is DateTrigger -> trigger.timestamp
    is DailyTrigger -> ultimaOcurrencia(ahora, null, trigger.hour, trigger.minute)
    is WeeklyTrigger -> ultimaOcurrencia(ahora, trigger.weekday, trigger.hour, trigger.minute)
    else -> null
  }

  private fun ultimaOcurrencia(ahora: Long, weekday: Int?, hour: Int, minute: Int): Long {
    val ocurrencia = Calendar.getInstance()
    ocurrencia.timeInMillis = ahora
    if (weekday != null) ocurrencia[Calendar.DAY_OF_WEEK] = weekday
    ocurrencia[Calendar.HOUR_OF_DAY] = hour
    ocurrencia[Calendar.MINUTE] = minute
    ocurrencia[Calendar.SECOND] = 0
    ocurrencia[Calendar.MILLISECOND] = 0
    // Una alarma puede disparar unos milisegundos antes de su hora: eso no es la de ayer. Más allá de un minuto, sí.
    if (ocurrencia.timeInMillis - ahora > 60_000) ocurrencia.add(Calendar.DATE, if (weekday != null) -7 else -1)
    return ocurrencia.timeInMillis
  }

` + ANCLA_AUXILIARES;

/** Cada edición: qué buscar, qué poner y cómo se llama en el error si no está. */
const EDICIONES = [
  { nombre: 'los imports', original: IMPORT_ORIGINAL, nuevo: IMPORT_NUEVO },
  { nombre: 'la entrega en triggerNotification', original: RECIBIR_ORIGINAL, nuevo: RECIBIR_NUEVO },
  { nombre: 'el lugar de las funciones auxiliares', original: ANCLA_AUXILIARES, nuevo: AUXILIARES },
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
    throw new Error(`[renaser] expo-notifications ${VERSION}: falta ${ARCHIVO}; revisa scripts/arreglar-aviso-tardio.js`);
  }
  let kotlin = fs.readFileSync(archivo, 'utf8');
  if (kotlin.includes(MARCA)) return 'ya-aplicado';
  // Todo en memoria primero: si falta un fragmento no se escribe nada a medias.
  for (const { nombre, original, nuevo } of EDICIONES) {
    if (veces(kotlin, original) !== 1) {
      throw new Error(
        `[renaser] expo-notifications ${VERSION}: no encuentro ${nombre} en ExpoSchedulingDelegate.kt; ` +
          'revisa scripts/arreglar-aviso-tardio.js',
      );
    }
    kotlin = kotlin.replace(original, () => nuevo);
  }
  fs.writeFileSync(archivo, `${MARCA}\n${kotlin}`);
  return 'aplicado';
}

module.exports = { aplicar, MARCA, EDICIONES };

if (require.main === module) {
  const raiz = path.join(__dirname, '..', 'node_modules', 'expo-notifications');
  const resultado = aplicar(raiz);
  if (resultado === 'aplicado') {
    console.log('[renaser] expo-notifications: el aviso de un hábito que llega después de su hora no se muestra (vigenteMin)');
  } else if (resultado === 'otra-version') {
    console.log(
      `[renaser] expo-notifications no es ${VERSION}: revisa si ExpoSchedulingDelegate.triggerNotification sigue igual y ajusta o quita este script`,
    );
  }
}
