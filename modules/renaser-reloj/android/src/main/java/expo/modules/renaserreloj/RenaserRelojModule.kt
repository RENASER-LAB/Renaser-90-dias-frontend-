package expo.modules.renaserreloj

import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Spec 048 (FR-013): la hora real de lo que la persona hace sin señal. JavaScript solo tiene el reloj del teléfono (que la persona
 * puede cambiar) y `performance.now()` (que vuelve a cero al cerrar la app). `SystemClock.elapsedRealtime()` cuenta los
 * milisegundos desde que se encendió el teléfono, también con la pantalla apagada, y no cambia cuando se cambia la hora: con la
 * última hora del servidor y este reloj, la app sabe qué hora era de verdad. Solo vuelve a cero al reiniciar el teléfono.
 */
class RenaserRelojModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RenaserReloj")

    Function("milisDesdeElEncendido") {
      SystemClock.elapsedRealtime().toDouble()
    }
  }
}
