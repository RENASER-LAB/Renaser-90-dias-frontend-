# Progreso — Renaser 90 días (app)

Se lee **al empezar** y se actualiza **al cerrar** cada sesión (`AGENTS.md`). Todo lo que se escribe aquí se puede
comprobar; lo que no comprobaste dice «sin confirmar». Es corto a propósito (≤ 150 líneas,
`src/__tests__/harness/progreso.test.ts`): lo viejo se borra, porque ya queda en git. El detalle de cada
funcionalidad vive en su spec (backend, `specs/`) y los bugs en los issues de GitHub.

## Estado verificado — 2026-11-06

- **App, `master`**: `0ffd230` (#139, carrera con GPS: el mapa en la cuenta). CI (tipos y Jest) y Seguridad en verde
  sobre ese commit (GitHub Actions, 2026-11-06).
- **Versión en `app.json`**: 1.7.2 (#124). Si esa versión ya está en Play Store y qué builds tiene: **sin confirmar**
  (la app no se actualiza por aire: todo lo fusionado después del último APK publicado no está en los teléfonos).
- **Backend, producción**: el CD despliega cada fusión a `master`; el último en verde es `e74f566` (2026-11-05). El de
  `3a9f0b8` (spec 042, 2026-11-06) estaba corriendo al escribir esto: **sin confirmar**.
- **Trazabilidad de specs**: 8 specs exigidas, 224 requisitos, 217 cubiertos, 7 exentos, 0 sin prueba
  (`node scripts/trazabilidad-specs.mjs <app>` del backend, 2026-11-06).
- **Flujos de Maestro**: `node scripts/flujos-sin-correr.mjs` → 169 flujos; 90 dicen «escritos y sin correr» y 79 no
  tienen dato. Ninguno marcado todavía como `# corrido:` (la convención empezó el 2026-11-06).
- **Bugs abiertos**: #94, #95, #96, #97, #99 y #100 (`gh issue list --label bug --state open`). Según
  `docs/decisiones/`, #94, #95, #96 y #97 ya tienen su arreglo en `master` (entradas del 2026-11-02): **comprobar y
  cerrar**. #99 (SER y las alarmas) y #100 (tipos de las pruebas en el CI) siguen abiertos de verdad.

## Siguiente paso

1. Que el dueño revise y fusione el PR del arnés (`arnes-propio`, en los dos repos). Reemplaza al PR #48.
2. Al fusionarlo, las ramas abiertas que todavía escriben entradas en `AGENTS.md` (spec 042 y otras) chocan: su
   entrada se mueve al final del archivo que corresponda en `docs/decisiones/`, con su fila en el índice.
3. Bajar la deuda de Maestro: correr en el emulador los flujos «sin correr» de lo que ya está en producción, empezando
   por `regresion/` y lo de formaciones, y marcar cada uno `# corrido: AAAA-MM-DD`.

## A medias o pendiente

- **Ninguna prueba ejecuta las reglas de diseño que todavía son solo texto** en `AGENTS.md` (márgenes de
  `useResponsive`, un solo scroll, `useSystemBackHandler`). Candidatas a volverse pruebas como `fuenteUnica.test.ts`.
- **No hay linter (ESLint)** en la app: tipos y pruebas sí. Sumarlo es una dependencia nueva y una tanda de arreglos;
  queda para una decisión aparte.
- **5 PR de Dependabot abiertos** (#109–#112, #138) y 3 viejos (#23–#25): revisar y fusionar o cerrar.

## Sesiones (las cinco últimas)

- **2026-11-06 — arnés propio.** `AGENTS.md` de 6064 líneas a menos de 150: el historial de decisiones pasó tal cual a
  `docs/decisiones/` (147 entradas, 0 líneas perdidas), las reglas quedaron al día y sin notas «Corregido», un solo
  comando (`npm run verificar`) que también corre el CI, `PROGRESO.md`, el hook de inicio de sesión, el conteo de
  flujos de Maestro sin correr y los documentos fechados a `docs/historial/`. Verificación: ver el PR.
