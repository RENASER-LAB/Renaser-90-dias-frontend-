# Pruebas E2E con Maestro

Regla del dueño: **antes de subir a producción se corre toda esta suite y el E2E con mobile-mcp**, en el emulador y en
local (nunca contra producción).

## Qué hay

- `correr.sh`: corre la suite flujo por flujo. Antes de cada uno limpia la app, la abre y **entra por adb** con la
  cuenta que pide el flujo (`# cuenta: aprendiz|admin`, arriba del archivo).
- `comun/`: subflujos (`ya-adentro`, despejar capas, abrir Cuerpo, tomar una foto con la cámara del emulador).
- `regresion/`: un flujo por caso, ordenados por número. Cada uno dice arriba qué prueba y su precondición.
- `interruptores/` (spec 002): el aviso de mantenimiento en Tribu, el Muro, Training y SER. **No corren solos**: cada uno
  necesita que antes se apague una funcionalidad por la consola Soporte TI (lo dice arriba de cada archivo) y que después
  se vuelva a prender. Se corren de a uno, `.maestro/correr.sh .maestro/interruptores/<flujo>.yaml`, con la precondición
  puesta.
  Fase 2 (34–40): lo no disponible que se esconde (34–36, con la precondición de un despliegue «Solo probadores»), y la
  consola: despliegue (37), roles personalizados (38) y «ver como» (39–40). Los de la consola son `# cuenta: soporte`:
  piden `E2E_SOPORTE_EMAIL` y `E2E_SOPORTE_PASSWORD` (la cuenta Soporte TI de la base local) y desbloquean la consola con
  esa contraseña (`comun/abrir-consola.yaml`). **Esa cuenta necesita una contraseña corta** (≤ 8 letras): Maestro la
  escribe con `inputText`, que tarda ~10 s por letra (ver abajo). 37 y 38 dejan todo como estaba; 39 y 40 necesitan el
  backend con «ver como» (B3).

## Cómo correrla

1. Backend local (worktree propio, base clonada) con las fotos en local (`docs/DESPLIEGUE_Y_CI.md` §1.3 del backend).
2. Metro del worktree con `EXPO_PUBLIC_API_URL=http://10.0.2.2:<puerto>` y la build de desarrollo instalada.
3. Las credenciales por variables de entorno (viven en `~/.config/renaser-e2e/`, nunca en el repo; `correr.sh` tapa
   la contraseña en la salida):

   ```bash
   E2E_APRENDIZ_EMAIL=… E2E_APRENDIZ_PASSWORD=… E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… \
     .maestro/correr.sh                    # toda la suite
   # los de la consola Soporte TI, además: E2E_SOPORTE_EMAIL=… E2E_SOPORTE_PASSWORD=…
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
