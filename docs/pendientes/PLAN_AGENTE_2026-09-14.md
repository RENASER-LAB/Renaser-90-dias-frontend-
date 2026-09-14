# Plan · el agente acompañante

**Escrito el 14/09/2026. Nada de esto está implementado — es un plan, no un registro de cambios.**

Sale de una pregunta concreta: *si el agente puede marcar un hábito como hecho, ¿cómo sabe cuál
es, y cómo valida la evidencia si el chat no acepta fotos ni audios?*

Todo lo de abajo está verificado leyendo el código de `master` (backend `fc84f02`).

---

## 1. La respuesta a la pregunta

### Cómo sabe cuál hábito

Por `registroId`. La herramienta `consultar_habitos_del_dia` devuelve una línea por hábito:

```
id=<uuid> | <título> | estado=<estado> | vale <n> puntos hasta <hora>
Total en juego: N puntos en M habito(s) que todavia puede entregar.
```

El modelo tiene que listar primero y usar ese id. Si se inventa uno, la herramienta responde
*"Ese identificador de hábito no es válido. Consulta primero los hábitos del día"*. Ese camino
está bien cerrado.

### Cómo valida la evidencia: **no la valida — y la app tampoco**

Esta es la parte que sorprende. `ExigenciaEvidencia.OBLIGATORIA` aparece en exactamente tres
sitios de todo el backend:

| Dónde | Para qué |
|---|---|
| La definición del enum | — |
| El DTO del panel de administración | Mostrar y configurar la exigencia |
| `ObligacionesHistoricasPersistenceAdapter` | Alimentar el **aviso al mentor** por evidencia vencida |

**En ninguno bloquea completar.** `RegistroService.completar` tiene cuatro guardas —pertenencia,
existencia, política del hábito y ventana de entrega— y **ninguna mira la evidencia**. Subir
evidencia vive en otro servicio (`EvidenciaRegistroService`), por un camino aparte que nada
obliga a recorrer.

> **O sea: el agente no se salta ninguna regla, porque esa regla no existe.** Un aprendiz puede
> marcar desde la app, con el dedo, exactamente lo mismo que el agente marca desde el chat. El
> javadoc del contrato lo dice textual: *"Un agente no tiene ningún atajo que un aprendiz no
> tenga."*

Y no queda impune: cuando la obligación vence sin entrega, el detector horario le manda al mentor
un aviso `EVIDENCIA_VENCIDA`. **Se detecta después, por el mentor; no se impide antes.**

### Entonces ¿dónde está el problema de verdad?

No en que el agente tenga un privilegio. En que **no puede avisar de una regla que sí existe**.

El registro que el agente recibe por cada hábito es:

```java
HabitoDelDia(registroId, titulo, estado, puntosEnJuego, puntosMaximos, plazo)
```

**No trae si el hábito exige evidencia.** Así que el agente no puede decir *"este necesita foto,
súbela desde la pantalla de Hoy"*. Lo marca hecho en silencio, la persona se queda tranquila, y
días después le llega un aviso al mentor por una evidencia que **a ella nadie le pidió**.

Ese es el defecto concreto, y es de información, no de permisos.

---

## 2. El plan

Ordenado por relación entre lo que cuesta y lo que arregla. Cada paso dice qué toca y qué NO
puede romper.

### Paso 1 · Que el agente sepa qué hábitos piden evidencia

**El problema:** marca como hecho algo que exige foto sin mencionarlo.

**El cambio:** añadir un campo a `HabitoDelDia` y a `HabitoEnJuegoResumen`
(`exigeEvidencia`), llenarlo desde el catálogo —el dato ya está en la tabla— y sumarlo a la línea
que el agente lee. Después, dos frases en el prompt: si exige evidencia, decirlo antes de marcar y
mandar a la pantalla de Hoy a subirla.

| | |
|---|---|
| **Toca** | 2 records, 1 adaptador, el armado de la línea, el prompt |
| **Riesgo** | **Nulo.** Son campos nuevos; nadie lee lo que todavía no existe |
| **Esfuerzo** | 2 h |

### Paso 2 · Que el agente sepa en qué día va la persona

**El problema:** el prompt dice que habla del *"día del programa en que está"* y **nada se lo
suministra**. Lo que viaja al modelo es `(agente, actorId, pregunta, contexto, ámbito, historial,
herramientas)`, donde `contexto` son fragmentos de lecciones. Ni día, ni fase, ni racha.

No miente —el prompt le prohíbe inventar números de día— pero dice que no sabe algo que el sistema
sí sabe.

