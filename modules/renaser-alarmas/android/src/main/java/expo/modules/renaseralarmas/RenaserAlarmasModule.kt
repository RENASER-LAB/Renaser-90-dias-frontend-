package expo.modules.renaseralarmas

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.ApplicationExitInfo
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

/**
 * Lo único que la app no podía saber desde JavaScript (D-217, 2026-09-28): si Android le deja
 * programar alarmas EXACTAS. `expo-notifications` lo consulta por dentro para elegir la clase de
 * alarma, pero no lo expone; sin el permiso «Alarmas y recordatorios» (Android 14+ no lo concede
 * solo) la alarma sale inexacta y puede sonar hasta ~40 minutos tarde (E-314).
 *
 * Además abre la pantalla del sistema DIRECTO en Renaser: con `Linking.sendIntent` no se puede
 * mandar el `package:` como dato del intent, y Android abría la lista de todas las apps.
 *
 * ## Spec 007 (2026-10-19): alarmas que el teléfono borra
 *
 * Honor y Huawei (y a veces Xiaomi, Oppo o Vivo) tratan «quitar de recientes» o el ahorro de batería como
 * una DETENCIÓN FORZADA de la app, y Android borra todas sus alarmas hasta que la persona la vuelve a abrir.
 * Ningún tipo de alarma sobrevive a eso; lo único posible es enterarse y llevar a la persona al ajuste de
 * su marca. Dos funciones nuevas, ninguna lanza (ante un error devuelven el valor neutro del contrato,
 * `specs/007-alarmas-confiables/contracts/modulo-renaser-alarmas.md`):
 *
 * - [leerDetencionForzada] (`detencionForzadaDesde`): si el sistema detuvo la app a la fuerza desde `desdeMs`.
 * - [abrirPantallaDeLaMarca] (`abrirAjusteDeLaMarca`): abre «Inicio de aplicaciones» (o el equivalente) de la
 *   marca; si no existe, la lista de optimización de batería del sistema y, por último, los ajustes de Renaser.
 *
 * Nunca se pide la excepción directa de optimización de batería: Google Play la restringe a apps que no son
 * de reloj ni de llamadas. Solo se ABRE una pantalla del sistema y la persona decide. Como `startActivity`
 * con un componente explícito no necesita visibilidad del paquete, el manifiesto no declara `queries`: se
 * intenta y se captura el fallo.
 */
class RenaserAlarmasModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RenaserAlarmas")

    /** `true` si las alarmas salen exactas. Antes de Android 12 no hacía falta ningún permiso. */
    Function("puedeProgramarAlarmasExactas") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val contexto = appContext.reactContext ?: return@Function null
      val alarmas = contexto.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmas.canScheduleExactAlarms()
    }

    /** Abre «Alarmas y recordatorios» de Renaser. `false` si no hay tal pantalla (Android 11 o menos). */
    Function("abrirAjusteDeAlarmasExactas") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function false
      val contexto = appContext.currentActivity ?: appContext.reactContext ?: return@Function false
      val intento = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + contexto.packageName))
      if (appContext.currentActivity == null) intento.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      contexto.startActivity(intento)
      true
    }

    /**
     * `{ detenida, cuando, motivo }`: ¿el sistema (o la persona) detuvo Renaser a la fuerza después de
     * `desdeMs` (milisegundos desde 1970)? `cuando` es el instante de la detención o del arranque que la
     * siguió; `motivo` es un resumen corto para el log.
     */
    Function("detencionForzadaDesde") { desdeMs: Double ->
      leerDetencionForzada(desdeMs.toLong())
    }

    /** `'pantalla_de_la_marca' | 'lista_de_bateria' | 'ajustes_de_la_app' | 'ninguna'`: lo que se abrió. */
    Function("abrirAjusteDeLaMarca") {
      abrirPantallaDeLaMarca()
    }
  }

  // --- Detención forzada ---------------------------------------------------------------------------

  /**
   * - Android 15 (API 35) o más: el arranque actual dice si el proceso se lanzó tras una detención forzada
   *   (`ApplicationStartInfo.wasForceStopped()`, pensado justo para «volver a registrar las alarmas»).
   * - Android 11 a 14 (API 30–34): el historial de salidas del proceso. Una salida `REASON_USER_REQUESTED` es
   *   «Detener» en Ajustes **o** quitar de recientes; en un Android sin capa del fabricante lo segundo NO
   *   borra las alarmas (probado en el emulador el 19/10), así que se descarta por su sub-razón.
   * - Android 10 o menos: no hay historial; nunca detenida.
   */
  private fun leerDetencionForzada(desdeMs: Long): Map<String, Any?> {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return SIN_DETENCION
      val contexto = appContext.reactContext ?: return SIN_DETENCION
      val gestor = contexto.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return SIN_DETENCION
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
        detencionEnElArranque(gestor, desdeMs)
      } else {
        detencionEnLasSalidas(gestor, contexto.packageName, desdeMs)
      }
    } catch (e: Exception) {
      Log.w("RenaserAlarmas", "No se pudo leer si el sistema detuvo la app: " + e.javaClass.simpleName)
      return SIN_DETENCION
    }
  }

  /** Android 15+: algún arranque de ESTE proceso vino después de una detención forzada. */
  private fun detencionEnElArranque(gestor: ActivityManager, desdeMs: Long): Map<String, Any?> {
    val propio = Process.myPid()
    val arranques = gestor.getHistoricalProcessStartReasons(ARRANQUES_A_REVISAR).filter { it.pid == propio }
    for (arranque in arranques) {
      Log.i(
        "RenaserAlarmas",
        "arranque pid=" + arranque.pid + " forzado=" + arranque.wasForceStopped() + " tipo=" + arranque.startType +
          " razon=" + arranque.reason + " estado=" + arranque.startupState,
      )
    }
    val forzado = arranques.firstOrNull { it.wasForceStopped() } ?: return SIN_DETENCION
    // Cuándo arrancó este proceso, en hora de reloj: ahora menos lo que lleva vivo.
    val cuando = System.currentTimeMillis() - (SystemClock.elapsedRealtime() - Process.getStartElapsedRealtime())
    val motivo = "arranque forzado=true tipo=" + forzado.startType + " razon=" + forzado.reason + " pid=" + forzado.pid
    if (cuando <= desdeMs) return SIN_DETENCION
    return detenidaEn(cuando, motivo)
  }

  /** Android 11–14: la salida `REASON_USER_REQUESTED` más nueva que `desdeMs` que no sea quitar de recientes. */
  private fun detencionEnLasSalidas(gestor: ActivityManager, paquete: String, desdeMs: Long): Map<String, Any?> {
    val salidas = gestor.getHistoricalProcessExitReasons(paquete, 0, SALIDAS_A_REVISAR)
    var detencion: ApplicationExitInfo? = null
    var descartada: ApplicationExitInfo? = null
    for (salida in salidas) {
      if (salida.timestamp <= desdeMs) continue
      // Todo lo posterior a la última revisión va al log: sirve para medir qué reporta cada marca.
      Log.i("RenaserAlarmas", "salida " + salida.toString() + " descripcion=" + salida.description)
      if (salida.reason != ApplicationExitInfo.REASON_USER_REQUESTED) continue
      if (esQuitarDeRecientes(salida.toString(), salida.description)) {
        if (descartada == null || salida.timestamp > descartada.timestamp) descartada = salida
      } else if (detencion == null || salida.timestamp > detencion.timestamp) {
        detencion = salida
      }
    }
    if (detencion != null) return detenidaEn(detencion.timestamp, resumen(detencion))
    // Sin detención: el motivo de lo descartado (si lo hubo) se devuelve igual, para el log de quien mide.
    val motivo = descartada?.let { resumen(it) }
    return mapOf("detenida" to false, "cuando" to null, "motivo" to motivo)
  }

  /** `subreason=22` es «remove task» (quitar de recientes); también se mira la descripción por si cambia. */
  private fun esQuitarDeRecientes(texto: String, descripcion: String?): Boolean {
    val normalizado = (texto + " " + (descripcion ?: "")).lowercase(Locale.ROOT).replace('_', ' ')
    return normalizado.contains("subreason=22") || normalizado.contains("remove task")
  }

  private fun resumen(salida: ApplicationExitInfo): String = salida.toString().take(LARGO_DEL_MOTIVO)

  private fun detenidaEn(cuando: Long, motivo: String): Map<String, Any?> =
    mapOf("detenida" to true, "cuando" to cuando.toDouble(), "motivo" to motivo.take(LARGO_DEL_MOTIVO))

  // --- Pantalla de la marca ------------------------------------------------------------------------

  /**
   * Prueba, en orden, las pantallas de la marca (research R3); si ninguna abre, la lista de optimización de
   * batería del sistema y, por último, los ajustes de Renaser. Devuelve el paso que abrió, o `ninguna`.
   */
  private fun abrirPantallaDeLaMarca(): String {
    try {
      val actividad = appContext.currentActivity
      val contexto: Context = actividad ?: appContext.reactContext ?: return "ninguna"
      val sinActividad = actividad == null
      val marca = (Build.MANUFACTURER + " " + Build.BRAND).lowercase(Locale.ROOT)
      val guia = guiaDeLaMarca(marca)

      for (pantalla in guia.pantallas) {
        val intento = Intent().setComponent(ComponentName(pantalla.paquete, pantalla.clase))
        if (pantalla.conDatosDeLaApp) {
          // Xiaomi abre la configuración de ESTA app solo si se le dice cuál (paquete y nombre).
          intento.putExtra("package_name", contexto.packageName)
          intento.putExtra("package_label", contexto.applicationInfo.loadLabel(contexto.packageManager).toString())
        }
        if (intentarAbrir(contexto, intento, sinActividad)) {
          Log.i("RenaserAlarmas", "marca='" + marca + "' abrió " + pantalla.paquete + "/" + pantalla.clase)
          return "pantalla_de_la_marca"
        }
      }
      if (guia.conListaDeBateria &&
        intentarAbrir(contexto, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), sinActividad)
      ) {
        Log.i("RenaserAlarmas", "marca='" + marca + "' abrió la lista de batería del sistema")
        return "lista_de_bateria"
      }
      val detalles = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + contexto.packageName))
      if (intentarAbrir(contexto, detalles, sinActividad)) {
        Log.i("RenaserAlarmas", "marca='" + marca + "' abrió los ajustes de la app")
        return "ajustes_de_la_app"
      }
      Log.i("RenaserAlarmas", "marca='" + marca + "' no pudo abrir ninguna pantalla")
    } catch (e: Exception) {
      Log.w("RenaserAlarmas", "No se pudo abrir el ajuste de la marca: " + e.javaClass.simpleName)
    }
    return "ninguna"
  }

  /** `true` si la pantalla se abrió. Una que no existe o no es pública en este teléfono no es un error. */
  private fun intentarAbrir(contexto: Context, intento: Intent, sinActividad: Boolean): Boolean {
    return try {
      if (sinActividad) intento.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      contexto.startActivity(intento)
      true
    } catch (e: ActivityNotFoundException) {
      false
    } catch (e: SecurityException) {
      false
    } catch (e: Exception) {
      false
    }
  }

  private companion object {
    /** Cuántos arranques / salidas anteriores se miran. El sistema guarda unas pocas. */
    const val ARRANQUES_A_REVISAR = 5
    const val SALIDAS_A_REVISAR = 16
    const val LARGO_DEL_MOTIVO = 240
  }
}

