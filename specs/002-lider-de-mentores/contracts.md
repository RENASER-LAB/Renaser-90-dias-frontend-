# Contratos y autorización

Lo nuevo son **propuestas**, no endpoints que ya respondan. Antes de codificar, inspeccionar los
DTO reales y extender una ruta existente cuando cubra el mismo caso. Se conservan las
convenciones de nombres, paginación y errores del backend.

## Reutilización confirmada (verificada en el código)

| Ruta existente | Uso en este paquete |
|---|---|
| `GET · POST · DELETE /api/v1/mentor/activate-tracking` | El programa personal del líder. **Ya lo admite** (`ParticipacionProgramaService:67`). No se toca; `DELETE` no se usa para «ahora no». |
| `GET /api/v1/admin/tickets` | Bandeja completa de tickets de mentoría. **Ya es del líder** (`VIEW_ALL_MENTOR_TICKETS`). Insumo de la atención. |
| `POST /api/v1/chat/conversations/direct` | Conversación directa canónica con el mentor. |
| `POST /api/v1/chat/conversations/{id}/messages` | El mensaje que el líder escribe y confirma. |
| `GET /api/v1/notifications`, `/notification-preferences`, `POST /push-tokens` | Reutilizar lo que el 001 deje montado. Este paquete no abre un transporte propio. |
| `GET /api/v1/home` | La mitad de aprendiz del líder, intacta. |

No se usan `GET /api/v1/admin/staff`, `/admin/cells`, `/admin/cohorts`, `/admin/trainees` ni
`PUT /participants/{id}/mentor`: son de administración y el líder **no** los recibe (CL-04).

## Superficie nueva, mínima

| Propuesta | Contrato lógico |
|---|---|
| `GET /api/v1/leadership/mentors?cursor=&status=` | Padrón. Por mentor: `userId`, `fullName`, `level`, `operationalStatus`, `traineeCount`, `cell {id, name}` nullable, `attention {open, oldestOpenDays}`, `dataCoverage`, `updatedAt`. `nextCursor`. Orden estable. |
| `GET /api/v1/leadership/mentors/{mentorId}` | Ficha. Lo del padrón más `since`, `bio`, `attention` completa (`answered`, `expected`, `medianResponseHours`, `sampleSize`, `attributionVerifiedFrom`), `compliance` (ver abajo) y las últimas observaciones. |
| `GET /api/v1/leadership/mentors/{mentorId}/observations?cursor=` | Observaciones del mentor, más recientes primero, paginadas. |
| `POST /api/v1/leadership/mentors/{mentorId}/observations` | `{ type: RECOGNITION\|SUGGESTION\|ALERT, text, period, alsoSendByChat }`. Devuelve la observación creada y, si se envió, el `messageId`. **Idempotente por clave de operación**: repetir no crea dos. |
| `PATCH /api/v1/leadership/mentors/{mentorId}/operational-status` | `{ status: GREEN\|YELLOW\|RED, reason }`. Solo si PL-02 se aprueba. El nivel **no** se toca por esta ruta. |
| `GET /api/v1/leadership/report?period=YYYY-MM&cursor=` | Reporte. Cabecera con `period`, `timezone`, `cutoffAt`, `formulaVersion`; una entrada por mentor; y `excluded[]` con motivo para quien no tiene muestra. |

Una consulta agregada por pantalla. **No** se multiplican endpoints para contar cada ticket.

## Puertos entre módulos (todos aditivos, todos sobre `api/`)

| Puerto | Módulo dueño | Qué añade |
|---|---|---|
| `ParticipacionProgramaFinder.contarAprendicesDeMentor(UserId)` | `users.api` | Hoy hay `contarMiembrosDeCelula`, no por mentor. |
| `CelulaFinder.celulaDeMentor(UserId)` | `community.api` | Existe el inverso `mentorDe(celulaId)`. Solo lectura. |
| `TicketMentorFinder` | `support.api` (**nuevo**) | Agregados por mentor y período: abiertos, respondidos, más antiguo sin responder, tiempos. Por lotes, sin N+1. |
| `CumplimientoDeMentorFinder` | **consumido** de `points.api` (SDD 001) | Se declara ahora como puerto `out` de `leadership`; se implementa cuando el 001 lo publique. Hasta entonces, `SIN_DATOS`. |

`TicketMentorRespondidoEvent` gana el mentor que respondió. Verificado: **no tiene consumidores
fuera de `support`**, así que ampliar el record es seguro.

