# E2E — resultados de ejecución

**Fecha:** 2026-09-10
**Frontend:** `Renaser-90-dias-frontend-`, rama `admin-alquimista`, HEAD `db441f7` (working tree limpio salvo esta entrega)
**Backend:** `Renaser-90-dias-backend`, rama `admin-alquimista`, HEAD `d3a4fe4`
**Runner:** Playwright 1.49.1 (fijada a esa versión a propósito: la 1.63 declara `engines.node >= 20` y esta shell tiene Node 18.20.4)

> **Estado honesto en una línea:** la suite está implementada y el runner la recoge entera (24 casos), pero **ninguno de los 17 recorridos se ejecutó** en esta máquina. Hay tres bloqueos de entorno, cada uno documentado abajo con su salida real. No se declara ningún escenario como pasado.

---

## 1. Qué se ejecutó de verdad

| Comprobación | Comando | Resultado |
|---|---|---|
| TypeScript del frontend, con la feature admin y las specs | `npx tsc --noEmit` | **PASA**, 0 errores |
| Pruebas unitarias del backend | `./mvnw surefire:test` | **PASA** — `Tests run: 2951, Failures: 0, Errors: 0` |
| Reglas de arquitectura | `./mvnw surefire:test -Dtest=ArchitectureTest` | **PASA** — 8 de 8 |
| Declaración de autorización por endpoint | `./mvnw surefire:test -Dtest=EndpointAuthorizationDeclarationTest` | **PASA** — 4 de 4 |
| La suite E2E compila y se recoge | `npx playwright test --list` | **PASA** — `Total: 24 tests in 4 files` |
| Integración del backend, la nueva | `./mvnw failsafe:integration-test -Dit.test=ComposicionDeCelulaIT` | **PASA** — 8 de 8 contra Postgres real |
| Integración completa del backend | `./mvnw verify` | ver §1.1 |
| `./scripts/test-cloud.sh` (envoltorio de Cloud) | — | **BLOQUEADO** — ver §3.1 |
| Administración contra el backend en vivo | navegador, sesión real de ADMIN | **PASA en parte** — ver §1.2 |
| Recorridos E01–E17 en navegador | `npm run test:e2e` | **BLOQUEADA** — ver §3.2 |
| Smoke nativo Maestro | `npm run test:e2e:native` | **BLOQUEADA** — ver §3.3 |

Que el typecheck pase y que el runner recoja los casos **no certifica ningún recorrido**. Lo dice e2e.md y se respeta acá: sin navegador y sin entorno de pruebas aislado, lo que hay es código de prueba, no evidencia.

### 1.1 Corrección sobre las pruebas de integración

Una versión anterior de este documento daba las pruebas de integración por bloqueadas. **Estaba mal.** El envoltorio `./scripts/test-cloud.sh` sí se detiene —exige un token de Testcontainers Cloud que en esta shell está vacío—, pero los contenedores funcionan igual a través del agente local (`~/.testcontainers.properties` apunta a `tcp://127.0.0.1:34125`). Invocando failsafe directamente, `ComposicionDeCelulaIT` corrió y pasó sus 8 casos contra un Postgres real.

### 1.2 Lo que se comprobó en el navegador, contra el backend en vivo

Se abrió la app web (`npx expo start --web --port 8081`) contra el backend que el dueño del proyecto tiene corriendo, con su sesión de ADMIN ya iniciada. **Solo lecturas y navegación: no se creó, editó ni borró nada.** Lo observado:

| Qué | Resultado |
|---|---|
| `GET /api/v1/mentor/context` | `"capabilities":{...,"canAdminister":true}` — la capacidad llega del servidor |
| Tarjeta "OPERACIÓN · Administración" en Hoy | Visible. Los cinco tabs, intactos |
| Tarjeta "TU PROGRAMA · Hacer mi programa de 90 días" | Visible para un ADMIN — que es justo lo que antes no pasaba (ARF-16) |
| Inicio de Administración | "Grupos por vencer: 0", "Solicitudes: 0" y, con un panel caído, **"Personas sin grupo · —"** con la etiqueta accesible *"Personas sin grupo. Sin datos"*. Los otros dos paneles siguieron mostrando sus números: un panel que falla no borra a los demás (ARF-02) |
| Lista de Grupos | "Célula Aurora (PRUEBA) · **SIN PERÍODO** · 4 de 10 aprendices · Mentor: Ricardo Palomino". El `status` y el `learnerCount` (ocupación leída del historial) llegan del servidor |
| Detalle del grupo | Mentor con Quitar/Cambiar, cuatro aprendices con "Retirar a &lt;nombre&gt;" cada uno, "Agregar aprendiz", y "4 de 10 plazas ocupadas" |
| Selector de mentor | "Ricardo Palomino — **Sin especialidad definida** · ya lidera este grupo". El `null` de especialidad se muestra, no se inventa (ARF-05) |
| Volver | Detalle → lista → inicio, un nivel por vez |

**Dos defectos salieron de esta pasada y están corregidos:**

