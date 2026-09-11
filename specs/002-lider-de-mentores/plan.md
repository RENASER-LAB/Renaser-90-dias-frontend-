# Plan técnico y de experiencia

## 1. El recorrido completo

```text
LÍDER DE MENTORES
Entra
 ├─ Su programa (opcional, YA FUNCIONA — no se toca)
 │    Hoy · Plan · Training · Comunidad · Yo · Mapa · hábitos · rocas · evidencias
 │
 └─ Su cargo (NUEVO)
      Hoy ─── tarjeta «Mis mentores · 7 · 2 requieren atención»
      Comunidad ─── Mentores
                     ├─ Padrón:  una fila por persona, semáforo en palabras
                     ├─ Mentor
                     │    ├─ Ficha: carga, atención, cumplimiento, antigüedad
                     │    ├─ Observaciones: lo que ya le dije, en orden
                     │    ├─ [Reconocer]  ─┐
                     │    ├─ [Sugerir]    ─┼─→ observación registrada
                     │    ├─ [Alertar]    ─┘   (+ envío opcional por el chat directo)
                     │    └─ [Escribirle] ───→ chat directo existente
                     └─ Reporte del mes ─── por mentor, con denominadores y corte
```

Lo que **no** aparece en ese recorrido, a propósito: ningún aprendiz por su nombre, ninguna
evidencia, ningún panel de administración.

## 2. Autorización: cerrar A-1 sin romper al líder

Es el trabajo de mayor riesgo del paquete y va primero, porque todo lo demás cuelga de él.

**Permisos nuevos**, con nombre de capacidad y no de rol:

| Permiso | Para qué |
|---|---|
| `VIEW_MENTOR_CORPS` | Ver el padrón de mentores y la ficha de uno. |
| `FOLLOW_UP_MENTOR` | Registrar observaciones sobre un mentor. |
| `VIEW_MENTOR_REPORT` | Leer el reporte del cuerpo de mentores. |
| `SET_MENTOR_OPERATIONAL_STATUS` | Mover el semáforo. Se **separa** de `MANAGE_MENTOR_PROFILE`, que se queda con el nivel y sigue siendo de ADMIN/ALCHEMIST (PL-02). |

Antes de escribir nada de esto, **contrastar con la matriz de los 5 roles** de
`docs/spec/Especificacion_Requisitos_Renaser_OS.docx`: es fuente de reglas de negocio y manda
sobre estas propuestas.

**La fila `PERMISOS_MENTOR_LEAD` de `UserRole.java`** debe contener, además de los cuatro de
arriba: `USE_APP`, `FOLLOW_OWN_PROGRAM`, `TRACK_PROGRAM_AS_STAFF`, `PUBLISH_ON_WALL`,
`OPEN_SUPPORT_TICKET`, `VIEW_ALL_MENTOR_TICKETS`, `VIEW_OWN_PHASE_CONTRACTS` y todo lo que hoy
usa de hecho. **La fila no se escribe de memoria**: se deriva del inventario de
`EndpointAuthorizationDeclarationTest`, endpoint por endpoint, y se prueba en positivo y en
negativo (RL-25, RL-26).

`FOLLOW_OWN_PROGRAM` merece atención aparte: hoy sus guards dicen literalmente *«Solo un aprendiz
opera sus propias rocas»*, *«Espíritu es exclusivo de aprendices»*. Si el líder va a recorrer el
programa (DL-01), o esos guards admiten a quien tiene participación activa —no solo a `TRAINEE`—
o la mitad de aprendiz del líder no funciona de verdad. **Comprobarlo con una cuenta real antes
de dar RL-01 por hecho**; si falla, es un hallazgo que se reporta, no un permiso que se ensancha
a mano.

**Secuencia de tres pasos (PL-01):**

1. Escribir la fila y las pruebas. El interceptor sigue sin verificar al rol.
2. **Modo sombra**: el interceptor evalúa a `MENTOR_LEAD` y **registra** lo que denegaría, sin
   denegar. Log estructurado, sin datos privados.
3. Cumplimiento real, solo cuando el registro esté limpio en uso real. Reversible apagando el
   paso 3, sin tocar la fila.

Nunca se resuelve un 403 del líder concediéndole un permiso de administrador (CL-04).

## 3. Backend: un módulo nuevo, `leadership`