/** Lo que devuelve `detencionForzadaDesde` cuando no hubo detención o no se pudo saber. */
private val SIN_DETENCION: Map<String, Any?> = mapOf("detenida" to false, "cuando" to null, "motivo" to null)

/** Una pantalla del fabricante. `conDatosDeLaApp`: pide en el intento el paquete y el nombre de la app (Xiaomi). */
private class PantallaDeLaMarca(val paquete: String, val clase: String, val conDatosDeLaApp: Boolean = false)

/** Qué abrir para una marca. Samsung se salta la lista genérica: sus ajustes de la app llevan a «Batería». */
private class GuiaDeLaMarca(val pantallas: List<PantallaDeLaMarca>, val conListaDeBateria: Boolean = true)

/** `marca` es `Build.MANUFACTURER + " " + Build.BRAND` en minúsculas: el fabricante y la marca pueden ser distintos. */
private fun guiaDeLaMarca(marca: String): GuiaDeLaMarca = when {
  "honor" in marca -> GuiaDeLaMarca(PANTALLAS_DE_HONOR + PANTALLAS_DE_HUAWEI)
  "huawei" in marca -> GuiaDeLaMarca(PANTALLAS_DE_HUAWEI)
  "xiaomi" in marca || "redmi" in marca || "poco" in marca -> GuiaDeLaMarca(PANTALLAS_DE_XIAOMI)
  "samsung" in marca -> GuiaDeLaMarca(PANTALLAS_DE_SAMSUNG, conListaDeBateria = false)
  "oppo" in marca || "realme" in marca || "oneplus" in marca -> GuiaDeLaMarca(PANTALLAS_DE_OPPO + PANTALLAS_DE_ONEPLUS_VIEJO)
  "vivo" in marca || "iqoo" in marca -> GuiaDeLaMarca(PANTALLAS_DE_VIVO)
  else -> GuiaDeLaMarca(emptyList())
}

// Los componentes que usan AutoStarter y otras apps mantenidas (research R3). Todos son frágiles: cambian
// entre versiones del sistema y algunos no son públicos, por eso se prueban en orden y se captura el fallo.

private val PANTALLAS_DE_HONOR = listOf(
  PantallaDeLaMarca("com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
  PantallaDeLaMarca("com.hihonor.systemmanager", "com.hihonor.systemmanager.appcontrol.activity.StartupAppControlActivity"),
)

private val PANTALLAS_DE_HUAWEI = listOf(
  PantallaDeLaMarca("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
  PantallaDeLaMarca("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"),
  PantallaDeLaMarca("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
)

private val PANTALLAS_DE_XIAOMI = listOf(
  PantallaDeLaMarca("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
  PantallaDeLaMarca("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity", conDatosDeLaApp = true),
)

private val PANTALLAS_DE_SAMSUNG = listOf(
  PantallaDeLaMarca("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity"),
  PantallaDeLaMarca("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
  PantallaDeLaMarca("com.samsung.android.sm_cn", "com.samsung.android.sm.ui.battery.BatteryActivity"),
)

private val PANTALLAS_DE_OPPO = listOf(
  PantallaDeLaMarca("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
  PantallaDeLaMarca("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
  PantallaDeLaMarca("com.oplus.safecenter", "com.oplus.safecenter.permission.startup.StartupAppListActivity"),
  PantallaDeLaMarca("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
)

/** OnePlus de antes de ColorOS. */
private val PANTALLAS_DE_ONEPLUS_VIEJO = listOf(
  PantallaDeLaMarca("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"),
)

private val PANTALLAS_DE_VIVO = listOf(
  PantallaDeLaMarca("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
  PantallaDeLaMarca("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
  PantallaDeLaMarca("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
)
