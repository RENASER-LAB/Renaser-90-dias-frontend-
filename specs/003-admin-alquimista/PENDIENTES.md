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

### 1.2 La decisión sobre `account-requests`

`/api/v1/account-requests/**` está en `permitAll()` y el actor sale del header `X-Actor-Id` cuando
no hay sesión. El patrón cubre también listar, aprobar, rechazar y borrar — operaciones de ADMIN.
Con el UUID de un administrador se aprueban cuentas sin credenciales, y los UUID viajan en
respuestas de la API.

Se **aceptó el riesgo** el 2026-09-10 con este motivo: la versión desplegada no expone panel
administrativo.

> **Ese motivo cambia con este despliegue**, que sí incluye Administración. No se reabre la
> discusión: se deja anotado para que la decisión sea rastreable con su contexto real. La
> corrección son cuatro líneas en `SecurityConfig` —separar del matcher lo que debe ser público
> (solicitar cuenta, `check-email`, `verify-email`, consultar el estado propio) y exigir
> `authenticated()` en el resto— y no toca ningún controller.

### 1.3 Limpiar los datos de prueba de la base LOCAL

La suite dejó en la base local unas 60 células con `[e2e-…]` en el nombre, veinte cuentas
`e2e-libre*` y siete cuentas `e2e-*`. **Solo afecta a local**, pero conviene no confundirlas con
datos reales. El paso de limpieza de la suite borra los grupos; las cuentas hay que quitarlas a
mano cuando ya no se usen.

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

No son olvidos; están listados en «Más opciones» de la app diciendo dónde viven:

- **Catálogo de hábitos** (crear, editar, guías, horarios, audioterapias)
- **Staff y roles**
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