Justificación (PL-09): el reporte agrega datos de cuatro módulos. Ponerlo dentro de `users`
obligaría a editar archivos que el SDD 001 también edita; un módulo propio importa solo `api/`
ajenas y **no comparte un solo archivo con el otro agente**.

```
leadership/
  package-info.java              @ApplicationModule(displayName = "Leadership")
  domain/model/observacion/      Observacion, TipoObservacion, ObservacionId   (sin Spring/JPA)
  domain/model/reporte/          ReporteMentor, EstadoDato, Periodo            (cálculo puro)
  application/ports/in/          RegistrarObservacionUseCase, ConsultarPadronUseCase,
                                 ConsultarFichaMentorUseCase, ConsultarReporteUseCase
  application/ports/out/         SaveObservacionPort, LoadObservacionesPort,
                                 CargaDeMentorFinder, AtencionDeTicketsFinder,
                                 CumplimientoDeMentorFinder      ← el del 001, hoy sin implementación
  application/services/          LeadershipService (uno por operación, ≤7 públicos, ≤150 líneas)
  infrastructure/adapter/in/rest/    LiderMentoresController, ReporteMentoresController
  infrastructure/adapter/out/persistence/observacion/
  infrastructure/adapter/out/<modulo>/   adaptadores finos sobre users.api / community.api / support.api
```

Reglas que este módulo respeta sin excepción: el dominio no conoce Spring; el controlador
deserializa, valida, invoca **un** caso de uso y mapea; ninguna llamada cruza a `domain` o
`application` de otro módulo; `Clock` e `IdGenerator` inyectados; nombres de puerto por intención
(`CargaDeMentorFinder`, no `JpaMentorCounter`).

`CumplimientoDeMentorFinder` se declara **ahora** y se implementa **cuando el 001 lo publique**.
Hasta entonces devuelve `SIN_DATOS` con motivo. Eso es lo que permite construir el reporte hoy
sin bloquearse ni duplicar la fórmula (PL-08, RL-11).

## 4. Persistencia: lo mínimo, y justificado

La última migración aplicada es **V44**, así que la primera libre es **V45**. Diseño lógico; el SQL se escribe al implementar, con
cabecera que explique por qué no se reusa una columna existente.

| Cambio | Por qué no se reusa nada |
|---|---|
| **`observaciones_mentor`** (nueva): `id`, `mentor_id`, `autor_id`, `tipo`, `texto`, `periodo`, `enviada_por_chat`, `mensaje_id` nullable, `creado_en`. Índices por `(mentor_id, creado_en desc)` y por `(periodo)`. | No existe ningún registro de lo que un líder le dijo a un mentor. Los mensajes de chat no sirven: son conversación, no seguimiento, no tienen tipo ni período, y se mezclan con todo lo demás. **Append-only**, como `ajustes_dia_programa`: una observación equivocada se corrige con otra y las dos quedan (PL-04). |
| **`tickets_mentor.respondido_por`** (columna aditiva, nullable): quién respondió. | Verificado: la tabla (`V1:1425`) no lo guarda y el evento tampoco. Hoy se deduce del puntero **actual** `participantes_programa.mentor_id`, que va a mentir en cuanto exista la rotación del 001. `NULL` significa **no disponible**, jamás «nadie» (PL-07, RL-10, RL-13). |
| `perfiles_mentor` | Se **reutiliza tal cual**. Ojo: su `estado_operativo` (VERDE/AMARILLO/ROJO del **mentor**) no tiene nada que ver con el semáforo diario del **aprendiz** (Verde ≥80 %, RF-24/RF-25, todavía sin implementar). No se mezclan ni comparten umbrales. El semáforo del mentor y el nivel N0–N3 ya existen y ya son el lenguaje del proyecto. No se crea una segunda escala de evaluación. |
| Carga de aprendices | Se **deriva** con `COUNT` sobre `participantes_programa.mentor_id`, por `users.api`. No se materializa un contador: `total_trainees_managed` ya se eliminó a propósito (P-17) y volver a introducirlo repetiría el error de «incrementar en vez de derivar». |
| Instantáneas del reporte | **No en la primera versión** (PL-06). Si más adelante hace falta un informe inmutable, se añade una tabla de cierre con fórmula y corte, siguiendo el patrón de `ranking_celulas`. |

Sin migración destructiva, sin editar nada aplicado, sin tocar tablas de `community`.

