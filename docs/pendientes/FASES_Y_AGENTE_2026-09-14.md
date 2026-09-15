# Pendientes anotados · 14 de septiembre de 2026

Dos temas investigados hoy y aparcados a propósito. Todo verificado contra el código de
`master` — frontend `a17aa4b`, backend `fc84f02`.

---

# A · Unificar el vocabulario de las fases

**Decisión: anotado para después.** No urge y es de bajo riesgo, pero hay una trampa que hay que
conocer antes de tocarlo.

## Lo que hay hoy: cinco vocabularios

| Dónde | Qué dice | ¿Vivo? |
|---|---|---|
| backend `users.api.FasePrograma` | `PHASE_1_REBIRTH`, `PHASE_2_DEVELOPMENT`, `PHASE_3_ALCHEMIST_WARRIOR`, `PHASE_4_ASCENSION` | Sí — es la clave que viaja por el cable |
| backend `phasecontracts…FasePrograma` | "Fase I · El Renacimiento", "Fase II · El Desarrollo", … | Sí |
| `useResumenHome.ts:22-25` | Renaser · Desarrollo · Guerrero Alquimista · Ascensión | Sí — es lo que se ve en Plan |
| `YoScreen.tsx:97-125` | Comprender tu mente · Autoterapia Renaser · … | Sí — y son **tres** fases, no cuatro |
| `schema.types.ts:25` | Fundación · Aceleración · Maestría | **Muerto** — cero consumidores |

El documento del cliente pide un sexto: **El Espejo · El Ciclo Alquímico · El Maestro Interno ·
Sistema de Alto Rendimiento**.

Súmese `YoScreen.tsx:81`, que promete un logro por *"Completar la Fase 1: días 1 al 30"* cuando
la Fase 1 son 7 días.

## Qué NO se rompe

La fase **ya se deriva del día**, no se lee de la base. Los dos enums tienen
`paraDiaPrograma(dia)` y el javadoc es explícito: *"NUNCA se debe leer/confiar en un valor de fase
guardado sin recomputarlo"* (bug D-66).

Y nada de lo que la persona hace cada día mira la fase:

```
habits  → cero usos de FasePrograma
rocks   → cero usos
academy → cero usos
```

Los hábitos van por `dia_inicio`/`dia_fin` de `horarios_habito`. **Renombrar las fases no toca ni
un hábito.**

## Lo único que sí se comporta distinto por fase

`phasecontracts`, y sólo para decidir **qué día se desbloquea la firma del Contrato de Fase**:

| Fase | Empieza día | Firma se desbloquea |
|---|---|---|
| I | 1 | **nunca** (`null`) |
| II | 8 | **día 17** |
| III | 35 | día 35 |
| IV | 65 | día 65 |

## Las dos trampas

**1. Renombrar las CONSTANTES en vez de los rótulos.** El backend manda la clave
(`PHASE_1_REBIRTH`) en `/home`; el frontend la traduce con un diccionario cableado a mano. Si la
clave cambia y el diccionario no, `descripcionDeFase` devuelve `null` y `PlanScreen.tsx:878`
**deja de dibujar la tarjeta de fase**. No se cae: deja de mostrarla en silencio.

**2. Los cortes de día están duplicados en dos enums que no se pueden importar entre sí**
(`users` y `phasecontracts`, por la regla D-21). Cambiar uno y olvidar el otro los desincroniza
sin error de compilación. El propio javadoc lo avisa.

## Cómo hacerlo cuando toque

1. Tocar **sólo cadenas de texto**, nunca las constantes del enum.
2. Que `YoScreen` lea los nombres **del mismo sitio** que Plan, para que no se puedan volver a
   separar. Hoy son dos listas independientes: por eso divergieron.
3. Borrar `currentPhase` de `schema.types.ts` — es un vocabulario muerto que sólo confunde.
4. Corregir el logro de `YoScreen.tsx:81` ("días 1 al 30" → los 7 que son).
5. Si alguna vez se tocan los cortes de día, **los dos enums en el mismo commit**.

---

# B · Qué sabe y qué no sabe el agente

Investigado el 14/09 a raíz de estas preguntas: ¿sabe en qué día va la persona? ¿ayuda si alguien
deja de registrar? ¿analiza los formularios? ¿qué pasa si alguien dice "estoy mal"?

## Hay dos agentes, no uno

| Agente | Para qué | Dónde vive |
|---|---|---|
| `COMPANION` (Renasia) | El acompañante de los 90 días | Botón flotante |
| `COURSE_TUTOR` (Sparkie) | Tutor de cursos | Al pie del curso y la lección |

Separados a pedido del dueño del producto (D-102): cada uno con su prompt, su historial y su
nombre.

## Tiene herramientas — tres

| Herramienta | Qué hace |
|---|---|
| `consultar_habitos_del_dia` | Lista los hábitos de hoy con su estado y los puntos en juego |
| `consultar_puntos_en_juego` | El total pendiente |
| `marcar_habito_completado` | **Marca un hábito como hecho desde la conversación** |

Ya hay una optimización de latencia puesta a propósito: `consultar_habitos_del_dia` devuelve el
total en la MISMA respuesta para que el modelo no encadene una segunda herramienta — está
comentado en el código como *"un viaje de ida y vuelta más a Gemini, o sea uno o dos segundos más
de espera para la persona"*.

## Lo que el modelo recibe de verdad

```java
record Consulta(agente, actorId, pregunta, contexto, ambito, historial, herramientas)
```

`contexto` son fragmentos de **lecciones** recuperados del vector store. Nada más.