1. `ParameterLabelException: Ordinal parameter labels start from '?3'` en `GET /api/v1/admin/trainees?withoutGroup=true`. El WHERE compartido entre listado y conteo numeraba los filtros como `?3`/`?4`; al pegarlo detrás de un `SELECT COUNT(*)` sin LIMIT ni OFFSET, la consulta se quedaba sin `?1`. Había prueba de `listarAprendices` y ninguna de `contarAprendices`, y por eso pasó. Se corrigió la numeración y se agregaron dos casos al test del adaptador.
2. El selector de mentor decía *"ya lidera otro grupo"* al mentor de ESE grupo. Falso, y además asusta: parece que reasignarlo se lo quitaría a alguien.

Nada de esto convierte los recorridos E01–E17 en ejecutados. Es verificación manual, y se declara como tal.

---

## 2. Qué quedó implementado

### Web (Playwright)

- `playwright.config.ts` — dos proyectos: `movil-360` (viewport 360 px, donde caen los Xiaomi y los Android estándar) y `responsive-tablet` (768 px, solo los casos E16). `workers: 1` y `retries: 0`: los recorridos comparten backend y base, y un reintento que "arregla" un caso esconde un problema de sincronización real.
- `e2e/admin-alquimista/soporte/entorno.ts` — todo por variables de entorno, **sin un solo valor por defecto para credenciales ni para la URL del backend**. Si falta una, la suite se detiene diciendo cuál. Un `E2E_API_URL` con valor por defecto es como se apunta una suite a producción por olvido.
- `e2e/admin-alquimista/soporte/api.ts` — cliente para **preparar y comprobar**, nunca para ejecutar el recorrido. Login real con `X-Auth-Token`; no se inventan JWT ni se inyectan roles en el navegador.
- `e2e/admin-alquimista/soporte/fixtures.ts` — una sesión por actor, nunca compartida: la mitad de lo que esta suite comprueba es quién puede ver qué.

| Archivo | Cubre |
|---|---|
| `E01-E02-acceso-y-programa.spec.ts` | E01, E02 (parametrizados ADMIN/ALQUIMISTA) y E02b |
| `E03-E07-grupos.spec.ts` | E04, E05, E06, E06b, E07 |
| `E08-E14-seguimiento.spec.ts` | E08, E08b, E08c, E11, E13, E14 |
| `E15-E17-permisos-y-resiliencia.spec.ts` | E15, E15b, E15c, E16, E16b, E17 |

### Nativo (Maestro)

`.maestro/admin-alquimista/` con `E01-acceso-administracion.yaml`, `E04-crear-grupo.yaml` y `E16-navegacion-y-vuelta.yaml`. Cubren lo que un navegador **no puede** certificar: el gesto lateral del sistema en cadena (ficha → personas → inicio → Mi programa), el teclado nativo tapando el botón de guardar, y el ciclo de vida de la app.

### Complemento de API (backend)

`ComposicionDeCelulaIT` — siete casos contra Postgres real: historial y puntero escritos juntos, alta idempotente, mover cierra el intervalo anterior conservándolo, retirar desde el grupo equivocado se rechaza, el cupo se sostiene en el servidor, y un grupo cerrado o programado no tiene integrantes vigentes aunque sus filas de asignación sigan abiertas.

---

## 3. Bloqueos, con su salida real

### 3.1 El envoltorio de Testcontainers Cloud no arranca (los contenedores sí)

```
$ ./scripts/test-cloud.sh failsafe:integration-test -Dit.test=ComposicionDeCelulaIT
Falta el token. Guardalo en /home/ricardo/.config/renaser/testcontainers-cloud.token o configura TC_CLOUD_TOKEN.
No se iniciaron Maven ni contenedores locales.
```

El archivo del token existe pero está **vacío** (0 bytes), así que el script sale antes de invocar a Maven.

**Lo que NO significa:** que las pruebas de integración no se puedan correr. El agente de Testcontainers está activo y `~/.testcontainers.properties` apunta a `tcp://127.0.0.1:34125`, así que llamando a failsafe directamente los contenedores se crean sin problema. `ComposicionDeCelulaIT` corrió así y pasó 8 de 8. Lo que falta es solo el token para que el envoltorio —que además comprueba que el motor sea Cloud y no Docker local— haga su verificación.

**Qué falta:** el token en `~/.config/renaser/testcontainers-cloud.token`.

### 3.2 Sin navegador para Playwright

```
$ npx playwright install chromium
Downloading Chromium 131.0.6778.33 (playwright build v1148) from https://playwright.azureedge.net/...
.../playwright-core/lib/server/registry/oopDownloadBrowserMain.js: error while loading shared libraries:
.../oopDownloadBrowserMain.js: invalid ELF header
Failed to install browsers
```

**Causa identificada.** Esta shell es un contenedor Debian 12 donde `node` es la v18 del contenedor y `npm`/`npx` vienen del host por `/run/host/usr/bin/`. Playwright lanza su descargador **en un proceso hijo**, y ese hijo termina ejecutándose con una combinación de binario y cargador dinámico que no se corresponden — de ahí el "invalid ELF header" sobre un archivo `.js`. Se probó también con el shim de node del host (`~/.local/hostnode-shim`) y falla igual: el `execPath` que Playwright pasa al hijo apunta al binario del host, que dentro del contenedor no arranca solo.

