# Progreso — Renaser 90 días (app)

Se lee **al empezar** y se actualiza **al cerrar** cada sesión (ver `AGENTS.md`). Todo lo que se escribe acá tiene
que poder comprobarse: lo que no comprobaste dice «sin confirmar». Es corto a propósito (máximo 150 líneas,
`src/__tests__/harness/estado.test.ts`): lo viejo se borra, porque ya queda en git. El estado de cada funcionalidad vive en
`funcionalidades.json`; los bugs, en los issues de GitHub.

## Estado verificado — 2026-10-29

- **App, master**: `70db1d0` (#38, 2026-10-27). CI de master en verde (tipos y Jest).
- **Backend, producción**: el CD despliega cada merge a master; el último salió verde el 2026-10-29 a las 15:06
  (#29, BouncyCastle para el Web Push, E-650). Todo lo fusionado en el backend está en producción.
- **APK publicado**: sin confirmar. `app.json` dice 1.5.0. Lo fusionado desde el 2026-10-13 no llega a los teléfonos
  sin un APK nuevo: ver `publicacion.app` en `funcionalidades.json`.
- **Bugs abiertos de la app**: #39 a #43 (`gh issue list --label bug --state open`).

## Siguiente paso

Harness del frontend, rama `harness/agents-corto`: paso 3, un solo comando de verificación (`npm run verificar`).
Después, el mismo molde en el backend, ya desde master.

## Pendientes

- **Seguridad Java del backend (CVE-2026-91403)**: retomar desde el 2026-10-28; el 27/10 se confirmó que sí nos
  afecta. El detalle está en `docs/pendientes/SEGURIDAD_JAVA_BACKEND_2026-10-23.md`, que todavía **no está
  commiteado**: solo existe en el checkout principal (rama `fix/fenix-cuello`). Producción no está verificada ni
  parcheada. Se muda al progreso del backend cuando lo tenga.
- **`ROCKS_EXIGIR_MAPA_ACTIVO`**: encenderlo en producción solo cuando esté publicado el APK que trae #38.
- **Constitución**: la copia del backend sigue en 1.0.0; igualarla a la 1.0.1 de acá.
- **`tasks.md` desactualizados**: los PR #27, #28 y #29 registran su validación, pero sus specs dejaron tareas sin
  marcar (005: T046, T051, T057; 007: T047, T048; 008: T032–T035; 009: T024–T026; 010: T001, T011). Hay que
  marcarlas con la evidencia del PR o decir qué falta. La única que parece pendiente de verdad es la 007 T047
  (probar en un Honor real).
- **Falso rojo repetido**: `alarmasTipoDespertador` y `escucharSonido` fallan cuando al `node_modules` compartido le
  falta el parche de `postinstall`; cinco PR lo explicaron a mano (#30, #32, #35, #36, #38). El paso 3 lo resuelve.
- **Jest no encuentra pruebas dentro de `.claude/worktrees/`**: `jest.config.js` ignora toda ruta con `/.claude/`,
  también la del propio worktree. El paso 3 lo resuelve.
- **El fénix**: `fix/fenix-cuello` (#39) queda como está, por decisión del dueño (2026-10-29). El fénix 3D con
  Blender quedó descartado.

## Sesiones (las cinco últimas)

### 2026-10-29 — harness del frontend (pasos 1 y 2)

- **Hecho**: `AGENTS.md` de 2.552 líneas (262 KB) a 150 (12 KB); el historial de cambios autorizados pasó tal
  cual a `docs/producto/`, con índice; prueba guardiana `agentsCorto.test.ts`; constitución 1.0.1 solo en el
  frontend (`cc48395`). Después, este archivo y `funcionalidades.json`, con su prueba.
- **Verificado**: el reparto conserva las 2.438 líneas; `agentsCorto.test.ts` pasa 4/4 y falla 2/4 contra el
  `AGENTS.md` anterior. **Sin correr**: Jest completo y `tsc` (la máquina la tenía otra sesión con el E2E).
- **Siguiente**: paso 3 (`npm run verificar`).
