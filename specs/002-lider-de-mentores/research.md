# Inventario verificado y brechas

Lectura directa del código en `master` el 2026-09-09 (backend `3c590ad`, frontend `f076afd`). Cada
fila cita el archivo donde se comprobó. No se consultó producción ni se dedujo nada de memoria.
Rutas de backend relativas a `src/main/java/com/renaser/os`.

## 1. Qué es hoy `MENTOR_LEAD` en el backend

| Hecho verificado | Dónde | Consecuencia |
|---|---|---|
| El rol existe y persiste como `LIDER_MENTORES` | `users/api/UserRole.java:17`, `users/.../UserPersistenceMapper.java:61,71` | No hay que crear el rol. Ojo con la traducción ES↔EN en toda frontera nueva. |
| **Único permiso suyo con nombre propio: `VIEW_ALL_MENTOR_TICKETS`** | `shared/domain/Permission.java:199`, `support/.../TicketMentorService.java:127-129` | Ya ve la bandeja completa de tickets de mentoría (`GET /api/v1/admin/tickets`). Es el cimiento del seguimiento, y ya está construido. |
| Puede recorrer el programa: `TRACK_PROGRAM_AS_STAFF` | `Permission.java:232-234`, `users/.../ParticipacionProgramaService.java:67,225` | **La mitad de aprendiz ya funciona. No es trabajo.** |
| Puede publicar en el Muro | `community/.../PublicacionMuroService.java:407` | Sin cambios. |
| Es «staff» a efectos del padrón | `users/.../ListStaffUseCase.java:22` | Pero el endpoint que lo lista exige `MANAGE_STAFF`, que **no** tiene. |
| **NO** administra el calendario | `Permission.java:110` (lo dice explícito) | Omisión ya documentada. Este paquete no la cambia. |
| Academy lo reconoce como audiencia | `academy/.../RolesCatalogo.java:70`, `CatalogoAcademyService.java:336` | Sin cambios. |
| `UserRole.can()` devuelve **`true` para todo** | `users/api/UserRole.java:48-60` | Falla-abierto deliberado (A-1). Ver §5: es el riesgo central de este paquete. |
| El interceptor **no verifica** a `MENTOR_LEAD` | `users/.../PermissionEnforcementInterceptor.java` — `if (resumen.role() != UserRole.TRAINEE) return true;` | Hoy quien frena de verdad es el guard de cada servicio. |

**Lo que NO puede hoy:** listar mentores (`MANAGE_STAFF` es de ADMIN), ver o cambiar el perfil de
un mentor (`MANAGE_MENTOR_PROFILE`, `users/.../MentorProfileController.java`), ver células
(`MANAGE_CELLS`), asignar mentor (`ASSIGN_MENTOR`). Es decir: **el rol se llama líder de mentores
y hoy no puede ver un solo mentor.**

## 2. Qué materia prima existe para gestionar y reportar

| Pieza | Estado real | Sirve para |
|---|---|---|
| `perfiles_mentor` (`V1__baseline_renaser.sql:215-226`) | `nivel` N0–N3, `estado_operativo` VERDE/AMARILLO/ROJO, `bio`, timestamps. En dominio: `users/domain/model/mentorprofile/MentorProfile.java`, `MentorLevel`, `MentorOperationalStatus` (GREEN/YELLOW/RED). | El semáforo operativo **ya es el lenguaje del proyecto** para «este mentor está bien / hay que mirarlo / hay problema». Es el eje del reporte. No inventar otra escala. |
| `total_trainees_managed` | **Eliminado a propósito** (P-17), derivable con `COUNT` sobre `participantes_programa.mentor_id`. | La carga de un mentor se cuenta, no se acumula. Coherente con la regla «derivar, no incrementar». |
| `tickets_mentor` (`V1:1425-1443`) | `participante_id`, `estado`, `respuesta_mentor`, `respondido_en`, `creado_en`. Índices por participante y estado. | Tiempo de respuesta y pendientes por mentor: **la única métrica de desempeño real y computable hoy.** |
| `TicketMentorService.responder` (`:78-86`) | Exige `UserRole.MENTOR` y `requireMentorAsignado`. | El que responde siempre es el mentor asignado en ese momento. |
| `ParticipacionProgramaFinder` (`users/api`) | `deParticipante`, `miembrosActivosDeCelula`, `usuariosActivosConRol`, `contarMiembrosDeCelula`. | Falta una lectura por mentor. Es un método de puerto, no un módulo. |
| `CelulaFinder` (`community/api`) | `mentorDe(celulaId)`, `celulaDeParticipante(userId)`. | Falta el inverso `celulaDeMentor`. Aditivo y de una línea de intención. |
| `chat` directo | `POST /api/v1/chat/conversations/direct` con par canónico; mensajes, lectura y media (`chat/.../ConversacionController.java:60`, `MensajeController`). | «Hablarle al mentor» **ya está resuelto**. No se construye mensajería. |
| `notifications` | `GET /api/v1/notifications`, preferencias, `POST /api/v1/push-tokens`. | Reutilizar. El transporte nativo es del 001. |
| **Módulo de reportes** | **No existe.** Búsqueda en todo `src/main/java`: ninguna clase de reporting. | Se construye desde cero, y por eso no choca con nadie. |

