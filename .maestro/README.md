# Pruebas E2E con Maestro

Regla del dueño: **antes de subir a producción se corre toda esta suite y el E2E con mobile-mcp**, en el emulador y en
local (nunca contra producción).

## Qué hay

- `correr.sh`: corre la suite flujo por flujo. Antes de cada uno limpia la app, la abre y **entra por adb** con la
  cuenta que pide el flujo (`# cuenta: aprendiz|admin`, arriba del archivo).
- `comun/`: subflujos (`ya-adentro`, despejar capas, abrir Cuerpo, tomar una foto con la cámara del emulador).
- `regresion/`: un flujo por caso, ordenados por número. Cada uno dice arriba qué prueba y su precondición.

## Cómo correrla

1. Backend local (worktree propio, base clonada) con las fotos en local (`docs/DESPLIEGUE_Y_CI.md` §1.3 del backend).
2. Metro del worktree con `EXPO_PUBLIC_API_URL=http://10.0.2.2:<puerto>` y la build de desarrollo instalada.
3. Las credenciales por variables de entorno (viven en `~/.config/renaser-e2e/`, nunca en el repo; `correr.sh` tapa
   la contraseña en la salida):

   ```bash
   E2E_APRENDIZ_EMAIL=… E2E_APRENDIZ_PASSWORD=… E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… \
     .maestro/correr.sh                    # toda la suite
   .maestro/correr.sh .maestro/regresion/10-gimnasio-con-foto.yaml   # un flujo
   ```

## Tres cosas que no son obvias

- **La sesión la abre `correr.sh` y no Maestro** (Maestro #3667, abierto al 2026-10-13). La build de desarrollo tarda
  más de 2 s en tomar la pantalla de bienvenida de Android; el sistema deja trabada una animación `starting_reveal` y el
  driver de Maestro la espera en cada toque y en cada letra (~10 s cada uno). Un correo largo pasa el límite de 120 s
  de `inputText`. `adb shell input` no la espera. Por eso los flujos no hacen `launchApp`, los textos que escriben son
  cortos y cada toque tarda unos segundos.
- **No usar mobile-mcp mientras corre la suite.** Android deja un solo cliente de automatización: el servidor de
  mobile-mcp en el teléfono (mobilecli) bloquea a Maestro y a `uiautomator dump`. `correr.sh` lo cierra al empezar.
- **Recrear la actividad no sirve de atajo**: suelta la animación trabada, pero `expo-image-picker` queda con su
  lanzador registrado en la actividad vieja y la cámara falla («unregistered ActivityResultLauncher»).

Los flujos que registran algo (01, 03, 10) necesitan que el hábito o la publicación estén pendientes ese día; si ya se
hicieron, se usa otra cuenta o una base recién clonada.
