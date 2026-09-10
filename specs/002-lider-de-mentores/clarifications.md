# Decisiones y aclaraciones

## Confirmadas por el dueño del proyecto (2026-09-09)

Salen de su pedido, literal. No se vuelven a preguntar.

| ID | Decisión |
|---|---|
| DL-01 | El líder de mentores **hace lo mismo que un aprendiz**: puede llevar el programa de 90 días completo. Esa parte **no se toca**. |
| DL-02 | El rol es **gestionar mentores** y darles seguimiento de acuerdo al programa. |
| DL-03 | El líder **les habla** cuando algo está mal o algo está bien. |
| DL-04 | **No se toca la lógica de mentores**, que está en desarrollo por otro agente. Lo de este paquete se apoya en lo que ya está construido. |
| DL-05 | Hay un **módulo de reporte** para la gestión de mentores y las sugerencias. Es la parte que no genera conflicto. |
| DL-06 | El frontend lleva un **diseño de experto en UX, que no parezca hecho por IA**, coherente con la app actual. |
| DL-07 | El alcance de esta planificación es **solo ese rol**. |
| DL-08 | **(2026-09-09, cierre de PL-01)** Se cierra el falla-abierto A-1 para `MENTOR_LEAD` con la secuencia de tres pasos: fila de permisos → modo sombra → cumplimiento. |
| DL-09 | **(2026-09-09, cierre de PL-02)** El líder **mueve el semáforo operativo** de un mentor; el **nivel N0–N3 sigue siendo de ADMIN/ALCHEMIST**. |

## Propuestas de este paquete, pendientes de tu visto bueno

Completan el diseño; **no** son respuestas tuyas. Se implementan salvo que digas otra cosa, y cada
una anota qué pasa si la cambias. No frenan el trabajo independiente.

| ID | Propuesta | Qué afecta si cambia |
|---|---|---|
| ~~PL-01~~ **CERRADA → DL-08** | **Cerrar el falla-abierto A-1 para `MENTOR_LEAD` en tres pasos**: (1) escribir la fila de permisos, (2) desplegarla en **modo sombra** —el interceptor registra qué habría denegado, sin denegar—, (3) activar el cumplimiento solo cuando el registro esté limpio durante un período de uso real. Alternativa conservadora: dejar el falla-abierto y apoyarse solo en los guards de servicio. | Es la decisión más delicada del paquete. Con el falla-abierto puesto, un líder llega hoy a endpoints de administración si algún guard se olvida. Cerrándolo mal, se le rompe su propio programa. Ver [research.md](research.md) §5. |
| ~~PL-02~~ **CERRADA → DL-09** | El líder **mueve el semáforo operativo** de un mentor (VERDE/AMARILLO/ROJO) pero **no** su nivel (N0–N3), que sigue siendo de ADMIN. Se separa `MANAGE_MENTOR_PROFILE` en dos permisos. | El semáforo es la herramienta natural de seguimiento; el nivel es una promoción. Si prefieres que el líder tampoco toque el semáforo, la ficha queda de solo lectura y el resto no cambia. |
| PL-03 | **Alcance del líder = todos los mentores activos.** No se introduce una asignación líder↔mentores. | Si mañana hay varios líderes con carteras distintas, hace falta una relación nueva. Hoy no existe y no se inventa. |
| PL-04 | Tres tipos de observación: **RECONOCIMIENTO**, **SUGERENCIA** y **ALERTA**. Append-only, como `ajustes_dia_programa`. Una observación equivocada se corrige con otra; las dos quedan a la vista. | Es lo que hace que «hablarles» sirva el mes siguiente. Si quieres solo dos tipos o texto libre, se simplifica la tabla y el filtro del reporte. |
| PL-05 | El envío por chat es **opcional y explícito**: se registra la observación, y el líder decide si además la manda. El texto lo escribe él; **no hay plantillas que se envíen solas**. | Si prefieres que registrar implique enviar siempre, desaparece la casilla y `enviado_por_chat` deja de ser nullable. |
| PL-06 | **Período del reporte: mes natural en la zona de la cohorte** (Lima como valor inicial), corte al consultarlo, sin instantáneas guardadas en la primera versión. | Sin snapshot, un reporte de marzo consultado en junio puede cambiar si cambian los datos de origen. Si necesitas un informe firmado e inmutable, hace falta una tabla de cierre y una tarea más. |
| PL-07 | **`tickets_mentor` gana `respondido_por`**, y `TicketMentorRespondidoEvent` gana el mentor. Se rellena **desde ahora**; lo anterior queda como `no disponible`, no se deduce del puntero actual. | Sin esto, en cuanto el 001 encienda la rotación el reporte le atribuye a un mentor el trabajo de otro. Se comprobó que el evento no tiene ningún consumidor externo: el cambio es seguro. |
| PL-08 | El cumplimiento de evidencias del 001 se consume por **API pública de `points`**; mientras no exista, esa columna del reporte dice `SIN_DATOS` con el motivo. | Es la frontera que evita la segunda fórmula. Si el 001 la expone con otra forma, se ajusta el adaptador de este lado, no la fórmula. |
| PL-09 | El backend vive en un **módulo nuevo `leadership`**, que importa solo `users.api`, `community.api`, `support.api` y —cuando exista— `points.api`. | Garantiza cero archivos compartidos con el otro agente. La alternativa, meterlo en `users`, ahorra un módulo pero pone este trabajo en archivos que el 001 también edita. |
| PL-10 | La entrada en la app es **Comunidad → Mentores**, más una tarjeta en Hoy. Sin sexta pestaña. | Es el único punto donde los dos paquetes tocan los mismos archivos (`HoyScreen`, `ComunidadScreen`). Como un `MENTOR_LEAD` no es `MENTOR`, `useEsMentor()` es falso para él y las dos tarjetas nunca coinciden en la misma persona. |