## 3. Las tres brechas de datos que este paquete debe resolver o declarar

1. **`tickets_mentor` no guarda quién respondió.** Ni la tabla (`V1:1425`) ni el evento
   `support/api/TicketMentorRespondidoEvent.java`, que solo lleva `(ticketId, participanteId,
   occurredAt)`. Hoy el mentor se deduce del puntero **actual**
   `participantes_programa.mentor_id`. En cuanto exista la rotación del 001, ese puntero mentirá
   sobre el pasado y el reporte atribuirá el trabajo de un mentor a otro.
   **Comprobado:** el evento **no tiene ningún consumidor** fuera de `support`
   (`TicketMentorService` lo publica; solo `TicketMentorServiceTest` lo observa). Ampliarlo es
   barato y seguro.
2. **El cumplimiento de los aprendices no tiene dueño todavía.** La fórmula de evidencias
   entregadas es el RF-21 del 001 y aún no está implementada. Este paquete **no la escribe**:
   la consume cuando exista, y hasta entonces el reporte muestra `SIN_DATOS` en esa columna.
3. **No hay historial de asignación mentor↔aprendiz.** Es el mismo hueco que el 001 identificó y
   va a cubrir. El reporte del 002 depende de él para cualquier ventana temporal, y no debe
   construir una segunda tabla de intervalos.

## 4. Frontend: el rol no existe en la app

| Hecho | Dónde |
|---|---|
| Solo dos menciones de `MENTOR_LEAD`, ambas etiquetas | `src/features/chat/api/chatMappers.ts:25`, `src/features/community/api/wallMappers.ts:31` → «Líder de Mentores» |
| `useEsMentor()` solo reconoce `ROL_MENTOR` | `src/features/mentor/hooks/useEsMentor.ts` |
| Cinco pestañas fijas | `src/navigation/RootNavigator.tsx:19-25` |
| `src/features/mentor/**` es del 001 y está en obra | 11 archivos, commit `e278101` en adelante |
| Tema y responsividad ya resueltos | `src/theme/tokens.ts`, `responsive.ts`, `ThemeContext.tsx` |

La app entra a `OnboardingFlow` según `isOnboardingCompleted` (`RootNavigator.tsx:30,48`). Un
`MENTOR_LEAD` que no activó su programa personal cae en el mismo problema que el mentor del 001
— **misma causa, mismo arreglo, un solo gate.**

## 5. El riesgo central: cerrar A-1 para este rol

Hoy `UserRole.can()` devuelve `true` para `MENTOR_LEAD` en **todos** los permisos, y el
interceptor lo deja pasar sin mirar. En el momento en que exista una fila
`PERMISOS_MENTOR_LEAD` en `UserRole.java`, el interceptor deja de ser falla-abierto para el rol y
**todo endpoint que el líder use y no esté en esa fila devuelve 403** — incluidos los de su
propio programa de 90 días: hábitos, rocas, evidencia propia, contratos de fase, chat, muro,
academia, ranking, notificaciones, tickets de soporte.

Es un cambio de comportamiento grande disfrazado de una línea. Se planifica en tres pasos
(modo sombra → revisión → cumplimiento), detallados en [plan.md](plan.md) §2 y [tasks.md](tasks.md).

## 5-bis. HALLAZGO (TL-03, 2026-09-09): la mitad de aprendiz del líder **no funciona hoy**

