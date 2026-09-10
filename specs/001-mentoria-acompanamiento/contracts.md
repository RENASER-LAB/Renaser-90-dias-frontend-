# Contratos previstos y autorización

Los contratos nuevos son propuestas, no endpoints que ya respondan. Antes de codificar, inspeccionar DTOs/OpenAPI reales y extender rutas existentes cuando satisfagan el mismo caso de uso. Conservar convenciones de nombres y errores del backend.

## Reutilización confirmada
| Ruta existente | Uso |
|---|---|
| GET/POST /api/v1/mentor/activate-tracking | Consultar/activar participación personal opcional. No llamar DELETE al omitir programa. |
| GET/POST /api/v1/onboarding/activate-program | Reutilizar activación del programa/fecha según contrato actual. |
| GET /api/v1/me/cell y /members | Pertenencia personal actual y miembros; extender contexto sin romper clientes. |
| /api/v1/admin/cohorts y /api/v1/admin/cells | Administración existente y lecturas de mentor acotadas; no depender del primer elemento devuelto. |
| PUT /api/v1/admin/cells/{id}/mentor | Reutilizar mutación auditada de mentor, sincronizando historial/punteros/chat. |
| POST /api/v1/admin/cells/{id}/trainees | Reutilizar alta con cupo y coherencia temporal. La baja existente debe validar también el id de célula de la ruta. |
| GET /api/v1/evidence y /{id} | Evidencias propias o del alumno autorizado, paginación y filtros actuales. |
| POST /api/v1/chat/conversations/direct | Reutilizar {otherUserId}; conversación canónica existente. |
| /api/v1/chat/conversations/{id}/messages y /read | Mensajes/lectura; aplicar autorización actual del grupo. |
| /api/v1/chat/conversations/{id}/media/upload-url | Conservar flujo de media existente; no URLs públicas permanentes nuevas. |
| /api/v1/ranking y /{tipo} | Conservar semántica de puntos de personas. |
| POST /api/v1/push-tokens | Reutilizar registro, completar diferenciación de proveedor y bajas de token según contrato vigente. |

## Superficie nueva o ampliada mínima
| Propuesta | Finalidad / contrato lógico |
|---|---|
| GET /api/v1/mentor/context | personalProgram: estado; capabilities; assignments[] con groupId, type, function, desde, hasta, conversationId, coverage; links/ids para no encadenar primer cohort/primer cell. |
| PUT /api/v1/admin/cohorts/{id}/reception/guides | Lista de referencias existentes, cada una con userId O email, nunca ambos ambiguos. Validar toda la lista antes de reemplazo atómico. Repetir misma lista no duplica. No invita ni cambia roles. |
| PATCH /api/v1/admin/cohorts/{id}/mentoring-policy | capacity 10..15, rotation MONTHLY/WEEKLY, timezone, anclaje acordado, soporte por usuarios elegibles. Control de versión para edición concurrente. |
| GET /api/v1/mentor/groups/{groupId}/learners?cursor=... | Miembros autorizados, resumen/avisos actuales, nextCursor. Recepción también paginada. |
| GET /api/v1/mentor/groups/{groupId}/learners/{userId}/progress?weekStart=YYYY-MM-DD | Semana local validada; member, days[], evidenceSummary, dataCoverage, updatedAt. |
| GET /api/v1/mentor/me/evaluation?month=YYYY-MM | Evaluación propia histórica agregada con períodos, score nullable, entregas, esperadas, muestra y fórmula. |
| GET /api/v1/ranking/groups?cohortId=...&month=...&cursor=... | Ranking entre grupos, puntuación de evidencias; no reinterpretar tipo CELL existente. |
| Notificaciones existentes | Ampliar tipo, destino y payload; reutilizar listado/lectura si existen. Si falta ruta, añadirla dentro de notifications, documentando ausencia antes. |

No multiplicar endpoints para contar cada hábito. Una consulta semanal agregada, evidencias paginadas cuando se abre detalle y chat existente.