### → No sabe en qué día va la persona

**No hay día de programa, ni fase, ni racha, ni coherencia en lo que viaja al modelo.** El prompt
del sistema dice que el agente habla de *"el día del programa en que está"* (`renasia-sistema.st:47`),
pero nada se lo suministra.

No es un bug peligroso, porque el mismo prompt le prohíbe inventar (*"Nunca te inventes… un número
de día"*), así que dirá que no lo sabe. Pero la promesa del prompt y el contexto real no coinciden.

**Arreglo barato:** el día, la fase y la racha ya están en `/api/v1/home`. Inyectarlos como una
línea del prompt de sistema cuesta una llamada que ya existe y **cero herramientas** — o sea, cero
latencia añadida. Ver la sección de rendimiento.

### → No analiza los formularios de los primeros 7 días

El contexto del agente son lecciones (`ConsultarLeccionesVisiblesPort`), no las respuestas de la
persona. El Código Renaser, la Ficha Inicial y el Mapa del día 7 **no llegan al modelo**.

Existe la pieza que haría eso —`GenerarInsightSemanalPort`, el Espejo Sombra, que sí leería el
diario— pero está en NoOp: devuelve vacío, y el scheduler semanal corre igual sin producir nada.

## Si alguien deja de registrar hábitos

| Qué pasaría | ¿Pasa? | Dónde |
|---|---|---|
| Le avisan **antes** de que venza | **Sí** | `DespacharAvisosHabitoScheduler` + antelaciones configurables |
| Se le descuentan puntos | **No** | `expirar` otorga 0 y no descuenta; `MISSED_HABIT` **no tiene emisor** |
| **Le avisan al mentor** | **Sí** | `DetectarAvisosScheduler`, cada hora |
| Sale en rojo (semáforo) | **No** | El semáforo necesita la coherencia diaria, que **nunca se calcula** |
| El agente le pregunta qué pasó | **No** | Nada inicia una conversación; el agente sólo responde |

### El aviso al mentor sí funciona, y es lo más maduro de todo esto

`MotivoAviso` tiene dos causas, las dos implementadas:

- **`SIN_ACTIVIDAD`** — días locales completos sin registrar nada. Umbral configurable por
  cohorte, **3 por defecto**.
- **`EVIDENCIA_VENCIDA`** — obligaciones que exigían evidencia, ya vencidas y sin entrega. Nunca
  antes de vencer.

Corre cada hora (no una vez al día, porque cada participante tiene su zona horaria) y deduplica
por episodio, así que 24 corridas no generan 24 avisos.

**O sea: el mentor se entera. Lo que no pasa es que el aprendiz vea nada, ni que el agente lo
mencione.**

## Si alguien dice "estoy mal"

**No pasa nada especial.** `EvaluarRiesgoMensajePort` existe, tiene su `NivelRiesgo` y su modo
crisis definidos — y **no tiene ningún llamador en todo el backend**. El adaptador es NoOp y
devuelve "sin señales" sin leer el mensaje.

El javadoc del placeholder es honesto y merece leerse antes de conectarlo: explica por qué NO
devuelve `CRITICO` "por las dudas" (dispararía modo crisis en toda conversación) y deja escrito
que **hace falta criterio clínico confirmado** para el mapeo — no se resuelve programando.

> Hoy la contención la da el mentor, que sí existe, tiene panel, chat y avisos automáticos. Ese es
> el camino real, y conviene que el agente lo diga explícitamente en vez de improvisar.

---

# C · Rendimiento: cómo no hacerlo lento

La preocupación era: *"¿ejecutamos estas funciones de tool calling al iniciar sesión?"*.

**No.** Ejecutar herramientas al abrir sesión es la forma cara de resolverlo: paga latencia
siempre, incluso cuando la persona no va a hablar con el agente.

## Lo que se hace en su lugar

**1. Contexto precalculado en el prompt, no herramientas.** Lo que el agente necesita *siempre*
—día de programa, fase, racha, hábitos pendientes— va como una línea del prompt de sistema,
tomada de `/api/v1/home`, que la app ya pide al entrar. Coste: cero llamadas nuevas, cero turnos
extra con el modelo.

Las herramientas se reservan para lo que el modelo necesita *a veces* o para lo que **escribe**
(`marcar_habito_completado`). Regla práctica: **si el dato se necesita en más de la mitad de las
conversaciones, va en el prompt, no en una herramienta.**

**2. Una herramienta que responde dos preguntas.** Ya está hecho y es el patrón correcto: cada
turno de herramienta es un viaje de ida y vuelta completo al modelo. Devolver el total junto con
la lista ahorró uno.

**3. Streaming.** Ya está: el frontend consume SSE (`renasiaStream.ts:100`). La persona ve la
primera palabra en cientos de milisegundos aunque la respuesta entera tarde segundos. Es la
diferencia entre "rápido" y "lento" tal como se percibe.

**4. Nada de esto se precalcula al abrir sesión.** Se calcula cuando la persona abre el chat, no
cuando entra a la app.

## Orden sugerido cuando se retome

1. Inyectar día + fase + racha en el prompt del acompañante. Barato, y cierra el hueco de "no sabe
   en qué día va".
2. Decidir cómo se calcula la coherencia diaria y encender el cron. Desbloquea el semáforo, el
   Verdugo y el ranking de una sola vez.
3. Decidir qué hace el agente ante una señal de crisis — **con criterio clínico, no programando
   primero**.
4. El Espejo Sombra (analizar los formularios y el diario) sólo después de lo anterior: es el más
   caro y el que menos gente ve.
