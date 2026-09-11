# Contratos verificados y extensiones — revisión 2

“Existente” significa encontrado en el checkout, no desplegado o probado por esta auditoría.
Las propiedades de período/especialidad incluyen código sin commit. Releer antes de implementarlas.

## Superficie existente

| Operación | Método y ruta | Observación |
|---|---|---|
| Listar solicitudes | GET /api/v1/account-requests | status, page, size |
| Aprobar/rechazar | POST /api/v1/account-requests/{id}/approve o /reject | Respetar respuesta y motivo del controller |
| Staff | GET /api/v1/admin/staff | role, status, page, size |
| Invitar staff | POST /api/v1/admin/staff/invite | Invitar implica asignar rol |
| Editar staff | PUT /api/v1/admin/staff/{id} | Estado: PATCH /{id}/status |
| Cambiar rol | PATCH /api/v1/users/{id}/role | ADMIN y ALCHEMIST ya pueden |
| Aprendices | GET /api/v1/admin/trainees y /{id} | page y size; no q ni filtro grupo observado |
| Día del programa | PUT /api/v1/admin/trainees/{id}/program-day | Ajuste explícito, no editar historia |
| Cohortes | GET/POST /api/v1/admin/cohorts | PATCH /{id}, PATCH /{id}/status |
| Grupos | GET/POST /api/v1/admin/cells | GET exige cohortId; PATCH /{id}; GET /{id} |
| Dashboard de grupos | GET /api/v1/admin/cells/dashboard | No equivale al resumen administrativo completo |
| Candidatos mentor | GET /api/v1/admin/cells/mentores-disponibles y /mentores | DTO actual sin especialidad |
| Candidatos aprendiz | GET /api/v1/admin/cells/aprendices-disponibles | Revisar elegibilidad y búsqueda global |
| Mentor de grupo | PUT o DELETE /api/v1/admin/cells/{id}/mentor | Debe conectarse a historial/composición |
| Aprendices de grupo | POST /api/v1/admin/cells/{id}/trainees | Retirar: DELETE /{id}/trainees/{traineeId} |
| Sesión | POST /api/v1/admin/cells/{id}/session | Reutilizar contrato existente |
| Política | GET/PATCH /api/v1/admin/cohorts/{cohortId}/mentoring-policy | Campos de rotación son legacy |
| Guías de bienvenida | PUT /api/v1/admin/cohorts/{cohortId}/reception/guides | No equivale a automatización de ingreso |
| Perfil mentor | PATCH /api/v1/users/{mentorId}/mentor-profile | Especialidad es trabajo local |
| Hábitos generales | GET/POST /api/v1/admin/habits | Edición POST /{id}; activación POST /{id}/toggle |
| Horarios | GET/POST /api/v1/admin/habits/{habitId}/schedules | Edición POST /schedules/{scheduleId} |
| Guías y adjuntos | /api/v1/admin/habits/{habitId}/guides y /guide-attachments | Reutilizar upload-url y confirmación |
| Audioterapias | PATCH /api/v1/admin/audio-therapies/{week} | Mismo permiso de catálogo |
| Hábitos personalizados | GET /api/v1/admin/trainees/{traineeId}/habits | Configuración; no calendario histórico |
| Evidencias | GET /api/v1/admin/evidence | participanteId, estado, tipoDestino, desde, hasta, cursor |
| Revisar/anular | POST /api/v1/admin/evidence/{id}/review o /void | Sin inventar payload |
| Onboarding | GET /api/v1/admin/onboarding/dashboard | Lectura administrativa existente |
| Tickets mentor | GET /api/v1/admin/tickets | Cursor |
| Tickets soporte | GET /api/v1/admin/support-tickets | Estado; POST /{id}/resolve |
| Comunidad | /api/v1/admin/wall-categories | CRUD y reorder existentes |
| Conocimiento | POST /api/v1/admin/conocimiento | No es editor de cursos |
| Contexto personal | GET /api/v1/mentor/context | Programa y acompañamiento, sin matriz administrativa |
| Programa staff | GET/POST /api/v1/mentor/activate-tracking | DELETE es destructivo; no usar para Ahora no |
| Semana mentor | GET /api/v1/mentor/groups/{groupId}/learners/{userId}/progress | weekStart; requiere acompañamiento vigente |
| Ranking | GET /api/v1/ranking/groups | Reusar contrato y fórmula |

## Particularidades de DTO que debe respetar Claude

CrearCelulaRequest admite name, cohortId, videoCallUrl, periodStart y periodEnd en el working tree. Las fechas van juntas o ninguna. No admite todavía tipo ni capacity en este DTO.

ActualizarCelulaRequest admite clearPeriod. Si no llegan fechas ni clearPeriod, conservar período. La implementación actual da prioridad a clearPeriod incluso si también llegan fechas: la UI no debe emitir un body contradictorio. No borrar una URL al editar nombre inadvertidamente: el DTO de URL tiene semántica diferente.

MentorCandidatoResponse contiene userId, fullName, avatarUrl y cellId. Falta especialidad en esta lectura aunque ya se esté guardando en perfil. Ampliar lectura real antes de mostrar filtro de especialidad.

UpdateHabitRequest es reemplazo de detalles, con category y evidenceRequirement obligatorios. No cambia título ni tipo. No contiene effectiveFrom. Conservar esta restricción y los registros históricos; no prometer calendario universal de publicación.

TraineeHabitsResponse contiene traineeId, programDay, localDate, timeZone, scheduleEdits y habits. Abrir el cumplimiento mediante otra lectura, no reinterpretar este payload.