## 5. El seguimiento, hecho de hechos y no de impresiones

Tres fuentes, con dueño y estado propio cada una. Si una cae, el resto se entrega igual (RL-21).

| Bloque | Fuente | Disponible hoy |
|---|---|---|
| **Carga** — aprendices a cargo, célula que acompaña | `users.api` (`COUNT` por mentor) + `community.api` (`celulaDeMentor`, aditivo) | Sí |
| **Atención** — tickets abiertos, respondidos, el más viejo sin responder, tiempo de respuesta | `support.api`, nuevo `TicketMentorFinder` sobre `tickets_mentor` | Sí, y es la métrica real más sólida que existe hoy |
| **Cumplimiento** — evidencias entregadas por sus aprendices | `points.api` del SDD 001 | **No.** `SIN_DATOS` con motivo hasta que aterrice |

Tiempo de respuesta: mediana, no promedio —un ticket olvidado tres semanas no debe hundir a quien
respondió doce en una hora—, con `n` a la vista. Antes de que exista `respondido_por`, la
atención se muestra con la etiqueta *«atribución no verificable antes del <fecha>»* (RL-13).

Todo valor viaja con numerador, denominador, período, zona y corte (RL-20). El frontend
**no recalcula nada** (RNL-06).

## 6. Hablarle al mentor

Dos gestos distintos, deliberadamente separados:

- **Observar** (`POST` de observación): queda registrado, tiene tipo y período, y aparece en el
  reporte. Es el instrumento de gestión.
- **Escribirle** (chat directo existente): conversación. No se registra como seguimiento.

Registrar puede además enviar, si el líder marca la casilla; el texto lo escribe él y confirma el
envío. **Nunca se manda un mensaje solo** (RL-14, PL-05). Si el chat falla, la observación se
conserva y la pantalla lo dice sin perder lo escrito (RL-16).

Se reutiliza `POST /api/v1/chat/conversations/direct` con su par canónico y el flujo de mensajes
existente. No se crea un buzón, ni un segundo transporte, ni una notificación propia de esta
funcionalidad: si hay que avisar, es por `notifications`, con lo que el 001 deje montado.

## 7. Frontend: dónde vive y cómo se ve

### Dónde

- **Sin sexta pestaña** (CL-06). Entrada principal en **Comunidad → Mentores**; atajo desde
  **Hoy** con una tarjeta.
- Carpeta nueva `src/features/lider-mentores/` con `api/`, `hooks/`, `components/`, `screens/`,
  `types/`. **No se abre `src/features/mentor/`**, que está en obra.
- Único solape con el 001: dos inserciones de una línea en `HoyScreen.tsx` y `ComunidadScreen.tsx`.
  Como un `MENTOR_LEAD` no es un `MENTOR`, `useEsMentor()` es falso para él y las dos tarjetas
  jamás coinciden en la misma persona (PL-10). Se añade `useEsLiderDeMentores()` con el mismo
  patrón, normalizando `MENTOR_LEAD` y `LIDER_MENTORES` en un solo lugar.

### El criterio de diseño

El usuario tiene entre 50 y 60 años y está a cargo de personas. La pantalla tiene que parecerse a
**una lista de personas y un informe**, no a un tablero de métricas. En concreto:

- **La unidad es la persona, no la métrica.** Nada de una rejilla de cuatro cifras enormes con
  etiquetas grises debajo. Cada mentor es una fila con su nombre completo primero, en el tamaño
  más grande de la fila.
- **Frases antes que cifras sueltas.** «4 de 7 tickets sin responder» se lee; «57 %» no dice nada
  sin denominador y además está prohibido por RL-20.
- **El estado se dice con palabras.** El semáforo se acompaña siempre de su palabra —«Al día»,
  «Requiere atención», «Con problemas»— y de la razón. Nadie debe distinguir el estado por el
  matiz de un punto de color (RL-30).
- **Tipografía como jerarquía.** Cuerpo 16 px, títulos claros, Jost 400/500/700. Cero
  `fontSize: 10.5`, cero ultrafinas. La jerarquía sale del tamaño y del espacio en blanco, no de
  cajas de colores.
- **Quietud.** Sin animaciones de entrada, sin contadores que suben solos, sin degradados
  decorativos, sin sombras flotantes. El acabado sale del crema, el carbón, el dorado y el
  espaciado que la app ya tiene.
