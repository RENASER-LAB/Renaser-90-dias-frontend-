# Pendientes — qué queda después del 2026-09-10

Lo que **no** se hizo, con el motivo de cada cosa. Ordenado por lo que urge, no por lo que costó.

Estado al cerrar: `mentor` en verde y pusheada en los dos repositorios.
`2958 unitarias + 50 de integración + 23 recorridos E2E`, todo sobre la rama ya fusionada.

---

## 1. Antes de desplegar — no depende del código

### 1.1 Confirmar los parámetros de AWS

El perfil `prod` importa `aws-parameterstore:/renaser/prod/` **sin `optional:`**, así que si
Parameter Store entero no responde el arranque falla ruidosamente. Bien pensado — pero **un
parámetro AUSENTE no hace fallar nada**: hereda el default de `application.yaml`. La app levanta
sana y el problema aparece en la cara del usuario.

| Parámetro | Qué pasa si falta |
|---|---|
| `CORS_ORIGENES` | Hereda tres `localhost`. **El web de producción recibe 403 en todas las llamadas.** |
| `RESET_PASSWORD_URL` | Default con `TODO-frontend-no-definido` adentro: el correo de recuperación sale con un dominio inventado |
| `ACTIVATE_ACCOUNT_URL` | Ídem, para el correo de activación |

```bash
aws ssm get-parameter --name /renaser/prod/CORS_ORIGENES
aws ssm get-parameter --name /renaser/prod/RESET_PASSWORD_URL
aws ssm get-parameter --name /renaser/prod/ACTIVATE_ACCOUNT_URL
```

### 1.2 `account-requests` — CERRADO el 2026-09-11

Estaba en `permitAll()` para todo el recurso, y el actor salía del header `X-Actor-Id` cuando no
había sesión. **No era teoría: se explotó contra el backend local.** Con el UUID de un
administrador —que el propio login devuelve en el cuerpo— y sin credencial alguna:

```
GET  /api/v1/account-requests?status=PENDING   -> 200
POST /api/v1/account-requests/{id}/approve     -> 204   (cuenta creada y ACTIVA)
```

Se aceptó el riesgo el 10/09 porque *"la versión desplegada no tiene panel administrativo"*. Ese
despliegue sí lo tiene, así que la premisa caducó y se cerró.

**Corrección:** matchers por método en `SecurityConfig` — el alta, `check-email`, `exists`,
`verify-email` y `GET /{id}/status` siguen públicos; listar, aprobar, rechazar y borrar exigen
`authenticated()`. El caso difícil es que `POST /account-requests` y `GET /account-requests`
comparten ruta entera: un único matcher por patrón no puede separarlos.

Verificado en vivo tras el arreglo: las cuatro de ADMIN dan **403** sin sesión; el registro
completo (alta → bandeja → aprobar → entrar) sigue en **200/204/200**. Fijado por
`AccountRequestControllerAutenticacionTest` (6 casos) y documentado como **E-181** en la bitácora.

### 1.3 Datos de prueba de la base LOCAL — LIMPIADO el 2026-09-11

Se borraron 27 cuentas `e2e-*`, 6 células `[e2e-…]`, 24 participaciones y 15 asignaciones. Quedan
6 cuentas: la real del dueño, `admin.local@ejemplo.test` y los cuatro `prueba.*` que dan gente a la
vista de mentor. Respaldo en CSV antes de borrar.

Para volver a tener el escenario de pruebas basta `soporte/escenarios.sql`, que es idempotente.

---

## 2. Lo que quedó sin verificar

### 2.1 Smoke nativo (Maestro) — **el hueco más grande**

Los tres recorridos están escritos en `.maestro/admin-alquimista/` y **nunca se ejecutaron**: hace
falta emulador o dispositivo y una build nativa.

**Consecuencia concreta:** el **gesto lateral del sistema** y el **teclado** no están certificados.
La suite web corre en Chromium con viewport de 360 px, y eso no emula ninguna de las dos cosas. Es
justamente lo que AGENTS.md §6 exige y lo único del alcance que sigue sin comprobarse.

### 2.2 Push real e iOS

- **Push:** un deep link abierto a mano valida la ruta, no el transporte. Necesita dispositivo con
  token y proveedor configurado.