## Extensiones necesarias, aún no contratos existentes

E-01. Contexto administrativo: preferir ampliación compatible; si requiere ruta propia, propuesta GET /api/v1/admin/context. Solo cuenta/estado, capacidades efectivas y alcance validado. Sin copiar all-true de UserRole.can.

E-02. Semana administrativa: propuesta GET /api/v1/admin/trainees/{traineeId}/weekly-progress?weekStart=... . Guard ADMIN/ALCHEMIST y composición histórica compartida con mentoring. Zona del alumno, sin sobrescritura arbitraria por query. Mantener el contrato de mentor protegido.

E-03. Período/tipo/cupo/especialidad/estado de grupo: ampliar consultas/DTO existentes; ciclo de cierre como operación de negocio separada de DELETE. Especificar futuro/vigente/vencido/sin período.

E-04. Ingreso a bienvenida y asignación manual: completar operaciones de community que actualizan historial, proyecciones y evento de chat en una unidad coherente.

E-05. Búsqueda y filtros faltantes: agregar a listados existentes cuando el frontend los necesite. Resumen global es una mejora posterior a los flujos principales; no nuevo dashboard persistente.

E-06. Lectura administrativa de mapa/objetivos/contratos: solo después de inventariar sus APIs y acordar el alcance de lectura. No consumir endpoints self con id ajeno.

## Permisos reales a reutilizar

USE_APP, TRACK_PROGRAM_AS_STAFF, FOLLOW_OWN_PROGRAM, APPROVE_ACCOUNT_REQUEST, MANAGE_COHORTS, MANAGE_CELLS, MANAGE_TRAINEES, MANAGE_HABIT_CATALOG, MANAGE_EVIDENCE, VIEW_ONBOARDING_DASHBOARD, MANAGE_SUPPORT_TICKETS, VIEW_ALL_MENTOR_TICKETS, MANAGE_STAFF, MANAGE_ROLES, MANAGE_MENTOR_PROFILE, MANAGE_WALL_CATEGORIES y MANAGE_KNOWLEDGE_BASE.

No existen VIEW_OPERATIONS_HUB ni VIEW_PERSONAL_HABITS en el enum inspeccionado. Una capacidad de UI puede ser derivada sin añadir un permiso de dominio. Cualquier nueva regla por rol necesita respaldo en este alcance y prueba negativa.


---

## Ampliaciones REALES tras la implementación del 2026-09-10

Ya no son propuestas: están en el código de la rama `admin-alquimista` de los dos repositorios.

| Operación | Método y ruta | Qué cambió |
|---|---|---|
| Semana administrativa | `GET /api/v1/admin/trainees/{traineeId}/weekly-progress?weekStart=` | **Nueva.** Guard propio (`MANAGE_TRAINEES` + rol activo), sin exigir relación con el alumno. Devuelve el MISMO `SemanaDelAlumno` que la del mentor, armado por el mismo método. El guard del mentor no se tocó. |
| Crear grupo | `POST /api/v1/admin/cells` | `CrearCelulaRequest` admite ahora `type` (`REGULAR`/`RECEPTION`) y `capacity` (10–15). Sin `type` no había forma de crear la bienvenida que el ingreso automático necesita. |
| Editar grupo | `PATCH /api/v1/admin/cells/{id}` | `ActualizarCelulaRequest` admite `capacity` y `resetCapacity`, con la misma disciplina que el período: si el PATCH no dice nada, no se toca. |
| Leer grupo | `GET /api/v1/admin/cells` y `/{id}` | La respuesta suma `status` (`VIGENTE`/`PROGRAMADO`/`CERRADO`/`SIN_PERIODO`), `type`, `learnerCount` (ocupación real del historial) y `capacity`. `status` lo calcula el servidor en la zona del programa: si lo decidiera el teléfono, dos administradores en husos distintos verían cerrar el mismo grupo en días distintos. |
| Candidatos a mentor | `GET /api/v1/admin/cells/mentores` y `/mentores-disponibles` | `MentorCandidatoResponse` suma `specialty` (`NEGOCIO`/`MENTE`/`RELACIONES`/`null`). Se lee vía `users.api.PerfilMentorFinder`, en lote, no con SQL contra `perfiles_mentor`. |
| Retirar aprendiz | `DELETE /api/v1/admin/cells/{id}/trainees/{traineeId}` | El `{id}` del grupo **dejó de ser decorativo**: el caso de uso comprueba que el aprendiz pertenezca a ESE grupo. Pedir la baja desde el grupo equivocado devuelve 4xx en vez de borrarle la pertenencia real. |
| Listado de aprendices | `GET /api/v1/admin/trainees` | Suma `q` (nombre o correo) y `withoutGroup`, resueltos **en la base**. El `total` viene con los mismos filtros aplicados. |
| Contexto | `GET /api/v1/mentor/context` | `capabilities` suma `canAdminister`. Sale de la misma condición que ya exigen los guards administrativos, **no** de `UserRole.can`, que para ADMIN/ALCHEMIST sigue respondiendo `true` a todo. |

### Lo que NO se agregó, y por qué

- No hay `GET /api/v1/admin/context`: la ampliación compatible de `/mentor/context` alcanzó, y una ruta nueva habría duplicado la lectura de asignaciones.
- No hay filtro por grupo en `GET /api/v1/admin/evidence`: la bandeja de evidencias no entró en la app en este alcance, así que ampliar el contrato sería trabajo sin consumidor.
- No se tocó `UpdateHabitRequest` ni se inventó `effectiveFrom`: el catálogo se edita desde el panel web.
