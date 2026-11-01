# Pruebas E2E con Maestro

Regla del dueño: **antes de subir a producción se corre toda esta suite y el E2E con mobile-mcp**, en el emulador y en
local (nunca contra producción).

## Qué hay

- `correr.sh`: corre la suite flujo por flujo. Antes de cada uno limpia la app, la abre y **entra por adb** con la
  cuenta que pide el flujo (`# cuenta: aprendiz|admin`, arriba del archivo).
- `comun/`: subflujos (`ya-adentro`, despejar capas, abrir Cuerpo, tomar una foto con la cámara del emulador).
- `regresion/`: un flujo por caso, ordenados por número. Cada uno dice arriba qué prueba y su precondición.
- `guia-de-ser/` (issue #50): la guía de arranque de SER no se monta sobre el panel de SER y «Ahora no» responde. Pide una
  cuenta de aprendiz con el Día 1 elegido y sin el Pacto firmado; ver su `README.md`.
- `moderar-muro/` (2026-10-31): ADMIN y ALCHEMIST ocultan, devuelven y eliminan publicaciones del Muro (el «…» de cada tarjeta y
  Administración → Más opciones → «Publicaciones ocultas»); un aprendiz no tiene el «…». **Escritos y sin correr.** Piden una
  publicación con el texto «Moderar-1» arriba del Muro y la cola de ocultas vacía (lo dice arriba de cada archivo); se corren de
  a uno con `.maestro/correr.sh .maestro/moderar-muro/<flujo>.yaml`.
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

- `formaciones/` (2026-10-31, spec 022): las tres formaciones y su aislamiento (aprendiz de la Escuela y del Diplomado de 1 año, personal con dos
  formaciones o sin ninguna, Administración → Formaciones y el traslado). **Escritos y sin correr**; ver su `README.md`.
- `planificacion/` (spec 028, 2026-10-31): lo que se planifica por semana. `solo-esta-semana` (el editor de Planificar con «Todas las semanas»
  | «Solo esta semana», el aviso solo esta semana, «Cambiado solo esta semana» y «Volver al plan de siempre») y `repetir-la-semana`
  (la oferta «Repetir tu semana» en «Tus prácticas»: «Ver qué se repite», repetir en un toque, «Deshacer» y «Ahora no»). **Escritos y sin correr**; piden el backend con la spec 028 (V130 y V131), el hábito
  propio «Meditar 10 minutos» sin cambios solo-semana (`reset-hoy.sql`) y que hoy no sea sábado ni domingo (lo dice arriba de cada archivo).
- `planificacion/planificar-el-mes.yaml` (spec 028, 2026-10-31): Plan → «Planificar mi mes» (el plan de objetivos: los tres meses del programa, el objetivo del mes del eje abierto, sus semanas, corregir el de cualquier mes y organizar la semana de ahora). **Escrito y sin correr**; pide el Mapa activo y la semana armada (lo dice arriba del archivo).
- `diseno-31/` (2026-10-31): los cambios de diseño del día (Hoy con la tarjeta de acciones y sin la frase ni Coherencia / Racha,
  Plan con el formato de la referencia, Training con la cabecera sin fase, los nombres en tipo oración, los rituales con texto y la
  última comida con círculo, Yo con el semáforo y sin la tira «Evidencia», y —`06-roles-en-yo`— Hoy solo con el programa propio y las
  filas «Mi grupo» / «Mis mentores» en Yo, junto a Administración). **Escritos y sin correr**; cada archivo dice su
  precondición. Desde ese día Administración, «Mi grupo» y «Mis mentores» se abren desde **Yo** (los flujos de `regresion/20–24`,
  `mi-radar/11–12` y `lider-ve-a-todos/01` ya entran por ahí). Los nombres de los hábitos ahora se ven en tipo oración: los flujos viejos que los buscaban en mayúsculas usan
  `(?i)` desde ese día.

- `cierre-en-plan/` (spec 033, 2026-10-31): «Cierra tu día» ya no está en Training; vive en una tarjeta de Plan, bajo «Acciones que
  mueven la meta», con «Ver mañana en Plan» y los cierres de los días anteriores en la misma tarjeta (solo lectura). **Escritos y
  sin correr**; cada archivo dice su precondición. Reemplaza a la carpeta `cierre/` (que probaba la fila de Training).
- `codigo-renaser-en-fichas/` (spec 034, 2026-10-31): Administración enciende y apaga si el mentor, la guía y el líder ven el Código
  Renaser (Más opciones → «Código Renaser en las fichas»); apagado de fábrica. **Escritos y sin correr**: piden el backend con la
  spec 034 y, además de la cuenta de Administración, la de un mentor con un aprendiz que ya respondió el Radar; ver su `README.md`.

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

Los flujos 23 y 24 (Administración: los días y las evidencias de una persona, como el líder) necesitan datos concretos:
un grupo con mentor y una persona con evidencias en los últimos 7 días (23), o una persona con grupo (24). Con
`E2E_PERSONA=<parte del nombre>` `correr.sh` elige a quién tocan (sin ella, «a»: la primera que coincida) y con
`E2E_GRUPO=<parte del nombre del grupo>` el 23 abre ese grupo en vez del primero con mentor. Ejemplo:
`E2E_PERSONA=APRENDIZ1 E2E_GRUPO="Hábitos por rol"`. Lo que cada uno necesita está arriba de su archivo.

Los flujos que registran algo (01, 03, 10, 12 y 13) necesitan que el hábito o la publicación estén pendientes ese día; si ya se
hicieron, se usa otra cuenta o una base recién clonada.

Los flujos 12 y 13 (el registro con foto cuando algo sale mal, #49 y #51) usan comandos de Maestro que simulan lo que le pasa
a un teléfono de verdad: `killApp` (`adb shell am kill`, la muerte de proceso que provoca el sistema con poca memoria; solo
mata la app si está en segundo plano, y lo está porque la cámara está al frente) y `setAirplaneMode` (se corta la red del
emulador, no `adb reverse`). El 12 deja la pantalla partida de kilómetros a medias y el 13 el error con «REINTENTAR»: si un
paso falla, mira `adb logcat -s ReactNativeJS` (las líneas `[evidencia] falló el paso …` dicen cuál fue).