**El cambio:** día, fase y racha ya están en `/api/v1/home`. Inyectarlos como **una línea del
prompt de sistema**, no como herramienta.

> **Por qué en el prompt y no como herramienta:** cada herramienta es un viaje de ida y vuelta
> completo al modelo, o sea uno o dos segundos que la persona espera mirando la pantalla. La regla
> práctica: **si el dato se necesita en más de la mitad de las conversaciones, va en el prompt.**
> Las herramientas se reservan para lo ocasional y para lo que escribe.
>
> Este proyecto ya aplicó ese criterio una vez, y está comentado en el código: la herramienta de
> hábitos devuelve el total en la misma respuesta justamente para que el modelo no encadene una
> segunda llamada.

| | |
|---|---|
| **Toca** | El armado de `Consulta` y el prompt de sistema |
| **Riesgo** | **Bajo.** Sólo agrega texto al prompt |
| **Esfuerzo** | 3 h |

### Paso 3 · Decidir qué hace el agente ante una señal de crisis

**El problema:** si alguien escribe "estoy mal", **no pasa nada**.
`EvaluarRiesgoMensajePort` está escrito, con su `NivelRiesgo` y su modo crisis definidos, y **no
tiene ningún llamador en todo el backend**. El adaptador devuelve "sin señales" sin leer el
mensaje.

**Esto NO empieza por código.** El javadoc del placeholder ya dejó escrito por qué, y conviene
leerlo entero antes de tocar nada: explica que devolver `CRITICO` "por las dudas" no es más
seguro —dispararía modo crisis en toda conversación y desensibilizaría la señal real— y que hace
falta **criterio clínico confirmado** para decidir el mapeo.

**El orden correcto:**

1. Que una persona con criterio defina qué cuenta como señal y qué responde el agente en cada
   nivel. Por escrito, antes de programar.
2. Recién entonces, conectar el puerto.
3. Mientras tanto —y esto sí se puede hacer ya— **una línea en el prompt**: ante angustia o
   crisis, el agente no improvisa contención; nombra al mentor, que existe, tiene panel, chat y
   avisos automáticos.

| | |
|---|---|
| **Toca** | Paso 3.3: sólo el prompt |
| **Riesgo** | **Nulo** para 3.3. Los otros dos están bloqueados por una decisión que no es técnica |
| **Esfuerzo** | 3.3 → 1 h · el resto, indefinido hasta que haya criterio |

### Paso 4 · Cerrar el círculo de "no registraste nada"

**El problema:** hoy el **mentor** se entera (aviso `SIN_ACTIVIDAD`, 3 días por defecto,
configurable por cohorte), pero **el aprendiz no ve nada**, no sale en rojo, no pierde puntos y
el agente no lo menciona.

**Falta el semáforo**, y el semáforo necesita la coherencia diaria — que **nunca se calcula**:
`RegistrarCoherenciaDiariaUseCase` no tiene ni un llamador.

> **Este paso es el único del plan que puede romper algo, y hay que tratarlo distinto.** El día
> que ese cron empiece a escribir, cuatro pantallas que hoy muestran vacío empiezan a mostrar
> números —el semáforo, el Verdugo, el ranking y el panel del mentor—. Si la fórmula está mal, el
> error sale por las cuatro a la vez, incluida la que ve el mentor.
>
> Se corre **primero en modo lectura** contra una semana pasada, se comparan los números a mano, y
> recién después se le deja escribir.

Y antes que todo eso: **alguien tiene que decidir cómo se define la coherencia.** Está bloqueado
por producto, no por código.

| | |
|---|---|
| **Toca** | Un cron nuevo en `points`, más el semáforo en Hoy y en el panel del mentor |
| **Riesgo** | **Medio-alto**, mitigable con la corrida en seco |
| **Esfuerzo** | 4 h el cron + 3 h el semáforo, **después** de la decisión de producto |

### Paso 5 · Que el agente analice los formularios

**El problema:** el contexto del agente son **lecciones**, no las respuestas de la persona. El
Código Renaser, la Ficha Inicial y el Mapa del día 7 no le llegan.

La pieza existe: `GenerarInsightSemanalPort` —el Espejo Sombra, que sí leería el diario— pero está
en NoOp, devuelve vacío, y el scheduler semanal corre igual sin producir nada.

**Va último a propósito:** es el más caro, el que menos gente ve, y **el que más datos sensibles
mueve**. Mandarle a un modelo las respuestas íntimas de alguien es una decisión de privacidad que
merece su propia conversación, no un renglón de un plan técnico.