- **Una acción principal por pantalla**, y a 48–52 px. Las secundarias, debajo y en texto.
- **Nada de emojis como iconos** ni de tarjetas con esquina de color por categoría. Ese es
  exactamente el aspecto «hecho por IA» que DL-06 pide evitar.
- **Vacío honesto.** «Todavía no hay observaciones de este mes» y qué hacer. Nunca un cero, nunca
  un verde por defecto (CL-07).

### Padrón

```text
‹ Comunidad                Mentores
7 mentores · 2 requieren atención
                                      [Reporte del mes ›]

Ana Quispe
Al día · 9 aprendices · Célula Amanecer
Sin tickets pendientes
                              [Ver ficha]

Luis Romero
Requiere atención · 10 aprendices · Célula Aurora
3 tickets sin responder · el más antiguo, hace 6 días
                              [Ver ficha]

Marta Ruiz
Sin datos · 0 aprendices · Sin célula
Se incorporó hace 4 días
                              [Ver ficha]
```

Datos ilustrativos, nunca fixture de producción. Filas verticales, nombre completo, una acción.
Paginado con orden estable; no se renderiza el padrón entero de golpe.

### Ficha del mentor

```text
‹ Mentores                 Luis Romero
Mentor N1 · desde el 3 de marzo
Estado: Requiere atención                [Cambiar estado]

A cargo
10 aprendices · Célula Aurora

Atención de consultas · septiembre
Respondidas   9 de 12
Sin responder 3 · la más antigua, hace 6 días
Tiempo de respuesta  18 h (mediana de 9)

Cumplimiento de sus aprendices
Sin datos — todavía no está disponible esta medición

Lo que le dije
5 sep · Sugerencia · «Las consultas del fin de semana…»
28 ago · Reconocimiento · «Muy buena respuesta a …»

[Reconocer]  [Sugerir]  [Alertar]
[Escribirle por chat]
```

En 320–360 px todo cae en una columna: sin tablas de siete columnas, sin scroll anidado, sin
gráficos que exijan pellizcar. «Cambiar estado» solo aparece si PL-02 se aprueba.

### Registrar una observación

Un paso, un campo, una decisión: tipo (ya elegido por el botón que se tocó), texto, y una casilla
**«Enviárselo también por el chat»** apagada por defecto. Al guardar, se dice qué se guardó y si
se envió. `useSystemBackHandler` cierra el modal con el gesto lateral, y el texto no se pierde al
abrir el teclado.

### Reporte del mes

```text
‹ Mentores            Reporte · septiembre 2026
America/Lima · datos al 9 sep, 15:00

Ana Quispe
9 aprendices · 12 de 12 consultas respondidas · mediana 4 h
2 observaciones este mes
Cumplimiento de sus aprendices: sin datos

Luis Romero
10 aprendices · 9 de 12 respondidas · mediana 18 h
1 observación este mes
Cumplimiento de sus aprendices: sin datos

No incluidos por falta de muestra: Marta Ruiz
```

Un informe que se lee de arriba abajo, con la zona y el corte en la cabecera. Sin gráficos en la
primera versión: no hay todavía suficiente dato real que graficar, y un gráfico sobre tres
números es decoración. Quien no tiene muestra se nombra aparte, **no se ordena último con un cero**
(RL-23). Compartir el reporte incluye solo agregados de mentores (RL-22).

## 8. Orden de integración

1. Permisos y matriz (modo sombra). Sin esto, nada de lo demás se puede autorizar.
2. Módulo `leadership` con el padrón y la ficha, leyendo lo que ya existe.
3. `respondido_por` y la atención de tickets atribuida de verdad.
4. Observaciones: dominio, persistencia, envío opcional por chat.
5. Reporte, con el hueco del cumplimiento declarado.
6. Frontend: padrón, ficha, observación, reporte, entradas en Hoy y Comunidad.
7. Enchufar el cumplimiento del 001 cuando exista — **solo un adaptador**, sin tocar el reporte.
8. Cumplimiento real de permisos, cuando el modo sombra esté limpio.

Cada paso deja algo que se puede probar y que no depende del siguiente. Si hay que cortar, **1, 2
y 3 solos ya valen el trabajo**: hoy el líder de mentores no puede ver un solo mentor.

El despliegue no forma parte de esta entrega.
