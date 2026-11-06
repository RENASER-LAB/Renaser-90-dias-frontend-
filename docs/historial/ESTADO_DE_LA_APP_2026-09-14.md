# Estado de la app · 14 de septiembre de 2026

Cuánto está hecho, medido contra el **código de hoy** en los dos repos —frontend `a17aa4b`,
backend `fc84f02`, los dos en `master`— y contra el alcance que fijan los dos documentos del
cliente.

Nada de acá sale de memoria ni de los `.md` viejos del repo. Cada cifra tiene abajo cómo se
contó, y lo que no se puede comprobar está marcado como tal.

---

## 1. El número

No hay UN porcentaje, porque no hay UNA pregunta. Hay tres, y dan resultados muy distintos:

| Qué se mide | Cuánto | Qué significa |
|---|---|---|
| **El software** | **77 %** | 15 módulos de backend: 8 completos, 7 con huecos nombrados |
| **La app que se toca** | **70 %** | 5 pestañas: Hoy y Plan completas, Training / Comunidad / Yo con huecos |
| **El método del cliente** | **40 %** | 49 exigencias de los dos documentos, ponderadas |

> **La lectura que importa: la máquina está mucho más construida que el método.**
> Hay 257 endpoints y 2.986 pruebas en verde sosteniendo un programa cuyas reglas propias
> —los ciclos de Intoxicación, el semáforo de coherencia, el ritual guiado— todavía no
> están escritas. No falta ingeniería. Faltan reglas de negocio concretas y nombradas.

### Cómo se pondera

Un requisito no es sí o no, así que:

| Estado | Peso | Por qué |
|---|---|---|
| Cumplido | 100 % | Funciona hoy en master |
| Parcial | 50 % | Existe una parte real y le falta algo concreto |
| Apagado | 25 % | El código está escrito; falta encenderlo o cablearlo |
| No existe | 0 % | Nada |

Sobre los 49 requisitos: **12 cumplidos, 13 parciales, 5 apagados, 19 inexistentes**
→ `(12 + 6,5 + 1,25) / 49` = **40 %**.

Si se descuentan los 3 que **el propio documento del cliente aplaza** a MVP 3-5 (avatar
evolutivo, radar emocional/SOS, IA anti-víctima), sube a **43 %**. No cambia la conclusión.

---

## 2. Qué cambió desde el Excel del 12 de septiembre

El `PLAN_SPRINT_2026-09-14.xlsx` se creó el **12/09 a las 11:13** (hora de Lima). Se revisaron
sus 49 requisitos y sus 12 incongruencias contra el código de hoy.

**Resultado: 48 de 49 filas siguen siendo correctas.** El Excel envejeció bien. Pero la que
falla, falla de una forma que conviene entender.

### La fila que ya estaba vieja el día que se escribió

