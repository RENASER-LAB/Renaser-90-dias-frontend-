package expo.modules.renaseralarmas

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lo único que la app no podía saber desde JavaScript (D-217, 2026-09-28): si Android le deja
 * programar alarmas EXACTAS. `expo-notifications` lo consulta por dentro para elegir la clase de
 * alarma, pero no lo expone; sin el permiso «Alarmas y recordatorios» (Android 14+ no lo concede
 * solo) la alarma sale inexacta y puede sonar hasta ~40 minutos tarde (E-314).
 *
 * Además abre la pantalla del sistema DIRECTO en Renaser: con `Linking.sendIntent` no se puede
 * mandar el `package:` como dato del intent, y Android abría la lista de todas las apps.
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
  }
}
