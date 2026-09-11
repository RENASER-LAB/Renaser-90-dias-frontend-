# Smoke nativo — el hueco que quedaba

**2026-09-11** · Emulador `Pixel_6`, **Android 17**, 1080×2400 @420 dpi, sin ventana.
APK de depuración del 2026-09-07 + el JS de hoy servido por Metro.

```
9 recorridos · 9 en verde · 1 hallazgo menor documentado
```

---

## Por qué vale, aunque el APK sea del día 7

Un build de *depuración* no lleva el JS adentro: lo pide a Metro al arrancar. Lo único que
quedaría viejo es la parte nativa, y desde ese APK **no se tocó nada nativo**: `android/` y
`app.json` sin cambios, y la única dependencia nueva es `@playwright/test`, que es de desarrollo.
Así se evitó un Gradle de veinte minutos en una máquina con 355 MB libres.

## Lo que quedó certificado

| | Qué demuestra |
|---|---|
| **N01** | La app abre nativa, con sesión, y se llega a Administración |
| **N02** | Bajar a Grupos y volver: sube un nivel, la app sigue viva |
| **N03** | Más opciones → Staff y roles → volver ×2, nivel a nivel |
| **N04** | **Desde la RAÍZ de Administración, volver lleva a Mi programa y NO cierra la app** |
| **N05** | **El gesto lateral REAL** (`input swipe` desde x=5, no el botón) sube un nivel |
| **N06** | El teclado abre al enfocar y el texto llega al campo |
| **N07** | Con el teclado abierto se puede desplazar, y el teclado no se cierra |
| **N08** | Un campo del fondo se enfoca y se rellena: `10` → `107` |
| **N09** | Salir del formulario sin guardar no deja nada en la base |

**N04 y N05 son la razón de existir de este smoke.** AGENTS.md §6 exige que el gesto lateral suba
un nivel y nunca cierre la app desde una vista hija; la suite web corre en Chromium, que no emula
ese gesto, así que hasta hoy la regla obligatoria del proyecto estaba **sin comprobar**.

También quedó verificado de paso que las etiquetas accesibles funcionan en nativo —los campos se
localizan por `content-desc`, que es el arreglo de `FormField` del 10/09— y que miden 132 px ≈
50 dp, dentro del mínimo táctil de AGENTS.md §4.

## El hallazgo: el campo enfocado no sube por encima del teclado

Al tocar un campo de la mitad inferior de `GrupoFormScreen`, el teclado lo tapa y **la pantalla no
lo desplaza sola**. `CIERRA` queda a medias y `PLAZAS DE APRENDIZ` entero por detrás.

**No es un bloqueo**, y conviene decirlo con precisión: el manifiesto declara `adjustResize`, así
que la ventana encoge y el contenido sigue estando. Se comprobó que desplazando se llega, que el
teclado NO se cierra al hacerlo, y que el campo se rellena. La app es usable.

Lo que falta es el desplazamiento automático al enfocar. La app ya resuelve esto en otras cuatro
pantallas con `KeyboardAvoidingView` (`LoginScreen`, `RenasiaPanel`, `PantallaPaso`,
`ImageViewerModal`); `GrupoFormScreen` no lo usa. **Pesa más de lo que parece con el público de
40–60 años**, que es el que menos va a suponer que hay que desplazar para seguir escribiendo.

No se corrigió en esta pasada a propósito: meter un `KeyboardAvoidingView` cambia el reparto
vertical de la pantalla y habría que volver a comprobar el formulario entero, con la máquina ya
al límite de memoria. Queda anotado, no olvidado.

## Lo que este smoke NO cubre

- **iOS.** `useSystemBackHandler` es API de Android. Sin máquina Apple no hay forma.
- **Push real.** Necesita dispositivo con token y proveedor configurado.
- **Dispositivo físico.** Un emulador no reproduce el gesto de un Xiaomi con su capa propia.

## Cómo se repite

```bash
emulator -avd Pixel_6 -no-window -no-audio -no-boot-anim -no-snapshot &
adb install -r -d android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081      # Metro
npx expo start                      # en otra terminal
adb shell monkey -p com.anonymous.renaser -c android.intent.category.LAUNCHER 1
```

**No pasar `-gpu swiftshader_indirect`**: invalida el snapshot del AVD («Change of GLES renderer
detected») y el emulador muere al arrancar en frío. Costó un intento.

Los recorridos se condujeron con `adb` y `uiautomator dump` en vez de Maestro, que no está
instalado. Los tres `.yaml` de `.maestro/admin-alquimista/` siguen sin ejecutarse, pero lo que
cubrían —acceso, crear grupo y navegación— quedó cubierto acá.