| | |
|---|---|
| **Requisito 24** | «Registro interno cada hora: qué hago, qué siento, qué pienso y qué evito» |
| **Dice el Excel** | *Hecho sin mergear* — rama `feat/codigo-renaser-por-hora` — «Mergear el lunes» |
| **Dice el código** | **Ya estaba mergeado.** Frontend `930a9ed` (#18) y backend `df68a53` (#10), los dos el **11/09 a las 17:20** — casi 18 horas antes de que el Excel existiera |

Arrastra dos tareas del Sprint 1 que ya nacieron cumplidas: **S1-01 y S1-02** («mergear el PR»,
0,5 h cada una). Son 1 hora de las 24 comprometidas.

**Regla para el que lea el Excel de ahora en adelante: comprobar la fila antes de ejecutarla.**
Si pide un cambio que ya está, no se toca. Duplicar trabajo sobre código que funciona es
exactamente cómo se rompe lo que ya anda.

Ese mismo día 11 entraron además, y el Excel tampoco las refleja como cerradas:

| PR | Qué cerró |
|---|---|
| backend #7 | Mentor, Líder de Mentores y Administración |
| backend #8 · #9 | Recepción sin período = bienvenida permanente |
| frontend #15 | «Célula» → «Grupo» en toda la interfaz |
| frontend #16 · #17 | Grupo con integrantes y chat reales, fuera el mock |

### Las 12 incongruencias: verificadas una por una

| # | Incongruencia | Hoy | Evidencia comprobada |
|---|---|---|---|
| 1 · 2 | Tres nombres distintos para las mismas cuatro fases | **SIGUE** | `useResumenHome.ts:22-25` dice Renaser / Desarrollo / Guerrero Alquimista / Ascensión; el documento dice El Espejo / El Ciclo Alquímico / El Maestro Interno / Sistema de Alto Rendimiento |
| 3 | «Yo» describe un programa de TRES fases | **SIGUE** | `YoScreen.tsx:98` «FASE 1 · Comprender tu mente»; `:81` «Completar la Fase 1: días 1 al 30» |
| 4 | `obligatorio_en_intoxicacion` guardado y sin lector | **SIGUE** | Aparece en el modelo, la entidad JPA y el mapper. **Ningún servicio lo consulta** |
| 5 · 6 | Hábitos apagados: unos sin horario, otros con horario del día 1 al 90 | **SIGUE** | El agente del backend lo confirma; los cuatro del punto 6 siguen siendo el gatillo cargado |
| 7 · 8 | `TipoDia` en dos idiomas, y sólo produce 2 de sus 4 valores | **SIGUE** | `TipoDia.java:22` → `SUNDAY ? DOMINGO : DISCIPLINA`. El javadoc lo dice: INTOXICACION «no está implementado en esta versión» |
| 9 | El Código Renaser sólo corre los días 1-7 | **SIGUE** | `useRadarDelDia.ts:68` y `slotsDelRadar.ts:102` |
| 10 · 11 | Día de programa y fase desincronizados; domingos desde el día 35 | **SIGUE** | Sin cambios en el esquema |
| 12 | La coherencia diaria no la calcula nadie | **SIGUE** | `RegistrarCoherenciaDiariaUseCase` **no tiene un solo llamador** fuera de `points` |

**Ninguna de las doce se resolvió.** Lo que se hizo entre el 12 y el 14 fue otra cosa: los
Objetivos del Plan (#19), la preparación del Play Store, el ruido de avisos duplicados (#11) y
la entrada al grupo de bienvenida (#12).

---

## 3. El backend · 77 %

16 módulos. **257 endpoints** (253 activos), **267 casos de uso**, **2.986 pruebas en verde,
0 fallos** (corrida de hoy), 51 migraciones Flyway.

### Completos — 8

`calendar` · `chat` · `evidence` · `mentoring` · `notifications` · `phasecontracts` · `rocks` · `support`

Sin marcadores de trabajo pendiente. `chat` tiene WebSocket STOMP real con handshake por sesión.
`mentoring` es el más nuevo y **no tiene documentación**: 4 endpoints, 5 casos de uso, 43 pruebas
y 5 migraciones sin un solo `.md`.

### Con huecos nombrados — 7

| Módulo | Endpoints | Pruebas | Qué le falta |
|---|---|---|---|
| `users` | 47 | 562 | **La graduación nunca se marca**: tres campos en la base sin un solo escritor. El rol Líder de Mentores está en modo sombra (registra lo que habría denegado, no deniega) |
| `habits` | 53 | 554 | Escalonamiento por lotes no portado; expirar un hábito no descuenta puntos |
| `community` | 51 | 377 | 5 handlers sin autorización declarada. Uno es agujero real: `contarMisPublicaciones` recibe actor y no ejecuta guard |
| `onboarding` | 19 | 139 | 4 endpoints no existen en runtime (grabación V90, apagada por decisión del 03/09) |
| `rag` | 5 | 184 | Renasia sí tiene adaptadores reales de Google. El Espejo Sombra y la evaluación de riesgo, no — y la de riesgo **no tiene ningún llamador** |
| `academy` | 12 | 114 | La recomendación de clase corre contra un adaptador vacío sin interruptor |
| `points` | 5 | 99 | **El hueco más grande de todo el backend** — ver abajo |

### El hueco que arrastra a los demás

**La coherencia diaria no se calcula nunca.** `RegistrarCoherenciaDiariaUseCase` está
implementado y ningún reloj, controlador ni evento lo invoca.

Consecuencias en cadena, todas verificadas:

- `historial_coherencia` está vacía y lo va a seguir estando
- las rachas no avanzan
- el ranking por grupo ordena a todo el mundo por la misma constante
- el snapshot por cohorte lanza excepción
- **no cumplir un hábito no tiene ninguna consecuencia**

En un programa de 90 días cuyo indicador central es la coherencia, esto es el centro del agujero.
Y no está bloqueado por código: está bloqueado por una decisión de producto —cómo se define la
coherencia— que nadie tomó todavía.

---

## 4. El frontend · 70 %

38 pantallas, 50 archivos de API (26 emiten HTTP real), ~120 rutas distintas consumidas.

| Pestaña | Estado | Qué le falta |
|---|---|---|
| **Hoy** | Completo | — |
| **Plan** | Completo | — |
| **Training** | Parcial | La pestaña «Guías» muestra «EN DESARROLLO» en las 5 dimensiones |
| **Comunidad** | Parcial | Chat sin tiempo real; métricas inventadas; testimonios sin endpoint |
| **Yo** | Parcial | Dos gráficos estáticos rotulados como propios del usuario; 3 switches que no guardan nada |

### Lo más grande

**1. El Mapa de Renacimiento no se ve en un build publicado.** Once pantallas, ~1.100 líneas,
terminadas y persistiendo contra el servidor — detrás de `EXPO_PUBLIC_MAPA_DIA7 === 'on'`, y esa
variable **no está en `.env`, ni en `.env.example`, ni en los perfiles de `eas.json`**. Es la
mayor cantidad de funcionalidad terminada e inaccesible del repositorio. Se enciende con una
línea de configuración.

**2. Cero cobertura de pruebas del aprendiz.** 83 pruebas unitarias, todas de funciones puras.
24 pruebas E2E, **todas del rol administrador**. Ni una toca Hoy, Plan, Training, Comunidad ni
Yo — las 5 pantallas que usa el 100 % de la gente, 11.484 líneas.

**3. Restos de autenticación falsa vivos en el paquete.** `verifyOtp` acepta **cualquier** código
de 6 dígitos y abre sesión local; `loginWithApple` y `register` devuelven usuarios de demostración.
Hoy ninguno tiene llamador, pero siguen exportados en el contexto de auth: un `onPress` mal
cableado los reactiva.

**4. El Cuestionario Profundo está terminado y es inalcanzable.** 647 líneas, 8 bloques,
guardando de verdad — y cero referencias desde cualquier pantalla. Con `BienvenidaScreen` y
`GongVictoriaScreen`, son 1.041 líneas de onboarding muerto.

### Un mérito del repositorio, medible

Este código **borra** los datos falsos en vez de esconderlos tras un interruptor, y deja el
comentario diciendo qué había. Por eso este inventario es fiable: lo que queda cableado a mano es
lo que realmente queda. Sólo sobreviven dos listas inventadas (`GROUP_MEMBERS` y `METRICAS`, las
dos en Comunidad) y tres textos honestos de «PRÓXIMAMENTE».

---

## 5. Construido y apagado

La categoría más rentable, porque encender cuesta horas y construir cuesta semanas.

| Qué | Cómo se enciende | Cuidado |
|---|---|---|
| Mapa de Renacimiento (11 pantallas) | `EXPO_PUBLIC_MAPA_DIA7=on` en `eas.json` | Ninguno |
| Subida de archivos — foto del muro, evidencia, avatar, adjuntos, firma del Pacto | `STORAGE_PROVEEDOR=s3` | **Hoy, en `noop`, NINGUNA subida funciona** |
| Alta de cuentas por correo | `EMAIL_PROVEEDOR=smtp` | — |
| Avisos web push | `WEB_PUSH_VAPID_*` | — |
| IA de Renasia | `IA_PROVEEDOR=google` | Los adaptadores reales ya existen |
| Hábitos de Fase III (mantra, baile) | Migración: `activo` + filas de horario | **Con `dia_inicio = 35`.** Con 1 le aparecen mañana a toda la cohorte |
| Líder de Mentores | `MENTOR_LEAD_ENFORCEMENT=true` | Hoy sólo registra, no deniega |

> **Lo que NO hay que encender:** lectura consciente, ducha fría, entrenamiento físico y
> kilómetros diarios. Los cuatro **ya tienen horario del día 1 al 90**, y lectura consciente es
> obligatorio. Encender cualquiera añade mañana una tarea diaria a toda la cohorte de golpe y le
> baja el cumplimiento a todo el mundo por algo que nadie sabía que tenía.

---

## 6. Lo que no se puede verificar desde acá

No hay acceso a producción. Queda escrito para que nadie lo tome por comprobado:

1. **En qué día de programa está la gente hoy.** Todo el plan del sprint se apoya en «21
   aprendices, día 11 el 12/09» leído de la base **local**. Si allá la cohorte arrancó otra
   fecha, el calendario entero se reordena. **Es una sola pregunta y hay que hacerla.**
2. **Qué variables de entorno están puestas en producción.** El `application-prod.yaml` importa
   todo desde AWS Parameter Store; desde el repo sólo se ven los valores por defecto.
3. **Si las 12 notificaciones diarias del Código Renaser funcionan.** `expo-notifications` no
   carga en web ni en Expo Go: nadie las vio andar todavía.
4. **El estado real de la base desplegada.**

---

## 7. Cómo se midió

| Fuente | Qué aportó |
|---|---|
| Código de los dos repos en `master` | Todo el inventario. Tres agentes en paralelo: frontend, backend y el Excel |
| `PLAN_SPRINT_2026-09-14.xlsx` | Los 49 requisitos y las 12 incongruencias, extraídos de los dos documentos del cliente el 12/09 |
| Corrida de pruebas de hoy | Backend 2.986 · 0 fallos. Frontend 83 · 6 suites · `tsc` limpio |
| Base local `localhost:5433` | Sólo para contrastar esquema. **Nunca como fuente sobre la cohorte real** |

**Los `.md` del backend están viejos y no se usaron como verdad.** `ESTADO_DEL_PROYECTO.md` dice
15 módulos, 22 migraciones, 230 endpoints y 2.224 pruebas: hoy son 16, 51, 257 y 2.986. Dos de
sus cuatro afirmaciones centrales ya son falsas —la seguridad sí cierra ~40 prefijos, y sí hay
adaptadores reales de Google. `MAPA_ENDPOINTS.md` describe un modelo de autenticación que se
reemplazó. `GAPS_FRONTEND_BACKEND.md` se declara superado él mismo.

El único que resistió la verificación entera es `PENDIENTES_2026-09-05.md`.

---

## 8. Resumen para quien tiene 30 segundos

- **La ingeniería está sólida.** 257 endpoints, 2.986 pruebas verdes, 38 pantallas, hexagonal y
  modular de verdad. Eso es el 77 %.
- **El método del cliente está al 40 %.** Los hábitos y el contenido están casi completos —27
  hábitos de sistema, 23 cursos, 473 lecciones—. Lo que falta es el **motor de fases**: los
  ciclos de Intoxicación, el semáforo de coherencia y el ritual guiado.
- **Lo más barato con más efecto:** encender el Mapa (una línea), poner el almacenamiento en S3
  (hoy no se sube ni una foto) y decidir cómo se calcula la coherencia.
- **El riesgo que no se mide desde acá:** en qué día está la cohorte de verdad. Hay que preguntarlo.
