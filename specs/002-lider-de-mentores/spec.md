# Especificación funcional · Líder de Mentores

## Objetivo

Que la persona con rol `MENTOR_LEAD` pueda **hacer el programa como cualquier aprendiz** y, en la
misma app, **hacerse cargo del cuerpo de mentores**: verlos, seguirlos contra el programa,
hablarles cuando algo va bien o mal, dejar constancia de lo que les dijo, y leer un reporte que
resuma todo eso sin inventar un solo número.

## Actores

- **Líder de mentores** (`MENTOR_LEAD`): el actor de esta especificación.
- **Mentor** (`MENTOR`): sujeto del seguimiento. Su lógica de acompañamiento es del SDD 001 y
  aquí solo se **lee**.
- **Administrador / Alquimista**: conservan lo que ya tienen. Promover de nivel, asignar mentores
  y administrar células siguen siendo suyos.
- **Aprendiz**: no es interlocutor del líder en este alcance. Aparece contado y agregado, nunca
  con su expediente abierto.

## Historias

- Como líder quiero **seguir mi propio programa de 90 días** sin que la app me trate como alguien
  a medio dar de alta.
- Como líder quiero **ver a mis mentores en una sola lista**, con cuántos aprendices lleva cada
  uno y cómo está su semáforo, sin encadenar tres pantallas de administración.
- Como líder quiero **abrir un mentor** y entender en treinta segundos si está atendiendo o está
  atascado, con hechos y no con impresiones.
- Como líder quiero **decírselo**: reconocerle lo que hace bien o sugerirle un cambio, con el
  mensaje que yo escribo, y que quede registrado para el mes que viene.
- Como líder quiero **un reporte mensual** del cuerpo de mentores para saber a quién acompañar
  primero.
- Como administrador quiero que el líder **no pueda administrar nada** por tener estas pantallas.

## Requisitos EARS

Numerados `RL-nn` para no colisionar con los `RF-01..RF-30` del SDD 001.

### El líder como aprendiz

| ID | Requisito |
|---|---|
| RL-01 | MIENTRAS el usuario tenga rol `MENTOR_LEAD`, EL SISTEMA le permite activar y recorrer el programa de 90 días con Hoy, Plan, Training, Comunidad, Yo, Mapa, hábitos, rocas y evidencias propias, **reutilizando el camino existente sin modificarlo**. |
| RL-02 | CUANDO un `MENTOR_LEAD` entra sin haber activado su programa personal, EL SISTEMA le da acceso a la gestión de mentores sin encerrarlo en el onboarding de aprendiz, **compartiendo el mismo gate de navegación que el SDD 001 define para el mentor**. |
| RL-03 | CUANDO el líder decide no cursar el programa, EL SISTEMA conserva su cuenta y su gestión sin borrar participación ni datos, y le deja activarlo más tarde. |

### Ver el cuerpo de mentores

| ID | Requisito |
|---|---|
| RL-04 | CUANDO el líder abre la gestión, EL SISTEMA lista los mentores activos con nombre completo, semáforo operativo, nivel, cantidad de aprendices a cargo y célula que acompaña, **paginado y con orden estable**. |
| RL-05 | CUANDO un dato del listado no está disponible, EL SISTEMA lo muestra como no disponible y **nunca como cero, vacío ni verde**. |
| RL-06 | CUANDO el líder abre un mentor, EL SISTEMA presenta su ficha: identidad, semáforo, nivel, antigüedad, célula, aprendices a cargo, atención de tickets y las observaciones ya registradas, con su fecha de actualización. |
| RL-07 | MIENTRAS el líder consulte a un mentor, EL SISTEMA **no** le expone el expediente individual de ningún aprendiz —hábitos, evidencias, mapa ni chats ajenos—; los aprendices solo aparecen contados y agregados. **Alcance, no prohibición**: la especificación del cliente §2.3 sí le concede auditar expedientes y reasignar aprendices; el dueño acotó esta entrega a la gestión de mentores (DL-02, DL-07) y esa parte queda para el SDD 001. Ver [clarifications.md](clarifications.md). |
| RL-08 | SI el líder pide un mentor que no existe o no está a su alcance, ENTONCES EL SISTEMA responde con el error de la convención existente y **no devuelve una lista vacía disfrazada de éxito**. |