- **iOS:** `useSystemBackHandler` es una API de Android. El hueco está documentado en el propio
  hook; cerrarlo es decisión de producto (cambiar `presentationStyle` de los modales, o agregar
  `react-native-gesture-handler`).

---

## 3. Recorridos E2E no implementados

Cada uno con su motivo, no por olvido:

| ID | Por qué no |
|---|---|
| **E03** | Depende de la regla de **ingreso tardío a la bienvenida**, todavía abierta en `clarifications.md`. No se inventó la semántica: define qué pasa cuando alguien entra el último día de un período de siete. |
| **E09** | Catálogo de hábitos: la edición no entró en la app (ver §4). |
| **E10** | Bandeja de evidencias con `review`/`void`: ídem. |
| **E12** | Detección de vencimiento con Clock controlado. El backend no expone un Clock de pruebas fuera de sus propios tests. |

---

## 4. Alcance que se dejó fuera a propósito

**Cambiar el rol ya NO está acá: entró el 2026-09-11** (`StaffRolesScreen`, vía «Más opciones»).
Era lo que bloqueaba tener mentores sin entrar a la base: al aprobar una solicitud el backend
fuerza APRENDIZ —`approve(id, actor)` ni siquiera recibe un rol—, así que sin esta pantalla un
mentor solo nacía con un `UPDATE` a mano.

Su límite, que conviene tener presente: el panel solo sabe LISTAR dos roles (aprendices desde
`/admin/trainees`, mentores desde `/admin/cells/mentores`). Promover a administrador, alquimista o
líder saca a la persona de las dos listas. Por eso lo cambiado queda fijado en «Cambios de esta
sesión» mientras no se salga de la pantalla, y la confirmación dice **dónde va a quedar** la
persona. Un listado por rol arbitrario necesitaría un endpoint nuevo.

Lo que sigue fuera, listado en «Más opciones» diciendo dónde vive:

- **Catálogo de hábitos** (crear, editar, guías, horarios, audioterapias)
- **Soporte y tickets**
- **Categorías del muro y base de conocimiento**

Son formularios largos, pensados para pantalla grande. Ofrecer una entrada que lleva a una pantalla
a medias es peor que decir dónde está.

---

## 5. Decisiones de negocio abiertas

**Ingreso tardío a la bienvenida** (`clarifications.md`, T03). El grupo de bienvenida dura siete
días, pero eso no garantiza que cada persona reciba siete días si entra el último. Hay tres salidas
—recortarle los días, darle siete desde su alta, o moverla al siguiente grupo— y las tres cambian
el negocio. **No se tocó el reloj del programa para disimularlo.**

---

## 6. Deuda menor, anotada para no perderla

- **Ruido en el log de notificaciones.** `DespacharAvisosHabitoScheduler` registra
  `ERROR: duplicate key ... notificaciones_origen_evento_uk` y a la vez informa «0 participantes
  fallidos». Es la **deduplicación funcionando** —el outbox reentrega y la clave única lo frena—,
  pero registrarlo como ERROR entrena a ignorar el log. Es el mismo patrón que hizo invisible a
  E-180 durante semanas. Degradarlo a `DEBUG` con un mensaje del tipo «reentrega descartada por
  deduplicación» devolvería utilidad al log.
- **14 usos de `key={index}`** repartidos por la app (preexistentes). Uno de esa familia ya causó
  un fallo real este mes.
- **El hook de `graphify` no encuentra su Python** y avisa en cada commit. No bloquea nada.

---

## 7. Para retomar

Ver [AVANCES_2026-09-10.md](AVANCES_2026-09-10.md): lleva lo construido, los cuatro defectos con su
lección, y **seis reglas de este entorno** que cada una costó un incidente — el puerto 8080 es del
dueño del proyecto, no borrar `target/classes` con el IDE abierto, `/tmp` se vacía al reiniciar,
`pgrep` se encuentra a sí mismo, la compilación incremental miente, y una sola corrida de Playwright
a la vez.

Para volver a correr el E2E:

```bash
# 1. Sembrar los escenarios (idempotente; libera a los aprendices al empezar)
psql ... -v hash="'<hash bcrypt>'" -f e2e/admin-alquimista/soporte/escenarios.sql

# 2. Backend de pruebas + app web en el 8081 (CORS solo acepta ese origen)
npm run test:e2e
```