| | |
|---|---|
| **Toca** | Un adaptador real de IA, el armado del contexto, y una decisión de privacidad |
| **Riesgo** | **Alto** — no técnico, sino de confianza |
| **Esfuerzo** | Días, no horas |

---

## 2.bis · ¿Herramienta o prompt? La regla, con la prueba

Salió al revisar el plan: *"¿no habría que crear estas funciones, ya que es por usuario?"*.
Merece quedar escrito, porque la respuesta no es obvia.

**La decisión no depende de si el dato es por usuario.** Los dos lo son.

El prompt de sistema **no es un texto fijo**. Es un `PromptTemplate` de Spring AI que se renderiza
en cada petición:

```java
this.promptAcompanante = new PromptTemplate(new ClassPathResource("prompts/renasia-sistema.st"));
```

Y ese archivo **ya tiene una variable**, en la línea 132:

```
{contexto}
```

Son los fragmentos de lecciones recuperados **para esa persona**, filtrados por lo que puede ver
hoy. O sea: la plantilla ya inyecta datos por usuario, en cada mensaje, y funciona desde hace
semanas. Agregar `{diaPrograma}` es poner un segundo marcador donde ya hay uno.

### Lo que sí decide

| | Prompt | Herramienta |
|---|---|---|
| Se necesita | Casi siempre | A veces |
| Tamaño | Pequeño | Puede ser grande |
| ¿Escribe? | Nunca | Sí |
| Coste por uso | Ninguno | **Un turno completo con el modelo** |

Una herramienta cuesta: el modelo contesta *"necesito llamar a X"* → vuelve al servidor → se
ejecuta → vuelve al modelo → **recién entonces** responde. Dos llamadas al modelo en vez de una,
uno o dos segundos más de espera, por un dato que el servidor ya tenía antes de empezar.

### Cómo cae cada paso de este plan

| Paso | Dónde va | Por qué |
|---|---|---|
| 1 · evidencia | **Herramienta existente** | Dato **por hábito**, y `consultar_habitos_del_dia` ya devuelve una línea por hábito. Se amplía `HabitoDelDia`; **no se crea una herramienta nueva** |
| 2 · día y fase | **Prompt** (`{diaPrograma}`) | Un dato por persona, chico, que hace falta casi siempre |
| 3 · crisis | **Prompt** | Es una regla de conducta, no un dato |
| (ya hecho) marcar hábito | **Herramienta** | Escribe — es el caso de libro |

> **La regla, en una frase:** las herramientas son para lo que el modelo *decide* buscar y para lo
> que *escribe*. El prompt es para lo que el modelo *siempre* necesita saber.

**Corolario:** no se agregan herramientas "por si acaso". Cada definición viaja en cada petición
—ocupa contexto— y le da al modelo una opción más entre las que dudar.

Queda registrada como **D-123** en `docs/MODULO_RAG.md` del backend, que es donde vive el agente y
donde la va a buscar quien toque ese código.

---

## 3. Resumen

| # | Qué | Esfuerzo | Riesgo | ¿Bloqueado? |
|---|---|---|---|---|
| 1 | El agente ve qué hábitos piden evidencia | 2 h | Nulo | No |
| 2 | El agente sabe el día y la fase | 3 h | Bajo | No |
| 3.3 | Ante crisis, deriva al mentor | 1 h | Nulo | No |
| 3.1-3.2 | Detección real de crisis | — | — | **Sí — criterio clínico** |
| 4 | Semáforo y coherencia | 7 h | Medio-alto | **Sí — definir coherencia** |
| 5 | Analizar los formularios | Días | Alto | **Sí — privacidad** |

**Los tres primeros suman 6 horas, no rompen nada y arreglan lo que preguntaste.** Los otros tres
están esperando una decisión que no es de programación.

## 4. Lo que NO hay que hacer

- **No poner el subir-fotos dentro del chat.** El camino de evidencia ya existe, está probado y
  firma URLs de S3 con vencimiento. Duplicarlo en el chat es construir dos caminos para lo mismo,
  y el segundo hereda todos los bugs del primero sin heredar sus pruebas.
- **No conectar el clasificador de riesgo "para ver qué pasa".** El propio código explica por qué
  ese atajo es peor que no tenerlo.
- **No encender el cron de coherencia sin la corrida en seco.**
- **No añadir herramientas al agente "por si acaso".** Cada una es un turno más con el modelo, o
  sea más espera. Hoy son tres y alcanzan.