### Seguimiento contra el programa

| ID | Requisito |
|---|---|
| RL-09 | CUANDO el líder consulta la atención de un mentor, EL SISTEMA calcula sobre los tickets de mentoría reales: abiertos, respondidos, el más antiguo sin responder y el tiempo de respuesta, **atribuidos a quien efectivamente respondió**. |
| RL-10 | CUANDO se responde un ticket de mentoría, EL SISTEMA registra de forma duradera **qué mentor respondió**, para que una rotación posterior no reatribuya el trabajo pasado. |
| RL-11 | CUANDO el líder consulta el cumplimiento de evidencias de los aprendices de un mentor, EL SISTEMA **consume la fórmula única del SDD 001** y, mientras esa fórmula no exista, muestra el estado `SIN_DATOS` con la razón. Está prohibido calcular una segunda fórmula. |
| RL-12 | CUANDO no hay muestra suficiente o el historial no es fiable, EL SISTEMA distingue `SIN_MUESTRA` de `SIN_HISTORIAL` de `COBERTURA_PARCIAL`, y muestra siempre numerador, denominador, período y fecha de corte. |
| RL-13 | MIENTRAS no exista historial de asignación mentor↔aprendiz, EL SISTEMA marca como no disponible todo período anterior a la primera fecha verificable y **no reconstruye el pasado a partir de los punteros actuales**. |

### Hablarle al mentor

| ID | Requisito |
|---|---|
| RL-14 | CUANDO el líder decide contactar a un mentor, EL SISTEMA abre o reutiliza la conversación directa existente y envía **solo el mensaje que el líder escribe y confirma**. Ningún mensaje automático, ninguna plantilla enviada sola. |
| RL-15 | CUANDO el líder deja una observación sobre un mentor, EL SISTEMA la registra con tipo —reconocimiento, sugerencia o alerta—, autor, texto, período y fecha, de forma **append-only**: se corrige con otra observación, no borrando la anterior. |
| RL-16 | CUANDO el líder registra una observación, EL SISTEMA le ofrece enviarla también por el chat directo, y deja constancia de si se envió y con qué mensaje; si el envío falla, **la observación se conserva igual**. |
| RL-17 | CUANDO el mentor recibe una observación enviada, EL SISTEMA la entrega como un mensaje suyo del líder en el chat que ya usa, sin crear un buzón nuevo. |
| RL-18 | SI el líder intenta observar a alguien que no es mentor, ENTONCES EL SISTEMA lo rechaza. Las observaciones son sobre mentores, no sobre aprendices. |

### Reporte

| ID | Requisito |
|---|---|
| RL-19 | CUANDO el líder abre el reporte de un período, EL SISTEMA presenta, por mentor: carga de aprendices, atención de tickets, cumplimiento consumido del 001 si existe, observaciones registradas en el período y el semáforo vigente. |
| RL-20 | CUANDO el reporte muestra un valor, EL SISTEMA lo acompaña de su denominador, su período, su zona horaria y su fecha de corte. **Ningún porcentaje viaja solo.** |
| RL-21 | CUANDO una fuente del reporte no está disponible, EL SISTEMA la marca como tal por separado y **entrega el resto del reporte**; una fuente caída no vacía el informe entero. |
| RL-22 | CUANDO el líder exporta o comparte el reporte, EL SISTEMA incluye únicamente datos agregados de mentores y **ninguna evidencia, mensaje ni dato personal de un aprendiz**. |
| RL-23 | CUANDO el reporte ordena o compara mentores, EL SISTEMA usa el valor sin redondear, muestra el redondeo solo en pantalla, y **excluye del orden a quien no tenga muestra** en vez de colocarlo último con un cero. |

### Autorización