## Contraste con la fuente normativa — hecho el 2026-09-09 (TL-02)

Se leyó **§2.3 «Rol: Líder de Mentores (MENTOR_LEAD)»** y **HU-05** de
`docs/spec/Especificacion_Requisitos_Renaser_OS.docx`, que `docs/spec/README.md` declara fuente de
reglas de negocio. Resultado, punto por punto:

| Lo que dice el documento | Este paquete |
|---|---|
| «Supervisión Global de Células y Mentores: visibilidad integral de todas las células activas, asignación de mentores y volumen de aprendices por célula.» | **Coincide** con el padrón (RL-04) y con PL-03 (alcance = todos los mentores). |
| «Métricas de Rendimiento y SLAs de Mentoría: tiempos de respuesta a tickets por parte de cada mentor, tasa de tickets resueltos.» | **Coincide, y lo confirma como la métrica principal** (RL-09). El «índice de satisfacción/interacción» **no tiene fuente de datos hoy** — no se inventa; queda declarado como pendiente. |
| HU-05: «puedo … intervenir directamente con feedback al mentor responsable.» | **Coincide** con las observaciones y el envío por chat (RL-14..RL-17). Es exactamente DL-03. |
| «Auditoría de Salud de Célula: análisis comparativo de coherencia y semáforos promedio por célula.» | Depende del semáforo diario del aprendiz (RF-24/RF-25), **que no está implementado**. Queda como `SOURCE_UNAVAILABLE`, no como cero. |
| «Intervención y Escalamiento de Casos: auditar expedientes de cualquier célula, intervenir en tickets bloqueados y reasignar aprendices.» | **Discrepancia declarada.** El documento se lo concede; el dueño acotó esta entrega a la gestión de mentores (DL-02, DL-07) y dejó la parte de aprendices al SDD 001. **Queda fuera de alcance de este paquete, no negado para siempre**: RL-07 debe leerse como «en esta entrega no se construye», no como «el rol no puede». |
| §2.5: el ALCHEMIST es el único que asciende o degrada **roles de usuario**. | No se toca. DL-09 es sobre `estado_operativo` del perfil de mentor, no sobre `UserRole`. **Sin contradicción.** |

Ninguna regla de negocio se inventó: lo que el documento no define, se pregunta o se deja
declarado como pendiente.

## Dependencias de puesta en marcha

- **Del SDD 001**: el historial de asignaciones, el motor de cumplimiento y el gate de navegación
  para staff sin programa personal. Sin ellos, RL-11, RL-13 y parte de RL-19 quedan en
  `SIN_DATOS` **por diseño**, no por olvido.
- Al menos un usuario real con rol `MENTOR_LEAD` y varios `MENTOR` para probar. No se inventan
  cuentas ni se promueve a nadie.
- Entorno de pruebas Cloud del backend, y el dueño avisando cuando pueda apagar la aplicación
  para correr `clean verify`.
- Ningún dato de producción se usa como fixture, y ningún mensaje real se envía a un mentor
  durante las pruebas.