No hay ningún navegador de sistema instalado (`chromium`, `google-chrome`, `firefox`: ninguno), así que tampoco se puede apuntar `executablePath` a uno existente.

**Qué falta:** correr `npx playwright install chromium` **desde la terminal del host**, no desde esta shell. Ahí el binario y el cargador coinciden.

### 3.3 Sin entorno de pruebas aislado ni cuentas de prueba

Aunque hubiera navegador, la suite no debe correr contra lo que hay hoy:

- El único backend vivo es el que el dueño del proyecto tiene en el 8080 desde IntelliJ, con **su base de trabajo**. e2e.md es explícito: *"No levantar la suite sobre datos de trabajo del usuario"*. Casos como E05 (llenar un grupo de 10 y forzar el rechazo del 11) o E07 (retirar aprendices) escriben de verdad.
- No existen las cuentas de prueba que `entorno.ts` exige (`E2E_ADMIN_*`, `E2E_ALCHEMIST_*`, `E2E_MENTOR_*`, `E2E_TRAINEE_*`, `E2E_SUSPENDED_*`). **No se pidieron ni se inventaron**: una credencial en un documento versionado es como terminan las contraseñas reales en Git.
- Maestro no está instalado y no hay emulador ni dispositivo conectado.

---

## 4. Cómo se corre cuando el entorno esté

Desde la **terminal del host**, no desde la shell del agente:

```bash
# 1. Navegador (una sola vez)
npx playwright install chromium

# 2. Backend de pruebas en un puerto que NO sea el 8080 de trabajo, con su propia base.
#    La app web se sirve en el 8081 sí o sí: el backend acepta CORS solo desde ese origen.

# 3. Cuentas de prueba y URL, por entorno. Nunca en un archivo del repositorio.
export E2E_API_URL=http://localhost:8090
export E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=...
export E2E_ALCHEMIST_EMAIL=... E2E_ALCHEMIST_PASSWORD=...
export E2E_MENTOR_EMAIL=... E2E_MENTOR_PASSWORD=...
export E2E_TRAINEE_EMAIL=... E2E_TRAINEE_PASSWORD=...
export E2E_SUSPENDED_EMAIL=... E2E_SUSPENDED_PASSWORD=...

# 4. La suite. `webServer` levanta la app en el 8081 y la espera.
npm run test:e2e
npm run test:e2e:report

# 5. Smoke nativo, con emulador o dispositivo conectado.
npm run test:e2e:native
```

Backend, aparte:

```bash
# Con el token en ~/.config/renaser/testcontainers-cloud.token
./scripts/test-cloud.sh
```

Los artefactos (JUnit, HTML, trazas, vídeo de fallos) caen en `artifacts/e2e/`, que está en `.gitignore`.

---

## 5. Escenarios por estado

| ID | Estado | Motivo |
|---|---|---|
| E01, E02 | BLOQUEADO | §3.2 y §3.3 |
| E03 | **NO IMPLEMENTADO** | Depende de la regla de ingreso tardío, abierta en `clarifications.md`. Se dejó fuera a propósito en vez de inventar la semántica: e2e.md pide registrar esa subvariante como bloqueada hasta decidirla. La variante inequívoca (aprobar con bienvenida vigente) está cubierta por la pantalla y por `IngresoARecepcionServiceTest`, no por un recorrido. |
| E04, E05, E06, E07 | BLOQUEADO | §3.2 y §3.3 |
| E08, E11, E13, E14 | BLOQUEADO | §3.2 y §3.3 |
| E09, E10, E12 | **NO IMPLEMENTADO** | Catálogo (E09), evidencias (E10) y detección de vencimiento con Clock controlado (E12). E09 y E10 necesitan la superficie de catálogo y la bandeja de evidencias, que este alcance dejó fuera de la app (ver `MasOpcionesScreen`: son formularios de pantalla grande). E12 necesita sustituir el Clock desde un perfil de pruebas del backend, que no existe todavía. |
| E15, E16, E17 | BLOQUEADO | §3.2 y §3.3 |
| Smoke nativo (E01/E02/E04/E08/E10/E11/E16) | BLOQUEADO | Sin Maestro, sin emulador y sin build nativa. |
| Push real | **NO PROBADO** | Requiere dispositivo con token y proveedor configurado. Un deep link abierto a mano valida la ruta, no el transporte. |

---

## 6. Lo que este documento NO afirma

- Que el rol ADMIN/ALQUIMISTA esté validado de extremo a extremo. No lo está.
- Que las pantallas nuevas se hayan visto en un dispositivo. No se vieron.
- Que las pruebas de integración del backend estén en verde con los cambios de este SDD. Compilan; no corrieron.
- Que el gesto lateral funcione en iOS. `useSystemBackHandler` es una API de Android, y ese hueco ya está documentado en el propio hook.