| ID | Requisito |
|---|---|
| RL-24 | MIENTRAS exista la gestión de mentores, EL SISTEMA autoriza cada consulta y cada escritura **en el servidor**, por permiso nombrado; lo que muestra la app es informativo. |
| RL-25 | CUANDO se define la matriz de permisos de `MENTOR_LEAD`, EL SISTEMA conserva intacto su acceso a todo lo que ya usaba —su programa personal, chat, muro, academia, ranking, notificaciones y tickets—; **cerrar el falla-abierto no puede romperle la app**. |
| RL-26 | SI un rol distinto de `MENTOR_LEAD`, `ADMIN` o `ALCHEMIST` llama a la gestión de mentores, ENTONCES EL SISTEMA responde 403, incluso con sesión válida, y también si la cuenta está suspendida. |
| RL-27 | CUANDO el líder actúa sobre el perfil operativo de un mentor, EL SISTEMA le permite mover el semáforo pero **no** promover de nivel, invitar, cambiar roles, administrar células ni aprobar altas. |

### Experiencia

| ID | Requisito |
|---|---|
| RL-28 | CUANDO el líder navega en móvil, EL SISTEMA conserva las cinco pestañas y ofrece la gestión de mentores desde Hoy y desde Comunidad, **sin una sexta pestaña** y sin ocultarla al final de una página larga. |
| RL-29 | CUANDO el usuario amplía el tamaño de fuente del sistema, usa una pantalla de 320 px o vuelve atrás con el gesto lateral, EL SISTEMA conserva lectura, acciones y formularios sin recortes, sin doble scroll y sin cerrar la app desde una subpantalla. |
| RL-30 | CUANDO el sistema comunica un estado —semáforo, pendiente, sin datos—, EL SISTEMA lo dice **con palabras además de con color**, con cuerpo de texto de 16 px y controles de 48 px como piso. |

## No funcionales

- **RNL-01** · Se cumplen `constitution.md` y las reglas de ambos repositorios.
- **RNL-02** · Autorización por permiso nombrado en la matriz de `UserRole`, no por `if` de rol
  dentro de un servicio nuevo. Las preguntas de relación siguen en el caso de uso.
- **RNL-03** · Listados paginados con orden estable y consultas por lotes; ningún N+1 al armar el
  padrón ni el reporte. El tamaño de respuesta no depende del tamaño del cuerpo de mentores.
- **RNL-04** · Toda operación temporal usa `Clock` y la zona que corresponda; los períodos son
  intervalos semiabiertos `[inicio, fin)`.
- **RNL-05** · Estados diferenciados en pantalla: cargando, vacío, sin permiso, sin datos, sin
  muestra, sin historial, error de red y fuente caída.
- **RNL-06** · Una sola fórmula de cumplimiento en todo el producto, y vive en el 001. El 002 la
  consume y jamás la reimplementa, ni en backend ni en frontend.

## Casos límite

Mentor sin célula. Mentor sin aprendices. Mentor recién creado, sin historial. Mentor suspendido
o dado de baja durante el período. Ticket respondido antes de que existiera el registro de quién
respondió. Rotación a mitad de mes. Dos observaciones simultáneas sobre el mismo mentor. Líder
que **también** es mentor de una célula. Líder consultándose a sí mismo. Período sin cierre aún.
Mes corto. Zona horaria distinta a la del servidor. Fuente del 001 ausente, parcial o caída.
Cuerpo de mentores de una sola persona, y de cien.

## Fuera de alcance

Recepción, cupos, grupos, rotación, sincronización de chat de grupo y evaluación mensual del
mentor (SDD 001). Aprobar o rechazar evidencias. Ver el expediente de un aprendiz. Administrar
células, cohortes, roles, altas o staff. Calendario. Promover de nivel a un mentor. Chatbot, IA,
RAG o mensajes automáticos. Rediseño global, sexta pestaña, pagos. Despliegue.

## Finalización

Cada `RL-nn` tiene una prueba que lo cubre o un bloqueo declarado por escrito. El backend
mantiene arquitectura y pruebas obligatorias en verde. El frontend compila y se recorre en
dispositivo. La matriz de permisos de `MENTOR_LEAD` está completa y verificada en positivo y en
negativo. Ningún dato ausente aparece como cero. Un mockup, un endpoint que responde 200 o un
build exitoso **no** completan por sí solos un requisito.