Se comprobó en el código, no de memoria. Seis servicios comparan el rol contra `TRAINEE`
**literal** y lanzan 403, sin mirar si la persona tiene una participación activa:

| Servicio | Línea | Mensaje literal |
|---|---|---|
| `rocks/.../RocaMaestraService` | `:81` | `Solo un aprendiz opera sus propias rocas` |
| `rocks/.../RocaSemanalService` | `:182` | idem |
| `rocks/.../RocaDiariaService` | `:365` | idem |
| `rocks/.../DashboardRocasService` | `:223` | idem |
| `rocks/.../VerdugoService` | `:119` | `Solo un aprendiz registra sus propios eventos Verdugo` |
| `habits/.../EspirituService` | `:350` | `Espiritu es exclusivo de aprendices` |
| `habits/.../RadarService` | `:106` | `El Codigo Renaser es exclusivo de aprendices` |
| `habits/.../AudioterapiaService` | `:116` | `Audioterapia semanal es exclusiva de aprendices` |
| `academy/.../RecomendacionService` | `:107` | `Solo un aprendiz recibe recomendaciones de Academia Adaptativa` |
| `academy/.../ClaseDiariaService` | `:85-86` | `La clase diaria no esta disponible para tu cuenta` |

Todos con la misma forma:

```java
if (progreso.rol() != RolParticipante.TRAINEE) {
    throw new NotAuthorizedException("...");
}
```

**Es una contradicción interna del backend**, no una decisión: `Permission.TRACK_PROGRAM_AS_STAFF`
y `POST /api/v1/mentor/activate-tracking` existen precisamente para que un MENTOR, MENTOR_LEAD,
ADMIN o ALCHEMIST curse el programa, y la especificación del cliente §2.2 describe un
«Conmutador de Roles» entre el perfil operativo y el personal. Un líder puede **inscribirse** y
después no puede operar sus rocas ni su Espíritu.

**Consecuencia para este paquete:** `RL-01` («el líder hace lo mismo que un aprendiz») **no se
cumple hoy**, aunque DL-01 diga que esa parte «ya funciona y no se toca». Se registra como
hallazgo y **no se corrige por cuenta propia**: cambiar `rol != TRAINEE` por «tiene participación
activa» en diez servicios es una regla de negocio que el dueño tiene que confirmar
(`CLAUDE.MD` §0.6, regla 00 del repositorio). Queda anotado en `docs/BITACORA_ERRORES.md`.

## 6. Dos cosas que se llaman «semáforo» y no son la misma

- **`perfiles_mentor.estado_operativo`** (VERDE/AMARILLO/ROJO): estado operativo **de un mentor**.
  Existe hoy en la base y en el dominio. **Es el que usa este paquete.**
- **Semáforo diario del aprendiz** (Verde ≥80 %, Amarillo 60–79 %, Rojo <60 %): sale de la
  coherencia diaria, es el RF-24/RF-25 de la especificación del cliente y **todavía no está
  implementado** (`docs/CUMPLIMIENTO_REQUISITOS.md:50,128`).

No se mezclan, no comparten umbrales y no se derivan uno del otro. Cuando este paquete dice
«semáforo», es siempre el primero.

## 7. Fuente normativa que hay que consultar antes de fijar los permisos

`docs/spec/Especificacion_Requisitos_Renaser_OS.docx` (v2.0, 2026-08-26) contiene **la matriz de
los 5 roles** del producto, y `docs/spec/README.md` la declara fuente de reglas de negocio —no de
arquitectura—. La fila de `MENTOR_LEAD` de este paquete **debe contrastarse contra esa matriz
antes de escribirse**. Si el documento ya dice qué puede hacer un líder de mentores, manda el
documento; lo que aquí se propone se ajusta. Si no lo dice, se pregunta al dueño del proyecto.
**No se inventa** (regla 00 del repositorio, `CLAUDE.MD` §0.6).

## 8. Antes de implementar

Revalidar HEAD, reglas y contratos de ambos repos. Si el 001 ya aterrizó algo de lo que aquí se
da por ausente —el historial de asignaciones, el motor de cumplimiento, el gate de navegación—
**reutilizarlo y recortar este plan**, no construirlo de nuevo. Si aparece una corrección
adyacente que no es requisito de este paquete, se reporta aparte; no se amplía el alcance.