## Estados de dato — vocabulario único

Todo campo agregado viaja con uno de estos, y el frontend los pinta distinto (RL-05, RL-12, CL-07):

| Estado | Significa |
|---|---|
| `COMPLETE` | El dato es completo y atribuible. |
| `PARTIAL` | Hay dato, pero la ventana no está cubierta entera. Se etiqueta, no se oculta. |
| `NO_SAMPLE` | No hubo oportunidades evaluables en el período. **No es 0 %.** |
| `NO_HISTORY` | El período es anterior a la primera fecha verificable. |
| `SOURCE_UNAVAILABLE` | La fuente no respondió o todavía no existe (el caso del cumplimiento del 001). |

`null` **nunca** se convierte en cero ni en verde, ni en el backend ni en la app.

## Ejemplo de ficha (ilustrativo)

```json
{
  "userId": "uuid",
  "fullName": "Luis Romero",
  "level": "N1",
  "operationalStatus": "YELLOW",
  "since": "2026-03-03",
  "traineeCount": 10,
  "cell": { "id": "uuid", "name": "Aurora" },
  "period": "2026-09",
  "timezone": "America/Lima",
  "cutoffAt": "2026-09-09T20:00:00Z",
  "attention": {
    "answered": 9, "expected": 12,
    "openCount": 3, "oldestOpenDays": 6,
    "medianResponseHours": 18, "sampleSize": 9,
    "attributionVerifiedFrom": "2026-09-10",
    "dataCoverage": "PARTIAL"
  },
  "compliance": { "dataCoverage": "SOURCE_UNAVAILABLE", "reason": "SDD-001 pendiente" },
  "observations": [
    { "id": "uuid", "type": "SUGGESTION", "createdAt": "2026-09-05T14:00:00Z", "sentByChat": true }
  ]
}
```

Los enums se mapean a los tipos reales del proyecto; este ejemplo no renombra el dominio.

## Matriz de acceso

| Acción | TRAINEE | MENTOR | **MENTOR_LEAD** | ADMIN / ALCHEMIST |
|---|---|---|---|---|
| Programa propio de 90 días | Sí | Sí, al activar | **Sí, al activar — ya funciona** | Según participación |
| Ver el padrón de mentores | No | No | **Sí** (`VIEW_MENTOR_CORPS`) | Sí |
| Ver la ficha de un mentor | No | No | **Sí** | Sí |
| Registrar observaciones | No | No | **Sí** (`FOLLOW_UP_MENTOR`) | Sí |
| Leer el reporte | No | No | **Sí** (`VIEW_MENTOR_REPORT`) | Sí |
| Mover el semáforo operativo | No | No | **Sí, si PL-02 se aprueba** | Sí |
| Promover de nivel un mentor | No | No | **No** | Sí (`MANAGE_MENTOR_PROFILE`) |
| Ver todos los tickets de mentoría | No | Los propios | **Sí — ya lo tiene** | Sí |
| Expediente de un aprendiz | El propio | Sus alumnos actuales (SDD 001) | **No** | Según permisos existentes |
| Administrar staff, roles, células, cohortes, altas | No | No | **No** | Sí |
| Administrar el calendario | No | Sí | **No — omisión ya documentada** | Sí |

**Reconciliación con el SDD 001.** Su `contracts.md` pide no convertir a `MENTOR_LEAD` en
administrador por el nombre. Se respeta: no recibe ningún permiso de ADMIN. Lo que sí recibe son
**cuatro permisos nuevos, estrechos y nombrados**, porque el dueño del proyecto definió un alcance
de gestión para el rol el 2026-09-09. Ese alcance no existía cuando se escribió el 001.

Toda consulta comprueba identidad, permiso y —cuando aplique— relación vigente. Ninguna capacidad
se decide en el móvil (RL-24).

## Errores y concurrencia

Se reutiliza el formato de error actual. Casos: sin autenticar; prohibido; mentor inexistente o
no elegible; período inválido; texto de observación vacío o excedido; fuente no disponible. **Un
fallo del servidor no se devuelve como lista vacía** (RL-08, RL-21).

`POST` de observación con clave de operación estable: repetirlo devuelve la observación ya creada,
sin duplicar el mensaje de chat. Listados con orden estable y `cursor`; los límites técnicos de
paginación son independientes del tamaño del cuerpo de mentores.