## Respuesta lógica de seguimiento (ilustrativa)
```json
{
  "groupId": "uuid",
  "learnerUserId": "uuid",
  "timezone": "America/Lima",
  "weekStart": "2026-09-07",
  "programDay": 24,
  "dataCoverage": "COMPLETE",
  "updatedAt": "2026-09-09T15:00:00Z",
  "days": [{
    "date": "2026-09-09",
    "programDay": 24,
    "habits": [{
      "recordId": "uuid",
      "title": "Caminar",
      "status": "COMPLETED",
      "dueAt": "2026-09-10T02:00:00Z",
      "requiresEvidence": true,
      "evidence": {
        "deliveryStatus": "DELIVERED",
        "firstDeliveredAt": "2026-09-09T14:00:00Z",
        "reviewStatus": "PENDING",
        "evidenceId": "uuid"
      }
    }]
  }]
}
```
Mapear estados a enums reales y DTOs del proyecto, no renombrar el dominio completo por este ejemplo. Diferenciar status de hábito y delivery/review. dataCoverage parcial/desconocido; null no se convierte en cero. IDs de participante actuales corresponden al UUID de usuario: no introducir otra identidad artificial.

## Evaluación lógica
Campos: month, timezone, evaluatedIntervals, score nullable, delivered, expected, evaluatedLearnerCount, excludedLearnerCount, dataCoverage, verifiedCount, formulaVersion, cutoffAt, status CALCULATED/NO_SAMPLE/NO_HISTORY. El score es promedio de ratios individuales y no se deriva de delivered/expected agregados. No incluir nombres de antiguos alumnos en la evaluación histórica propia.

## Matriz de acceso
| Acción | Aprendiz | Mentor | Guía de recepción | ADMIN/ALCHEMIST |
|---|---|---|---|---|
| Programa propio y evidencias propias | Sí | Sí, al activar | Según rol/participación | Según participación |
| Chat de recepción | Días/estado autorizados | Si guía asignado | Recepción asignada | Según alcance de soporte/admin |
| Chat estable | Grupo actual | Grupo actual | No por ser guía | Grupo de soporte o permiso administrativo existente |
| Progreso/evidencias de otros | No | Alumnos actuales | Recepción asignada, solo alcance de apoyo necesario | Según permisos existentes y soporte |
| Aprobar/rechazar evidencia | Según política actual | No se concede por esta feature | No | Solo permiso existente |
| Configurar guías/política/rotar manualmente | No | No | No | Permiso administrativo explícito existente |
| Evaluación histórica propia | No aplica | Agregada propia | Solo si también mentor evaluado | Supervisión autorizada |
| Ranking de grupos | Resumen autorizado de comunidad | Igual | Igual | Igual más gestión existente |

MENTOR_LEAD usa permisos existentes: no convertirlo en administrador por nombre. GUIA no es nuevo UserRole; es función asignada a un usuario elegible. Email se resuelve del lado servidor y no se expone a miembros del chat como dato nuevo.

Para todo acceso a alumno: comprobar identidad, capacidad, grupo solicitado y relación vigente; no confiar solo en learnerUserId ni en pertenencia pasada. Para medios, autorizar antes de emitir URL temporal. Mantener autoconsulta como caso explícito para mentor que cursa.

## Errores y concurrencia
Reutilizar formato de errores actual. Casos: autenticación requerida; prohibido o recurso no visible según convención; usuario inexistente/no elegible; capacidad fuera de rango; grupo completo; versión obsoleta; política incompleta; datos no disponibles. No convertir fallos del servidor en lista vacía.

Mutaciones administrativas con control de versión/idempotencia apropiado; repetir asignación idéntica retorna estado vigente sin nuevo intervalo ni evento duplicado. Job usa clave interna estable y no requiere token de usuario falso. Listados paginados con orden estable; límites técnicos independientes del cupo comercial.

