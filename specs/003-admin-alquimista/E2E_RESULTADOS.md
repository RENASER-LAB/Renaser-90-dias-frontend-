# E2E — resultados de ejecución

**Última corrida:** 2026-09-10, contra backend y base LOCALES.
**Frontend:** `Renaser-90-dias-frontend-`, rama `admin-alquimista`.
**Backend:** `Renaser-90-dias-backend`, rama `admin-alquimista`.
**Runner:** Playwright 1.49.1 · Chromium 153 · viewport 360 px · 1 worker · 0 reintentos.

```
15 pasaron · 0 fallaron · 7 salteadas    (25,2 s)
```

> Los 7 salteados **no son verdes disfrazados**: cada uno se saltea con un motivo explícito que
> se lee en la salida. Lo que no se pudo ejecutar se dice, no se esconde.

---

## 1. Lo verificado de punta a punta

Sesión real por la interfaz (`X-Auth-Token`), backend real, base real. Sin mocks de permisos,
historial ni cumplimiento.

| ID | Qué demuestra |
|---|---|
| E01 ×2 | ADMIN y ALQUIMISTA abren Administración y vuelven; los cinco tabs, intactos |
| E02b | Un ADMIN inicia su programa de 90 días, sobrevive a recargar y **sigue siendo admin** |
| E04 | Crear grupo con fechas → mentor → aprendiz, y persiste al reabrir |
| E06 | Renombrar **no** borra el período |
| E06b | Un grupo PROGRAMADO no concede acceso hoy |
| E08b | La ficha muestra la semana y **no** ofrece completar por el alumno |
| E08c | Sin registros dice «Sin datos», no cero |
| E11 | El chat se abre sin enviar nada |
| E14 | El ranking sale del motor único |
| E15 | Un aprendiz no alcanza Administración por API |
| E15b | Una cuenta suspendida ni siquiera consigue sesión |
| E16 | La búsqueda encuentra a alguien que **no** está en la primera página |
| E16b | Un solo scroll: sin desbordamiento horizontal en 360 px |
| E17 | Sin red, la pantalla lo dice y **no** convierte el error en «0 en total» |

## 2. Lo salteado, con su motivo

| ID | Por qué no corrió |
|---|---|
| E02 ×2 | Activar el programa es irreversible por diseño (la contraparte sería un DELETE que borra progreso). Ambas cuentas ya lo activaron, así que no queda invitación que posponer. |
| E05 | Necesita once aprendices libres para llenar un grupo y forzar el rechazo del doceavo. |
| E07 | Necesita un aprendiz ya asignado a un grupo concreto. |
| E08 | Necesita un mentor con grupo y alumnos vigentes. |
| E13 | Necesita un grupo con el período ya cerrado. |
| E15c | Necesita un mentor con relación vigente y un alumno ajeno. |

Levantarlos exige sembrar esos escenarios. Es trabajo pendiente, no un resultado.

## 3. Lo que sigue sin cubrir

- **Smoke nativo (Maestro).** Los tres recorridos están escritos en `.maestro/admin-alquimista/`
  pero no se ejecutaron: hace falta emulador o dispositivo y una build nativa. El gesto lateral
  del sistema y el teclado **no quedan certificados por la suite web**.
- **Push real.** Un deep link abierto a mano valida la ruta, no el transporte.
- **iOS.** `useSystemBackHandler` es una API de Android; ese hueco está documentado en el hook.

## 4. Cómo se reproduce

```bash
# Backend de pruebas y app web en el 8081 (el backend solo acepta CORS desde ese origen).
export E2E_API_URL=http://localhost:8080
export E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=...      # y las otras cuatro cuentas
npm run test:e2e
```

Si `npx playwright install chromium` no puede descargar el navegador —pasa en shells de
contenedor—, se apunta al que ya exista con `E2E_CHROME_BIN`.

**`test:e2e` invoca `node node_modules/@playwright/test/cli.js` y no `playwright test`** a
propósito: con `npx` del host, Playwright lanza su worker con ese `execPath` y el hijo muere con
`invalid ELF header`.

## 5. Lo que costó llegar acá, para que no se repita

Ninguno de los fallos que se persiguieron durante la jornada fue un defecto del panel. Vale la
pena dejarlos escritos porque todos son trampas reutilizables:

| Síntoma | Causa real |
|---|---|
| 14 fallos, todos de interfaz | `ffmpeg` ausente: Playwright graba vídeo de los fallos y pedía otra build |
| «no aparece la pestaña Hoy» a los 45 s | El backend limita a **10 logins por correo cada hora**, y la suite hacía 22 |
| El worker muere con `code=127` | El shim de node del host en el `PATH`: padre y proceso hijo con binarios distintos |
| Clic que expira sobre un botón que **sí** existe | El overlay de SER, que reaparece en cada `reload()` porque no persiste su estado |
| `ENOENT` al escribir una traza | **Dos corridas mías a la vez** compartiendo `artifacts/` |
| «Expected: Renombrado / Received: Renombrar» | Carrera de la prueba: consultaba la API con el PATCH todavía en vuelo |
| Aserción que se rompe sola | Estaba atada a la **redacción** de un mensaje, no al comportamiento |
| Prueba que pasa una vez y nunca más | Contaminación entre corridas: otra prueba dejaba el dato cambiado |

---

## 6. Riesgo conocido y ACEPTADO por el dueño del proyecto

`SecurityConfig` deja `/api/v1/account-requests/**` en `permitAll()`, y
`ActorAutenticadoArgumentResolver` resuelve el actor desde el header `X-Actor-Id` cuando no hay
sesión. El patrón cubre también `GET /account-requests`, `/{id}/approve`, `/{id}/reject` y
`DELETE /{id}`, que son operaciones de ADMIN: con el UUID de un administrador se pueden aprobar
cuentas sin credenciales.

```bash
curl -X POST -H "X-Actor-Id: <uuid-de-un-admin>" .../api/v1/account-requests/<id>/approve
```

**Decisión (2026-09-10):** se deja como está. El motivo dado es que la versión desplegada no
expone panel administrativo.

**Matiz que conviene no perder:** que no haya pantalla no cierra la ruta — el endpoint responde
igual, exista o no una interfaz que lo llame, y los UUID viajan en respuestas de la API. La
corrección son cuatro líneas: separar del matcher las operaciones públicas (solicitar cuenta,
`check-email`, `verify-email`, consultar el estado propio) y exigir `authenticated()` en listar,
aprobar, rechazar y borrar.

Se registra acá para que la decisión sea rastreable, no para discutirla de nuevo.
