# Progreso — Renaser 90 días (app)

Se lee **al empezar** y se actualiza **al cerrar** cada sesión (ver `AGENTS.md`). Todo lo que se escribe acá tiene
que poder comprobarse: lo que no comprobaste dice «sin confirmar». Es corto a propósito (máximo 150 líneas,
`src/__tests__/harness/estado.test.ts`): lo viejo se borra, porque ya queda en git. El estado de cada funcionalidad vive en
`funcionalidades.json`; los bugs, en los issues de GitHub.

## Estado verificado — 2026-10-29

- **App, master**: `70db1d0` (#38, 2026-10-27). CI de master en verde (tipos y Jest).
- **Backend, producción**: el CD despliega cada merge a master; el último salió verde el 2026-10-29 a las 15:06
  (#29, BouncyCastle para el Web Push, E-650). Todo lo fusionado en el backend está en producción.
- **APK publicado**: el del **2026-10-20** (Play Store, 1.5.0; las versiones salen los viernes). Ese día hubo tres
  builds de producción en EAS: 107 (#28), 109 (#29) y 110 (= #30, spec 011); falta saber si subió la 109 o la 110.
  **No está en los teléfonos**: #31 (Soporte TI fase 2), #32, #35, #36 y #38. Ver `publicacion.app` en
  `funcionalidades.json`.
- **Bugs abiertos de la app**: #39 a #43 (`gh issue list --label bug --state open`).

## Siguiente paso

Harness del frontend (PR #48, rama `harness/agents-corto`): pasos 1 a 5 hechos. El dueño quiere cerrarlo del todo,
«con aristas y estado» (2026-10-29, pausado hasta el día siguiente). Queda por elegir con él:
- **Qué son las aristas**: de qué depende cada funcionalidad, qué pasos de estado son válidos, las dos cosas o
  el grafo de graphify.
- **Backend**: si arranca desde master sin esperar al #48.
- **Las alertas de Dependabot**: qué hacer con ellas (ver Pendientes).

Además falta correr `npm run verificar` completo cuando se libere la máquina, para que aplique los parches que
faltan, y que el dueño revise y fusione el PR.

## Pendientes

- **Seguridad Java del backend (CVE-2026-91403)**: retomar desde el 2026-10-28; el 27/10 se confirmó que sí nos
  afecta. El detalle está en `docs/pendientes/SEGURIDAD_JAVA_BACKEND_2026-10-23.md`, que todavía **no está
  commiteado**: solo existe en el checkout principal (rama `fix/fenix-cuello`). Producción no está verificada ni
  parcheada. Se muda al progreso del backend cuando lo tenga.
- **11 alertas de Dependabot en master** (vistas el 2026-10-29): 1 crítica (`shell-quote`), 6 altas y 4
  moderadas, todas de dependencias indirectas; `node-forge` todavía no tiene versión arreglada. Sin issue
  todavía. El arreglo va en su propia rama y toca solo el `package-lock.json`, porque el `node_modules` se
  comparte entre sesiones.
- **`ROCKS_EXIGIR_MAPA_ACTIVO`**: encenderlo en producción solo cuando esté publicado el APK que trae #38.
- **Constitución**: la copia del backend sigue en 1.0.0; igualarla a la 1.0.1 de acá.
- **`tasks.md` desactualizados**: los PR #27, #28 y #29 registran su validación, pero sus specs dejaron tareas sin
  marcar (005: T046, T051, T057; 007: T047, T048; 008: T032–T035; 009: T024–T026; 010: T001, T011). Hay que
  marcarlas con la evidencia del PR o decir qué falta. La única que parece pendiente de verdad es la 007 T047
  (probar en un Honor real).
- **Faltan tres parches nativos en el `node_modules` del checkout principal** (visto el 2026-10-29): el de alarmas
  tipo despertador (`expo-notifications`, spec 007) y los dos de `expo-two-way-audio`. Es el falso rojo que cinco PR
  explicaron a mano (#30, #32, #35, #36, #38). Ojo: un build debug local hecho desde ese checkout sale **sin** esos
  arreglos. `npm run verificar` los aplica, pero no con otra sesión probando: correrlo cuando se libere.
- **Spec 012 «Mi Radar en Yo»** (otra sesión, rama `012-mi-radar-en-yo`, V119): su autorización del tab Yo va en
  `AGENTS.md`, en un bloque propio al final de §1. Si la 012 entra a master antes que el #48, al rebasar el #48
  hay que mover ese bloque a `docs/producto/yo.md` con su fila en el índice. Si el #48 entra antes, lo mueve esa
  sesión.
- **El fénix**: `fix/fenix-cuello` (#39) queda como está, por decisión del dueño (2026-10-29). El fénix 3D con
  Blender quedó descartado.

## Sesiones (las cinco últimas)

### 2026-10-29 — harness del frontend (pasos 4 y 5)

- **Hecho**: hook SessionStart (`scripts/inicio-de-sesion.mjs`, en `.claude/settings.json`); formulario de bug
  (`.github/ISSUE_TEMPLATE/bug.yml`) y plantilla de PR, sobre las listas del curso; `apk_publicado` en
  `funcionalidades.json` (Play Store del 20/10 y `eas build:list`). PR #48 abierto.
- **Verificado**: la salida del hook es JSON válido y trae rama, pendientes y los bugs de GitHub; el YAML del
  formulario es válido. El hook corre recién al abrir una sesión nueva. El CI del PR #48 (tipos y Jest completo)
  pasó en verde en `c990fe7` y en `0d348b1`.
- **Sin correr en local**: los parches de postinstall (máquina ocupada por otra sesión).

### 2026-10-29 — harness del frontend (paso 3)

- **Hecho**: `npm run verificar` (`scripts/verificar.mjs`): parches de postinstall, tipos y Jest; `--rapido` y
  `--e2e`; se frena antes de lo pesado si ve otra sesión usando la máquina; resumen para el PR y salida 0/1/2.
  Issue #47 (Jest no encontraba pruebas dentro de un worktree) arreglado en `501814f`.
- **Verificado**: `verificar --rapido`: tsc 0 errores y las pruebas de lo cambiado en verde; vio el emulador y
  Maestro de la otra sesión y no tocó los parches. El modo normal se negó al Jest completo por lo mismo. Con
  `<rootDir>/.claude/`, el checkout principal lista 409 pruebas y ninguna de un worktree.
- **Sin correr**: Jest completo y los parches (máquina ocupada).

### 2026-10-29 — harness del frontend (pasos 1 y 2)

- **Hecho**: `AGENTS.md` de 2.552 líneas (262 KB) a 150 (12 KB); el historial de cambios autorizados pasó tal
  cual a `docs/producto/`, con índice; prueba guardiana `agentsCorto.test.ts`; constitución 1.0.1 solo en el
  frontend (`cc48395`). Después, este archivo y `funcionalidades.json`, con su prueba.
- **Verificado**: el reparto conserva las 2.438 líneas; `agentsCorto.test.ts` pasa 4/4 y falla 2/4 contra el
  `AGENTS.md` anterior. **Sin correr**: Jest completo y `tsc` (la máquina la tenía otra sesión con el E2E).
- **Siguiente**: paso 3 (`npm run verificar`).
