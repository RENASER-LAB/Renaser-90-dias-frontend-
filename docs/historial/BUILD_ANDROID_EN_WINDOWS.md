# Compilar el build nativo de Android en Windows

**Fecha:** 2026-09-07
**Estado:** pendiente de aplicar. Escrito para cuando se retome.

Este documento existe porque el build nativo (`npx expo run:android`, o sea `npm run android`) **no
compila en esta máquina**, y porque la primera explicación que se dio fue equivocada. Queda acá para
no volver a diagnosticarlo desde cero.

---

## 1. El síntoma exacto

```
ninja: error: Stat(safeareacontext_autolinked_build/CMakeFiles/react_codegen_safeareacontext.dir/
C_/Users/panc1/OneDrive/Documentos/Renaser_remasterizado/Renaser-90-dias-frontend-/node_modules/
react-native-safe-area-context/common/cpp/react/renderer/components/safeareacontext/
RNCSafeAreaViewShadowNode.cpp.o): Filename longer than 260 characters

FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:buildCMakeDebug[x86_64]'.
```

## 2. Por qué la ruta se pasa de 260

CMake mete la **ruta absoluta del archivo fuente dentro del nombre del objeto** (`.o`), con `C:` →
`C_` y los espacios → `_`. Por eso la carpeta del proyecto aparece **dos veces** en la misma ruta:
una como directorio de compilación (`.cxx/Debug/<hash>/x86_64/`) y otra embebida como ruta de origen.

Medido en esta máquina el 2026-09-07:

| Tramo | Caracteres |
|---|---|
| Directorio `.cxx` (raíz del proyecto + `android/app/.cxx/Debug/<hash8>/x86_64/`) | 122 |
| `safeareacontext_autolinked_build/` | 33 |
| `CMakeFiles/` | 11 |
| `react_codegen_safeareacontext.dir/` | 34 |
| Ruta de origen embebida (`C_/Users/.../frontend-/`) | 83 |
| Ruta relativa del fuente más largo (`ComponentDescriptors.cpp` del codegen) | 153 |
| `.o` | 2 |
| **Total** | **438** |

## 3. Lo que NO lo arregla

- **`LongPathsEnabled` en el registro.** Ya está en `1` en esta máquina. No alcanza: el `ninja` que
  trae CMake 3.22.1 es la versión **1.10.2**, que no declara soporte de rutas largas y por lo tanto
  ignora esa opción de Windows.
- **Mover el proyecto a una carpeta corta.** Se calculó: con la raíz en `C:\r` (lo más corto
  posible) la peor ruta queda en **282** caracteres, y sumándole reubicar el directorio de CMake
  todavía queda en ~265. Sigue por encima de 260.

> **Corregido 2026-09-07.** Con esos números se concluyó que era "estructuralmente imposible". Era
> falso: el cálculo estaba bien, pero solo consideraba acortar la ruta y nunca se revisó la
> **versión de la herramienta**, que es donde estaba el arreglo. Queda escrito para que nadie
> repita el error de medir el problema sin mirar quién lo produce.

## 4. Lo que sí lo arregla

`ninja` **1.12 en adelante** soporta rutas largas, y Google ya publica versiones de CMake que lo
incluyen. Del issue de Expo para este error exacto (`expo/expo#36274`):

> *"Google already ships newer CMake packages in the SDK (`3.30.x`, `3.31.x`, even `4.x`), and all
> of them bundle ninja 1.12+ with the fix."*

**Pasos:**

1. Android Studio → **SDK Manager → SDK Tools** → tildar *Show Package Details* → instalar
   **CMake 3.31.x** (o 3.30.x / 4.x).
2. Fijar esa versión en `android/app/build.gradle`, dentro del bloque `android { }`:

   ```gradle
   externalNativeBuild {
       cmake {
           version "3.31.0"
       }
   }
   ```

3. Verificar que `LongPathsEnabled` siga en `1`:

   ```
   HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled
   ```

### Advertencias

- **`android/` está en `.gitignore`**: la genera `expo prebuild`. El `version "3.31.0"` se pierde
  con `npx expo prebuild --clean` y hay que reponerlo. Se buscó si `expo-build-properties` permite
  fijar `cmakeVersion` para que sobreviva al prebuild y **no se pudo confirmar** — no asumir que
  existe sin verificarlo.
- **`cmdline-tools` no está instalado** en esta máquina, así que la instalación de CMake va por la
  interfaz de Android Studio, no por `sdkmanager`.
- **El proyecto vive dentro de OneDrive.** Para builds nativos eso trae problemas propios: OneDrive
  sincroniza y bloquea archivos en medio de la compilación. Si el build sigue fallando de formas
  raras después de arreglar CMake, esa es la siguiente sospecha.

## 5. Alternativas si no se quiere tocar el toolchain

- **EAS Build** (nube): no tiene límite de rutas. No está configurado — falta `eas.json`, que lo
  crea `npx eas build:configure`.
- **Expo Go** (`npm start`): no compila nada nativo y alcanza para casi todo. Lo único que no se
  puede probar ahí son las notificaciones **push remotas** (fuera de Expo Go en Android desde el
  SDK 53). Las **alarmas locales del programa sí funcionan en Expo Go** — ver
  `src/features/habits/notificaciones/recordatoriosDeHabito.ts`.

## 6. Qué desbloquea tener el build nativo

Lo único que hoy depende de él y no se puede hacer de otra forma: **empaquetar tonos propios** para
las notificaciones. Eso exige agregar `expo-notifications` a `plugins` en `app.json` con la clave
`sounds` y recompilar.

No hace falta para que el aprendiz elija su tono: en Android, una vez que existe el canal
(`recordatorios-habitos`, que la app ya crea), cada persona lo cambia desde *Ajustes → Apps →
Renaser → Notificaciones*, sin recompilar nada. Hay reportes de que el interruptor global de
*Ringtone* de la app viene apagado por defecto y pisa la configuración del canal — verificar en un
teléfono real antes de darlo por bueno.

---

## Fuentes

- [expo/expo#36274 — Filename longer than 260 characters en Windows](https://github.com/expo/expo/issues/36274)
- [react-native-screens#3471 — mismo error por CMake/Ninja](https://github.com/software-mansion/react-native-screens/issues/3471)
- [AppAndFlow/react-native-safe-area-context#424](https://github.com/AppAndFlow/react-native-safe-area-context/issues/424)
- [Notifications — Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [expo/expo discusión #39508 — Android Notification Ringtone Option Disabled by Default](https://github.com/expo/expo/discussions/39508)
