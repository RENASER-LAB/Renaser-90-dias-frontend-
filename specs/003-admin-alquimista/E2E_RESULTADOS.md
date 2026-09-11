# E2E — resultados de ejecución

**Última corrida:** 2026-09-11, contra backend y base LOCALES.
**Frontend y backend:** rama `mentor`.
**Runner:** Playwright 1.49.1 · viewport 360 px · 1 worker · 0 reintentos.

```
28 pasaron · 0 fallaron · 0 salteadas    (32,4 s)
```

Las tres nuevas son **E18**, que cubre el cambio de rol (`StaffRolesScreen`).

Los 17 recorridos, con sus variantes, corriendo contra backend y base reales. Se llegó acá
sembrando los escenarios que faltaban (`soporte/escenarios.sql`) y corrigiendo un defecto real
que la propia suite destapó: un grupo lleno devolvía **500** en vez de 409.

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
| E02 ×2 | «Ahora no» es de esa cuenta y no le esconde la invitación a la otra |
| E05 | El cupo lo sostiene el **servidor**: el doceavo se rechaza con **409**, no con 500 |
| E07 | Retirar desde el grupo equivocado se rechaza y no toca la pertenencia real |
| E08 | La semana administrativa y la del mentor devuelven el mismo día |
| E13 | Un grupo cerrado se consulta desde administración y deja de dar acceso |
| E15c | El guard del mentor sigue negando fuera de su relación vigente |
| E18 | Promover a mentor y devolver el rol: la persona vuelve al padrón, no se pierde |
| E18b | `ASSISTANT` da 400: por eso la pantalla ofrece cinco roles y no siete |
| E18c | Un aprendiz no le cambia el rol a nadie |

## 2. Lo que hizo falta para dejar de saltear

Nada de esto era opcional, y por eso quedó versionado en `soporte/escenarios.sql`:

- **Veinte aprendices libres.** E05 llena un grupo de diez y necesita uno más para forzar el
  rechazo. El script **libera** a los aprendices antes de sembrar: cada corrida los asigna a los
  grupos que crea, así que sin eso la reserva se agotaba y la prueba se salteaba desde la tercera
  ejecución. Una prueba que solo funciona la primera vez no es una prueba.
- **Un grupo del mentor con dos alumnos**, escritos en el **historial** y no solo en el puntero
  —que es de donde leen el chat y el seguimiento, exactamente lo que causó E-177—.
- **Un grupo con el período ya cerrado**, para E13.
- **Dos cuentas administrativas que nunca iniciaron su programa**, solo para E02. La primera
  versión le borraba la participación a la cuenta principal: la prueba pasaba y el log del
  backend se llenaba de 404 que no eran un fallo de nada.

## 2b. Motivos históricos de salteo (ya resueltos)

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

## 5b. Cuatro trampas de la corrida del 2026-09-11

Ninguna era un defecto del panel. Las cuatro son del entorno o de la propia suite, y las cuatro
apuntaban con el dedo a la pantalla equivocada:

| Síntoma | Causa real |
|---|---|
| E06 busca «Renombrar [e2e-mtx3q**dsu**]» y había creado «[e2e-mtx3q**cee**]» | `ENTORNO.runId` era un **getter** con `Date.now()` adentro: cada lectura devolvía un id distinto. Solo funcionaba si quien lanzaba la suite recordaba exportar `E2E_RUN_ID`. **Corregido**: se calcula una vez al cargar el módulo |
| E04 pide el cartel de «no hay aprendices» habiendo veinte libres | `locator.count()` **no espera**. Mientras la petición viajaba contaba cero, tomaba la rama del vacío y moría pidiendo un cartel que nunca iba a aparecer. **Corregido**: se espera a que la lista se defina —un candidato *o* el cartel— y recién ahí se cuenta |
| `POST /admin/cells/{id}/trainees` → 404 | El aprendiz no tenía fila en `participantes_programa`. `aprendices-disponibles` lo ofrecía igual, así que la interfaz mostraba un candidato que el `POST` rechazaba. **Corregido en el sembrado**, que ahora la repone para las cuatro cuentas principales |
| «Login de ADMIN falló con 429» a la sexta corrida | El límite es por correo (10/h) **y por IP (50/h)**. Las ~8 sesiones de cada corrida salen todas de `127.0.0.1`. Limpiar solo los contadores por correo no alcanza |

Y una quinta, de método: restaurar `usuarios` desde un respaldo **sin sus tablas dependientes**
deja un estado a medias que no falla al restaurar, sino tres pasos después. Faltaban
`perfiles_mentor` —a la que apunta `participantes_programa.mentor_id`, y no a `usuarios`— y las
participaciones. El sembrado ahora repone ambas.

## 5c. Un defecto REAL que destapó E04

No todo lo que falló era del entorno. E04 moría pidiendo el cartel «No hay aprendices activos sin
grupo» habiendo veinte libres, y la causa estaba en la pantalla:

```tsx
const abrirSelectorDeAprendiz = async () => {
  setEligiendo('aprendiz');            // abre la lista YA
  setCandidatos(await aprendicesDisponibles());   // …y pide los datos después
};
```

Entre una línea y otra, `candidatos` vale `[]` y el cartel de «no hay nadie» se dibuja. **La
pantalla afirmaba que no hay aprendices cuando lo cierto es que todavía no lo sabía**, y un
segundo después aparecían los veinte.

Es lo mismo que ARF-02 prohíbe —una carga o un error convertidos en cero— y es el más creíble de
la familia: nadie sospecha de una lista vacía. Un administrador que abriera el selector con la red
lenta concluiría que no le queda gente a quien asignar.

**Corregido en `GrupoDetalleScreen`**: un `cargandoLista` separa «todavía no sé» de «no hay».
Mientras la consulta viaja se muestra el indicador; el cartel solo aparece cuando ya hay respuesta.

Vale la pena subrayar cómo salió: **no lo reportó nadie**. Lo destapó una prueba que tomó la rama
equivocada y después no encontró lo que esa rama prometía. El síntoma apuntaba a la suite.

## 6. El riesgo que estaba aceptado — CERRADO el 2026-09-11

`SecurityConfig` dejaba `/api/v1/account-requests/**` entero en `permitAll()`, y
`ActorAutenticadoArgumentResolver` resuelve el actor desde `X-Actor-Id` cuando no hay sesión. El
patrón cubría también listar, aprobar, rechazar y borrar, que son operaciones de ADMIN.

**Se comprobó explotándolo** contra el backend local, no se dedujo del código:

```
GET  /api/v1/account-requests?status=PENDING   -H "X-Actor-Id: <uuid-admin>"  -> 200
POST /api/v1/account-requests/{id}/approve     -H "X-Actor-Id: <uuid-admin>"  -> 204
```

El 204 dejó una cuenta creada y `ACTIVO` en la base, sin sesión ni contraseña. Los UUID no son
secretos: el propio login devuelve el `id` en el cuerpo.

El riesgo se había aceptado el 10/09 con un motivo cierto entonces —*"la versión desplegada no tiene
panel administrativo"*— y la premisa caducó al entrar el panel en el despliegue.

**Cerrado con matchers por método**, porque `POST /account-requests` (alta, pública) y
`GET /account-requests` (bandeja, de ADMIN) comparten la ruta entera. Tras el arreglo: las cuatro
operaciones de ADMIN dan **403** sin sesión y el registro completo sigue funcionando
(**alta 202 → bandeja 200 → aprobar 204 → entrar 200**). Fijado por
`AccountRequestControllerAutenticacionTest`; detalle y lecciones en **E-181** de la bitácora.
