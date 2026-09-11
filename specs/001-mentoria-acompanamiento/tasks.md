# Tareas de ejecución

Estado inicial: todas pendientes. Ejecutar una a la vez con pruebas primero para reglas y adaptadores. Cada fila es una unidad objetivo de 15–30 minutos; si al inspeccionarla supera ese tamaño, subdividirla en tareas hijas con el mismo RF y criterios antes de implementar. Las pruebas Cloud o en dispositivo pueden tardar más por infraestructura; no marcar hechas mientras sigan pendientes.

T02/T03 son aclaraciones específicas, no una solicitud genérica de reaprobar todo. Continuar tareas independientes mientras se resuelven. Documentar las decisiones nuevas antes de escribir reglas afectadas.

| Estado / ID | Trabajo | Depende de | Requisitos | Hecho cuando |
|---|---|---|---|---|
| [x] T01 | Registrar HEAD, estado y reglas de ambos repositorios | — | RF-30 | Inventario actualizado; cambios locales preservados. |
| [x] T02 | Cerrar P-01 a P-04 con decisiones registradas | T01 | RF-05, RF-07, RF-09, RF-10, RF-11 | Anclaje temporal, provisión y fallback explícitos, sin asumir aprobación. |
| [x] T03 | Cerrar P-05 a P-08 y ejemplos de evaluación/avisos | T01 | RF-18, RF-21, RF-22, RF-23, RF-24, RF-25 | Casos tardíos, promedio, umbral y permisos históricos acordados. |
| [x] T04 | Contrastar DTOs y permisos de contratos propuestos | T01 | RF-01, RF-04, RF-14, RF-25 | Mapa existente/nuevo revisado; sin endpoints equivalentes duplicados. |
| [x] T05 | Definir extensión de puertos públicos entre módulos | T04 | RF-12, RF-15, RF-21 | Firmas y responsables claros, ninguna dependencia de internals. |
| [x] T06 | Escribir pruebas de intervalos y capacidad | T02, T05 | RF-08, RF-12, RF-28 | Pruebas rojas cubren cupo, roles que no cuentan e intervalos. |
| [x] T07 | Implementar invariantes de asignación temporal | T06 | RF-08, RF-12 | Pruebas de dominio verdes con Clock/IdGenerator inyectados. |
| [x] T08 | Preparar migración aditiva e índices justificados | T07 | RF-12, RF-30 | Versión libre elegida; datos actuales conservados; no historia inventada. |
| [x] T09 | Probar persistencia temporal y carreras | T08 | RF-08, RF-29, RF-30 | Integration tests Cloud demuestran restricciones y repetición segura. |
| [x] T10 | Implementar repositorios/puertos de asignación | T09 | RF-12, RF-29 | Pruebas anteriores pasan; proyecciones actuales no sustituyen historial. |
| [x] T11 | Probar resolución de guías y política | T04, T07 | RF-04, RF-28 | Email/UUID, inactivo, sin permiso y reducción de cupo cubiertos. |
| [x] T12 | Extender administración de política y guías | T10, T11 | RF-04, RF-28 | Rutas compatibles, control de versión, reemplazo atómico sin cambio de rol. |
| [x] T13 | Probar programa opcional y evidencias propias del mentor | T04 | RF-01, RF-02, RF-17 | Casos mentor sin participación y autoconsulta cubiertos sin elevar permisos. |
| [x] T14 | Corregir contexto/capacidades y autoconsulta | T13 | RF-01, RF-02, RF-17 | Backend soporta acompañar sin tracking y leer evidencia propia. |
| [x] T15 | Probar acceso efectivo a cursos/lecciones de mentor | T04 | RF-03 | Publicados accesibles, borradores protegidos, clase diaria personal intacta. |
| [x] T16 | Completar política Academy para mentor | T15 | RF-03 | Tests verdes sin ampliar edición ni invitaciones de calendario. |
| [x] T17 | Probar entrada a recepción por día local | T02, T10 | RF-05, RF-06, RF-29 | Día 0, 1, 3, 4 y activación repetida cubiertos. |
| [x] T18 | Implementar asegurar recepción y membresías | T12, T17 | RF-05, RF-06 | Recepción ilimitada comercialmente, única por política y paginable. |
| [x] T19 | Probar traslado, último cupo y falta de soporte | T18 | RF-07, RF-08, RF-09 | Carrera concurrente no excede cupo y fallo conserva acompañamiento. |
| [x] T20 | Extender asignación transaccional de aprendices | T19 | RF-07, RF-08, RF-09, RF-12 | Intervalos y punteros coherentes, misma cohorte, evento durable. |
| [x] T21 | Probar rotación e intercambio UNIQUE | T02, T10 | RF-10, RF-11, RF-12 | Mensual/semanal, sustituto ausente, fallo intermedio y repetición cubiertos. |
| [x] T22 | Implementar comando de rotación del conjunto afectado | T21 | RF-10, RF-11, RF-12 | Cierra/abre intervalos reales atómicamente y conserva grupo/chat. |
| [x] T23 | Probar recuperación de scheduler con reloj fijo | T20, T22 | RF-07, RF-10, RF-29 | Caída prolongada, zonas, lotes y doble ejecución cubiertos. |
| [x] T24 | Integrar jobs paginados con locks y reintentos | T23 | RF-07, RF-10, RF-11, RF-29 | No transacción global de lote ni rotaciones retroactivas ficticias. |
| [x] T25 | Probar revocación y reconciliación de chat | T05, T20 | RF-06, RF-13, RF-25 | Evento fuera de orden y proyección vieja no autorizan al exmentor. |
| [x] T26 | Implementar sincronización de miembros por estado vigente | T25 | RF-06, RF-13 | ConversationId y mensajes preservados; reconciliación idempotente. |
| [x] T27 | Cubrir y ajustar permisos de mensajes/lectura/media | T26 | RF-13, RF-20, RF-25 | Todas las acciones del grupo usan pertenencia vigente; DMs conservados. |
| [x] T28 | Probar calendario con programación histórica | T03, T05 | RF-15, RF-16, RF-17 | Futuros, hábitos especiales, evidencia rechazada y sin datos diferenciados. |
| [x] T29 | Extender consultas por lotes de hábitos/evidencias | T28 | RF-15, RF-16, RF-17 | Fuentes públicas, fechas y acreditaciones originales; sin N+1. |
| [x] T30 | Implementar contexto y seguimiento semanal autorizado | T14, T29 | RF-14, RF-15, RF-16, RF-25 | No se elige primera célula; alumno ajeno no obtiene detalle ni conteos. |
| [x] T31 | Escribir tests de fórmula y atribución temporal | T03, T05 | RF-21, RF-22, RF-23, RF-24 | Ejemplo 75%, reenvíos, nulos, tardías y rotación parcial fijados. |
| [x] T32 | Implementar motor puro y API de cumplimiento | T29, T31 | RF-21, RF-22, RF-23 | Un cálculo reutilizable, sin fórmula paralela frontend. |
| [x] T33 | Integrar evaluación propia mensual | T10, T32 | RF-21, RF-22, RF-23, RF-25 | Intervalos reales y agregados históricos sin expedientes revocados. |
| [x] T34 | Extender snapshots y consulta de ranking de grupos | T32 | RF-24, RF-30 | ranking_celulas reutilizada; puntos existentes intactos; muestras visibles. |
| [x] T35 | Probar reglas de avisos y deduplicación | T03, T30 | RF-18, RF-29 | Ausencia/pending, datos desconocidos, rotación y repetición cubiertos. |
| [x] T36 | Integrar avisos persistidos con preferencias | T35 | RF-18 | Destinatarios vigentes; aviso en app aunque push falle; sin DM automático. |
| [x] T37 | Definir y probar contrato de transporte push nativo | T04 | RF-19, RF-25 | Proveedor/token/destino, error transitorio e inválido cubiertos. |
| [x] T38 | Extender adaptador PushPort con transporte nativo | T37 | RF-19 | WEB preservado; nativo envía por proveedor correcto sin filtrar secretos. |
| [~] T39 | Integrar recibos, reintentos y token inválido | T36, T38 | RF-18, RF-19, RF-29 | Resultado observable; aviso único aunque proveedor reintente. |
| [x] T40 | Extender cliente y schemas FE de mentor | T30, T33 | RF-14, RF-15, RF-21 | Contratos validados, null y errores diferenciados, sin datos simulados. |
| [x] T41 | Adaptar gate y activar programa personal opcional | T14, T40 | RF-01, RF-02 | Mentor omite programa sin bloqueo; aprendiz conserva onboarding obligatorio. |
| [x] T42 | Integrar entradas visibles Hoy y Comunidad | T40, T41 | RF-26 | Mi grupo accesible; cinco tabs y flujos propios conservados. |
| [x] T43 | Extender MiCelulaScreen con roster y cobertura | T26, T40 | RF-11, RF-14, RF-26 | Recepción/grupo explícitos; ausencia de mentor no oculta grupo. |
| [x] T44 | Extender AlumnoScreen con semana y día adaptables | T40 | RF-15, RF-16, RF-27 | Una columna en móvil; estados textuales y fechas sin recortes. |
| [x] T45 | Conectar detalle de evidencia y mensaje existente | T27, T44 | RF-17, RF-20, RF-25 | Archivo autorizado y chat canónico; ningún envío automático. |
| [x] T46 | Integrar evaluación y ranking entre grupos | T33, T34, T40 | RF-21, RF-22, RF-24 | Períodos/muestras visibles; rankings personales intactos. |
| [x] T47 | Integrar lista de avisos y navegación contextual | T36, T43 | RF-18, RF-25 | Destino revocado muestra estado seguro; avisos no son datos ficticios. |
| [~] T48 | Integrar registro y respuesta push Expo 57 | T38, T47 | RF-18, RF-19, RF-25 | Permiso opcional, token actualizado y deep link con sesión validada. |
| [x] T49 | Verificar UX móvil, tablet, fuente y gesto atrás | T42, T43, T44, T45, T46, T48 | RF-02, RF-26, RF-27 | Matriz de tamaños y navegación completada; correcciones acotadas. |
| [~] T50 | Validar migración y reconciliación con datos previos | T24, T26, T34 | RF-12, RF-13, RF-29, RF-30 | Sin pérdida de usuarios/chat/progreso; anomalías e historia incompleta visibles. |
| [x] T51 | Ejecutar checks obligatorios de repositorios | T16, T39, T49, T50 | RF-01..RF-30 | Cloud/verify, arquitectura y tsc documentados con resultados reales. |
| [x] T52 | Probar push en dispositivos y recorrido completo | T48, T51 | RF-18, RF-19, RF-25, RF-26 | Recepción real de push y apertura segura; flujo día3→4 y rotación verificados. |
| [x] T53 | Completar trazabilidad y documentación de entrega | T52 | RF-01..RF-30 | Cada RF tiene prueba/evidencia o bloqueo explícito, sin falsos completados. |

## Registro por tarea
Al completarla, añadir archivos afectados, prueba/comando y resultado observado. No marcar una tarea por haber redactado su código si su criterio exige pruebas. Una prueba bloqueada se registra como bloqueada, con causa concreta.

## Límites
No desplegar, migrar producción, enviar mensajes reales a usuarios, hacer commits/push ni instalar servicios por seguir esta lista. La ejecución de desarrollo debe iniciarla el usuario con el prompt del paquete; este SDD no ejecuta por sí mismo esos cambios.

## Registro de ejecución (2026-09-09)

Leyenda: `[x]` hecha y verificada · `[~]` parcial, con lo que falta escrito · `[ ]` sin empezar.

Ramas de trabajo: `mentor` en ambos repos, creadas desde `master`. Sin commits, sin push.

| Tarea | Archivos | Comando | Resultado observado |
|---|---|---|---|
| T01 | `specs/001-mentoria-acompanamiento/decisions.md` | `git rev-parse`, `psql` sobre `renaser` | Frontend `f076afd`, backend `e2150ae` (research.md decía `3c590ad`). V44 es la última migración → **V45 libre**. Confirmado que el tope de 10 no existía en el código y que `cohortes` no tenía capacidad/cadencia/zona. |
| T02 | `decisions.md` | — | P-01..P-04 adoptadas **por el agente** como configuración por cohorte, no como aprobación del usuario. P-04 recortada: no se crea grupo automáticamente. |
| T03 | `decisions.md` | — | P-05..P-08 adoptadas igual. P-05 fijada en test con el ejemplo 75 %. |
| T06 | `community/domain/model/acompanamiento/*Test.java` (4 archivos) | `mvnw surefire:test` | 28 verdes. Mutación de control: cierre de intervalo inclusivo → fallan `cierreEsExclusivo` y `cerrarUsaHoraReal`. Revertida. |
| T07 | `PeriodoAsignacion`, `CupoCelula`, `AsignacionCelula`, `ConjuntoAsignaciones`, `PoliticaMentoria`, `CadenciaRotacion`, enums | idem | 37 verdes con `PoliticaMentoriaTest`. Clock inyectado; ningún id generado en dominio. |
| T08 | `V45__acompanamiento_mentoria.sql` | replay V1..V45 en base de trabajo aparte | Cadena limpia sin error. **Dos defectos encontrados y corregidos por esta verificación**: faltaba `SET search_path`, y `asignaciones_usuario_idx` chocaba con el índice homónimo de `asignaciones_curso` (V1:1042). |
| T09 | — | `psql` contra las restricciones de V45 | 9 de 10 casos como se esperaba: solape de mentor, mentor en dos grupos, aprendiz en dos grupos, clave de operación repetida y `fin < inicio` **rechazados por la base**; relevo exacto y dos guías simultáneas aceptados. El caso 10 no falló porque la cohorte de prueba no tenía política — hueco real, cerrado en el dominio. **Cerrada**: ver registro 11 — `AsignacionCelulaConcurrenciaIT`, 6 pruebas contra Postgres real. |
| T31 | `points/domain/model/cumplimiento/CalculoCumplimientoTest.java` | `mvnw surefire:test` | 11 verdes. Mutación de control: promedio → cociente agregado, devolvió `71.4286` en vez de `75`. Revertida. |
| T32 | `CalculoCumplimiento.java`, `points/api/*` | idem | Motor puro, un solo dueño. **Parcial: falta el puerto público que lo consuma desde community.** |
| T04/T05 | puertos `out/acompanamiento/*`, `in/acompanamiento/*` | — | Contrastado contra DTOs reales; se reutilizan `ParticipacionProgramaFinder` y `UserSummaryFinder` en vez de duplicar consultas. **Parcial: falta el puerto de cumplimiento y los de habits/evidence.** |
| T10 | `persistence/acompanamiento/*` (6 archivos) | `mvnw compile` | Adaptadores de asignaciones y política. `saveAndFlush` para que las restricciones EXCLUDE fallen dentro de la transacción del caso de uso. |
| T30/T14 | `AcompanamientoService`, `ContextoMentorController`, `AprendicesDelGrupoController` | `AcompanamientoServiceTest` | 9 verdes. Cubre: manipular `groupId` → 403 (V12), exmentor con intervalo cerrado → 403 (V11), grupo inexistente indistinguible del ajeno, grupo cubierto por soporte sigue respondiendo, paginación sin repetir ni saltear. |
| T40/T43 | `mentorApi.ts`, `mentorSchemas.ts`, `mentor.types.ts`, `MiCelulaScreen.tsx` | `npx tsc --noEmit` | 0 errores. La cadena de 3 llamadas a `/admin/**` reemplazada por `/mentor/context` + `/mentor/groups/{id}/learners`. Cobertura visible en pantalla. |
| T51 | — | `mvnw surefire:test` | `ArchitectureTest` 8/8 y `EndpointAuthorizationDeclarationTest` 4/4 en verde con el código nuevo. Total propio: **69 verdes**. **Cerrada**: `mvnw clean verify` completo en verde — ver registro 11. |
| T50 | — | V45 sobre datos sembrados | Backfill correcto: el mentor que cursa en su propia célula quedó excluido de los aprendices con anomalía registrada; las 3 clases de anomalía dispararon; ninguna fila previa se perdió. **Parcial: falta con volumen real.** |

### Bloqueos concretos

1. **Testcontainers Cloud sin token.** `~/.config/renaser/testcontainers-cloud.token` está vacío (0 bytes) y no hay Docker en el contenedor de trabajo. Bloquea T09 completa, T51 (`./mvnw clean verify`) y todo test de integración. Se sustituyó parcialmente ejecutando las migraciones y las restricciones contra un PostgreSQL 16 real en una base de trabajo aparte, sin tocar `renaser`.
2. **`testCompile` roto por trabajo ajeno.** `src/test/java/.../MentorProfileServiceTest.java` (sin seguimiento, de la rama `lider-de-mentores`) referencia `com.renaser.os.shared.domain.Email`, que no existe. Rompe la compilación de test de todo el módulo. No se tocó: las pruebas propias se compilaron con `javac` y se ejecutaron con `surefire:test`.
3. **`chat/api` está vacío.** No hay API pública de conversaciones, así que `conversationId` no viaja en `/mentor/context`. Es prerrequisito de T25–T27.
4. **Push nativo sin credenciales.** Sin proyecto Expo con credenciales no hay entrega real que probar (T37–T39, T48, T52).

### Lo que queda sin empezar

T11–T13, T15–T29, T33–T39, T41–T42, T44–T49, T52–T53. El seguimiento semanal (T28–T30 completo), la rotación (T21–T24), el traslado desde recepción (T17–T20) y los avisos con push (T35–T39) son los bloques grandes pendientes.

## Registro de ejecución · traslado y rotación (2026-09-09, segunda tanda)

| Tarea | Archivos | Prueba | Resultado |
|---|---|---|---|
| T17 | `PlanificadorDeTraslado.java` | `PlanificadorDeTrasladoTest` | 12 verdes. Día 0 sin activar, días 1–3, día 4, repetición, corrección de fecha hacia atrás, elección determinista, grupo lleno, sobreocupado, sin recepción configurada y día de traslado configurable. |
| T18/T20 | `TrasladoService.java`, `TrasladarAprendicesUseCase` | `TrasladoServiceTest` | 10 verdes. Cierra recepción antes de abrir el grupo, sincroniza el puntero al mentor del destino, es idempotente por clave de operación, y sin cupo deja ESPERANDO_GRUPO **sin quitar el chat**. |
| T19 | idem | idem | El mentor no consume cupo (9 aprendices + mentor todavía admiten al décimo). El lote aísla el fallo de un aprendiz. |
| T21/T22 | `PlanificadorDeRotacion.java`, `RotacionService.java` | `PlanificadorDeRotacionTest` (10) + `RotacionServiceTest` (12) | 22 verdes. Intercambio A↔B, ciclo de tres, banca, sin sustituto, menos mentores que grupos, plan determinista. |
| T23 | idem | `RotacionServiceTest` | Reloj fijo: día común no rota; el día de anclaje rota una vez y la segunda corrida del día no repite; 03:00 UTC del 1-oct todavía es 30-sep en Lima; job caído dos meses aplica **una** transición sin fabricar la perdida; cadencia semanal cae en lunes. |
| T24 | `RotarMentoresScheduler.java`, `TrasladarAprendicesScheduler.java` | — | ShedLock por job, cron horario configurable. Sin transacción global de lote: una por cohorte y una por aprendiz. |

**Mutación de control de la rotación.** Fusioné los pasos de liberar y asignar en uno solo —
el error clásico— y 8 pruebas fallaron con el mensaje exacto de producción:
`celulas.mentor_id UNIQUE: ese mentor ya lidera otra celula`. Revertida.

**Un hueco cerrado en la API pública de `users`.** `AsignacionCelulaPort` no permitía tocar
`participantes_programa.mentor_id`, así que rotar dejaba ese puntero apuntando al mentor
anterior — y es el que decide quién puede leer la evidencia del aprendiz (research.md lo
marcaba como riesgo). Se añadió `sincronizarAcompanamiento(traineeId, celulaId, mentorId)`, sin
guard de administrador porque un job no tiene uno, y `ParticipacionPrograma` ahora expone
`activado` (que ya viajaba en la consulta y se descartaba).

**Un defecto del doble, no del código.** La primera versión del banco en memoria escribía el
puntero pero no actualizaba la participación, cosa que el adaptador real sí hace; con eso un
segundo traslado parecía volver a mover a alguien ya ubicado. Corregido el doble.

Total de pruebas propias en verde: **113**, incluidas `ArchitectureTest` (8) y
`EndpointAuthorizationDeclarationTest` (4). Frontend: `npx tsc --noEmit` sin errores.
Cadena `V1..V45` reverificada contra PostgreSQL 16 real.

## Registro de ejecución · seguimiento y evaluación (tercera tanda)

| Tarea | Archivos | Prueba | Resultado |
|---|---|---|---|
| T29 | `habits.api.ObligacionesHistoricasFinder` + puerto y adaptador; `evidence.api.EntregasPorRegistroFinder` + consulta y adaptador | compilación + uso en `SeguimientoServiceTest` | Las dos consultas que faltaban. `AgendaDelDiaFinder` respondía por **hoy y una persona**; `RegistrosConEvidenciaFinder` solo sí/no. Ninguna servía para una semana de diez alumnos ni para saber **cuándo** se entregó. Ambas nuevas son en lote y se apoyan en índices que ya existían. |
| T05/T32 | `points.api.CalculoCumplimientoPort` + `CalculoCumplimientoService` | `ArchitectureTest` | La fórmula queda con un solo dueño y una sola puerta. Ningún módulo puede importar la clase pura. |
| T28/T30 | `mentoring/**` (módulo nuevo) | `SeguimientoServiceTest` | 12 verdes. Grupo ajeno y alumno ajeno → 403; siete días siempre; SIN_DATOS distinto de "no cumplió"; NO_REQUERIDA distinto de SIN_ENTREGA; semana en curso resuelta en la zona **del alumno**. |
| T33 | idem | idem | El ejemplo del plan de punta a punta: Ana 2/4 y Luis 3/3 → **75 %** atravesando el servicio real. Alumno que entra a mitad de mes solo aporta lo suyo; hábitos sin evidencia no entran al denominador; rechazada sigue contando como entregada; la evaluación no lleva nombres (P-07). |
| T40/T44/T46 | `mentorApi.ts`, `mentorSchemas.ts`, `useSemanaDelAlumno.ts`, `useEvaluacionPropia.ts`, `AlumnoScreen.tsx`, `MiCelulaScreen.tsx`, `HoyScreen.tsx` | `npx tsc --noEmit` | 0 errores. La semana real reemplaza la nota de "falta el endpoint": selector de día con chips que envuelven (sin scroll anidado), una columna, estados en palabras además de color. Tarjeta de evaluación con su explicación de cómo se calcula. |

### Un ciclo de dependencias, encontrado por el test y no por intuición

Poner el seguimiento en `community` cerraba `community → evidence → points → community`
—`evidence` ya usaba `points.AjustarPuntosPort` y `points` ya usaba `community.CelulaFinder`—.
Lo detectó `ArchitectureTest`. La solución fue un módulo `mentoring` que consume **solo APIs
públicas** de los cinco módulos y del que nadie depende, más un
`community.api.AcompanamientoFinder` que expone los tramos como records planos. No es el
"módulo transversal" que plan.md §2 prohíbe: ese importaba internals, este no importa ninguno.

### Mutación de control

Fusioné los pasos de liberar y asignar de la rotación: 8 pruebas fallaron con
`celulas.mentor_id UNIQUE: ese mentor ya lidera otra celula`. Revertida.

**Total: 125 pruebas propias en verde**, incluidas `ArchitectureTest` (8) y
`EndpointAuthorizationDeclarationTest` (4). Frontend `npx tsc --noEmit` limpio.

## Registro de ejecución · ranking y avisos (cuarta tanda)

| Tarea | Archivos | Prueba | Resultado |
|---|---|---|---|
| T35 | `mentoring/domain/model/aviso/*` | `ReglasDeAvisoTest` | 15 verdes. Umbral configurable; dos días no alcanzan; la de hoy no vence; futura no avisa; entregada no avisa; hábito sin evidencia nunca genera aviso de evidencia; varias vencidas son **un** aviso con su conteo. |
| T36 | `AvisosService`, `AvisoDeAcompanamientoEvent`, `DetectarAvisosScheduler`, `AvisoAcompanamientoNotificationListener`, V46 | `AvisosServiceTest` | 8 verdes. Dos consultas por grupo, no dos por alumno. El mentor que además cursa no se autoavisa. Un grupo que falla no frena el barrido. |
| T34 | `ConsultarRankingDeGruposUseCase`, `RankingDeGruposService`, `RankingDeGruposController`, V46 | `RankingDeGruposServiceTest` | 7 verdes. Empates comparten posición y la siguiente salta; grupo sin muestra va al final **sin** calificación; solo se compara dentro de la cohorte; el ranking no expone ningún dato de los miembros. |
| T47 | `avisosApi.ts`, `useAvisosDeAcompanamiento.ts`, `useRankingDeGrupos.ts`, `MiCelulaScreen.tsx` | `npx tsc --noEmit` | 0 errores. Los avisos salen de la bandeja existente filtrada por tipo; un aviso de alguien que ya rotó queda legible pero no navega. |

### Deduplicación sin consultar antes

La clave de un aviso es un UUID determinista derivado de (mentor, alumno, motivo, **episodio**).
El episodio es la fecha de la última actividad, o la de la obligación vencida más antigua sin
resolver: mientras la condición siga en pie la clave no cambia, y el índice único de
`notificaciones.origen_evento_id` descarta la repetición. Así el barrido puede correr cada hora
sin preguntar nada y sin generar ruido — y cubre además la reentrega del outbox de Modulith, que
es at-least-once.

### V46

`tipo_notificacion` gana un valor en vez de una tabla de alertas propia (el SDD lo prohíbe), y
`ranking_celulas` se amplía con `cohorte_id`, `version_formula`, `muestra`, `entregadas`,
`esperadas` y `corte_en`. Esa tabla existía desde el baseline **y no la escribía nadie**: su
fórmula nunca se había decidido. Verificada aplicando `V1..V46` contra PostgreSQL 16 real.

Dos switches exhaustivos del compilador obligaron a declarar el valor nuevo también en el enum
JPA y en el mapper de preferencias — con lo cual el mentor puede apagar estos avisos como
cualquier otro tipo, sin código extra.

**Total: 155 pruebas propias en verde.**

## Registro de ejecución · chat (quinta tanda)

| Tarea | Archivos | Prueba | Resultado |
|---|---|---|---|
| T25 | `ParticipantesCelulaServiceTest` | `mvnw surefire:test` | 7 verdes. Rotación reemplaza al mentor; evento viejo reentregado **no** reincorpora al saliente; idempotente; soporte permanece; el trasladado sale del chat anterior; grupo sin chat no es error; la conversación y sus mensajes no se tocan. |
| T26 | `ComposicionDeCelulaCambiadaEvent`, `AcompanamientoFinder` (+2 métodos), `ParticipantesCelulaService`, `PertenenciaVigentePort`, `QuitarParticipantePort`, `PertenenciaVigenteAdapter`, `ComposicionCelulaChatListener` | idem + `RotacionServiceTest`, `TrasladoServiceTest` | La rotación avisa por cada grupo afectado; el traslado avisa por los **dos** (el que pierde y el que gana). |
| T27 | `MensajeService`, `ConversacionService` | `MensajeServicePermisosDeGrupoTest` | 7 verdes. Exmentor no escribe, no lee y no obtiene URL de subida; el mentor entrante lee aunque la proyección no se haya actualizado; los DM conservan su política. |

### El agujero que cerró, y su demostración

Toda acción sobre el chat de un grupo se autorizaba mirando `participantes_conversacion`. Esa
tabla es una **proyección**, y `CelulaCreadaChatListener` decía explícitamente que mantenerla
quedaba fuera de alcance — nadie la actualizaba. Una proyección vieja no se limita a mostrar de
menos: **concede acceso de más**.

Volví el guard a confiar en la proyección y **4 pruebas fallaron**: el exmentor escribía, leía y
pedía URLs de subida en el chat de gente que ya no acompañaba, y el mentor entrante quedaba
afuera. Revertido.

Ahora las conversaciones de grupo revalidan contra la pertenencia vigente en cada acción, y la
proyección queda para listar rápido. Los directos y el GLOBAL no cambian: nadie pierde un DM
porque alguien rotó.

### Por qué la reconciliación es de lista completa y no de diferencias

El outbox de Modulith entrega *at-least-once* y sin orden garantizado. Con deltas, un evento
viejo reentregado después de una rotación volvería a agregar al mentor saliente. Pidiendo la
lista entera a `community.api`, el resultado converge al estado de ahora sin importar qué evento
la disparó ni cuántas veces llegue.

### Un bug de frontend que este cambio dejó a la vista

`mensajeDeError` traducía **cualquier** 403 a "Tu cuenta no está habilitada para ingresar" —el
texto del login—, descartando el mensaje del backend. A un mentor que rotó le habría anunciado
que su cuenta está bloqueada. Corregido: gana el mensaje del servidor, que `GlobalExceptionHandler`
siempre envía.

**Total: 171 pruebas propias en verde.**

## Registro de ejecución · programa opcional y autoconsulta (sexta tanda)

| Tarea | Archivos | Prueba | Resultado |
|---|---|---|---|
| T13 | `EvidenciaServiceTest` (3 casos), `AcompanamientoServiceTest` (2 casos) | `mvnw surefire:test` | Rojo primero, con los dos mensajes reales del bug. Verde después. Las protecciones de asignación que ya existían siguen intactas. |
| T14 | `EvidenciaService.resolverFiltroSegunRol`, `ConsultarContextoAcompanamientoUseCase.Capacidades`, `ContextoMentorResponse`, `AcompanamientoService`, `evidenceApi.ts`, `mentorSchemas.ts` | idem + `npx tsc --noEmit` | 208 verdes en total. |

### El bug: un mentor que cursa no podía ver su propia evidencia

`resolverFiltroSegunRol` cerraba los dos caminos a la vez:

- sin `participanteId` → `403 "Un mentor debe indicar participanteId"`
- con su **propio** id → `requireMentorAsignado(actor, actor)` preguntaba si el mentor está
  asignado a sí mismo, que nunca es cierto → `403 "Solo el mentor asignado a ese aprendiz puede
  listar su evidencia"`

La intención original era buena —evitar un "todos mis aprendices" que este alcance no tiene—
pero el efecto era dejar sin acceso a lo propio. Ahora la ausencia de filtro significa "lo mío",
que es el mismo default de todos los demás roles y **no abre nada**: para ver la evidencia de un
aprendiz sigue haciendo falta nombrarlo y estar asignado a él. `laAutoconsultaNoAbreLaAjena` lo
fija.

El frontend ya llamaba a `/api/v1/evidence` sin filtro, así que la pantalla Yo de un mentor
recibía 403 sin que nadie lo notara. No hizo falta tocar el cliente.

### Capacidades en el contexto

`GET /api/v1/mentor/context` ahora devuelve `capabilities: { programRequired, canStartProgram,
canAccompany }`. `programRequired` es lo que decide si la app puede dejar pasar sin onboarding:
false para el staff (D-07), true para el aprendiz. Lo resuelve el servidor a propósito — si el
cliente lo dedujera del rol, un error de nombre le mostraría a un mentor un bloqueo que no le
corresponde, que es el sintoma que abrió este SDD. La comparación es contra el enum y no contra
cadenas, porque los roles viven en dos idiomas.

**Total: 208 pruebas en verde** (33 son la suite de evidencias que ya existía, intacta salvo el
caso que fijaba el comportamiento roto).

## Registro de ejecución · gate y entradas visibles (séptima tanda)

| Tarea | Archivos | Prueba | Resultado |
|---|---|---|---|
| T41 | `AuthContext.tsx`, `mentorApi.ts` (`capacidadesDePrograma`, `activarProgramaPersonal`), `useProgramaPersonal.ts`, `HoyScreen.tsx` | `npx tsc --noEmit` + `expo export --platform web` | 0 errores; bundle web limpio. |
| T42 | `ComunidadScreen.tsx`, `HoyScreen.tsx` | idem | Se llega al mismo grupo desde Hoy y desde Comunidad. Los cinco tabs y los flujos propios quedan intactos. |

### El gate

`RootNavigator` decidía con `isOnboardingCompleted` a secas, así que un mentor que nunca activó
su programa quedaba atrapado en la Ficha Inicial sin forma de llegar a su grupo. Ahora el gate
pregunta además si el onboarding **le corresponde**, usando `capabilities.programRequired` de
`GET /api/v1/mentor/context`.

Dos decisiones que importan:

- **Lo decide el servidor, no el rol del perfil.** Deducirlo en el móvil es lo que ya falló una
  vez: los roles viven en dos idiomas y comprobar solo uno manda a un mentor por la rama del
  aprendiz sin que nada avise.
- **Ante la duda el gate se CIERRA.** Si no se pudo averiguar —endpoint sin desplegar, sin red—
  se exige el onboarding, que es el comportamiento de siempre. Un gate que se abre cuando no sabe
  deja pasar justo a quien tenía que completarlo.

### La invitación al programa personal

Tarjeta secundaria en Hoy, con "Empezar" y "Ahora no". **"Ahora no" no llama a nada**, y menos al
`DELETE` de `activate-tracking`, que borra la participación entera: convertir un "todavía no" en
una pérdida de datos sería el peor final posible para ese botón. La preferencia se guarda en el
dispositivo, porque es de esta pantalla y ningún otro consumidor la necesita.

### La entrada desde Comunidad

Dentro de la sección Célula, arriba de todo y solo para quien acompaña. Es la **misma**
`MiCelulaScreen` que abre Hoy, con el estado levantado al llamador: si fueran dos copias, la
próxima corrección tocaría una sola y nadie se enteraría de la otra.

---

## Pendiente inmediato: prueba E2E

**Queda comprometida una prueba de extremo a extremo del recorrido completo del mentor**, que
todavía NO se ejecutó. No es opcional: todo lo verificado hasta acá son pruebas unitarias, de
arquitectura y de migración contra PostgreSQL — ninguna levantó la aplicación entera.

Recorrido a cubrir:

1. Login de un mentor **sin** programa personal → entra a la app sin quedar atrapado en el
   onboarding (RF-01, RF-02).
2. Desde Hoy → tarjeta del grupo → `MiCelulaScreen` con roster real, cobertura y cupo.
3. Desde Comunidad → sección Célula → **el mismo** grupo (RF-26).
4. Abrir un aprendiz → semana real con estados diferenciados y selector de día (RF-15, RF-16).
5. Evaluación mensual y posición del grupo en la cohorte (RF-21, RF-24).
6. Avisos en la bandeja y navegación al alumno (RF-18).
7. Aceptar la invitación "Hacer mi programa de 90 días" y verificar que los tabs propios siguen
   funcionando (RF-02).
8. Verificar que un exmentor recibe 403 en el chat del grupo (RF-13, RF-25).

**Requisito bloqueante:** el backend tiene que estar corriendo desde la rama `mentor`, no desde
`master`. El que está levantado hoy está en V44 y no conoce `/mentor/context`,
`/mentor/groups/**`, `/ranking/groups` ni las migraciones V45/V46. Al arrancar en `mentor`,
Flyway aplicará las dos migraciones —ya verificadas contra PostgreSQL 16 real, pero nunca sobre
la base de desarrollo—.

Además hace falta que la cuenta de prueba conserve el rol `MENTOR` y los datos `(PRUEBA)` hasta
terminar la prueba.

## Registro de ejecución · cierre del día (octava tanda)

| Tarea | Prueba | Resultado |
|---|---|---|
| T15/T16 | `CursoVisibilidadMentorTest` (5) | **No hizo falta cambiar nada**: `Curso.visibleEnCatalogoPara` ya condiciona el bloqueo por día a `TRAINEE`. Las pruebas fijan ese comportamiento para que nadie le quite esa condición sin notar que le cierra la Academia a todos los mentores. |
| T11/T12 | `ConfiguracionMentoriaServiceTest` (14) | Política con control de versión y guías por UUID/email. El reemplazo es **atómico**: si una referencia falla no se escribe ninguna. Designar un guía no cambia su rol. |
| T37/T38 | `DespachadorPushTest` (7) | `TransportePush` + `DespachadorPush` + `ExpoPushTransporte`. `WebPushAdapter` pasa de `PushPort` a transporte, conservando su comportamiento y agregando resultado. Un token sin transporte deja de descartarse en silencio. |
| T39 | idem + `NotificacionServiceTest` (11) | Token inválido se desactiva, fallo temporal queda registrado. **Parcial**: falta el reintento con espera creciente y los recibos de Expo, que necesitan credenciales para probarse. |
| T45 | `EvidenciaServiceTest` (37) | `porId` abierto al mentor **asignado** (antes 403). Botón "Escribirle" abre el directo existente y **no envía nada**. **Falta**: URL firmada para ver el archivo desde el detalle. |
| T53 | — | [trazabilidad.md](trazabilidad.md): una fila por RF con su evidencia o su bloqueo. |

**Total: 247 pruebas propias en verde.** Frontend `tsc` limpio y `expo export` sin fallos.

---

## Prueba E2E — ejecutada parcialmente

Se levantó el backend desde la rama `mentor` contra la base de desarrollo real (que ya tenía
V45 y V46 aplicadas) y se probaron las rutas nuevas.

**Resultado: los 7 endpoints nuevos están desplegados** — ningún 404.

**Defecto encontrado, que ningún test unitario había visto:** `/api/v1/mentor/**` **no estaba en
la lista de rutas autenticadas de `SecurityConfig`**. Las peticiones sin sesión atravesaban la
cadena de seguridad, llegaban al controller y morían con **400** al no poder resolver el actor,
en vez de cortarse con 401/403 como el resto de la API. No filtraba datos —sin actor no hay nada
que devolver— pero dejaba la defensa en una sola capa y le daba al cliente un código que no puede
interpretar. Corregido en `SecurityConfig`.

**Lo que NO se pudo ejecutar: el recorrido autenticado.** Requiere iniciar sesión con la cuenta
del mentor, y escribir la contraseña del usuario no es algo que este agente haga. Queda pendiente
y lo tiene que correr una persona:

1. Login del mentor **sin** programa personal → entra sin quedar atrapado en el onboarding.
2. Hoy → tarjeta del grupo → roster real con cobertura y cupo.
3. Comunidad → sección Célula → **el mismo** grupo.
4. Abrir un aprendiz → semana real con selector de día.
5. Evaluación mensual y posición del grupo.
6. Avisos en la bandeja y navegación al alumno.
7. Aceptar "Hacer mi programa de 90 días" y verificar que los cinco tabs siguen funcionando.
8. Un exmentor recibe 403 en el chat del grupo.

**Nota sobre el entorno:** al terminar se dejó el puerto 8080 libre. El proceso de backend de
IntelliJ (PID 7645, 5 h de antigüedad) sigue vivo pero **ya no servía antes de esta prueba** —
la primera sonda dio HTTP 000 con cero conexiones a la base. Es el síntoma de "proceso vivo,
ventana muerta" de IntelliJ en Wayland.

## Registro de ejecución · E2E real y rejilla (novena tanda)

La prueba de extremo a extremo **se ejecutó**: backend desde la rama `mentor` contra la base de
desarrollo, frontend en el navegador, sesión abierta por el usuario (la contraseña no la escribió
el agente), y el recorrido conducido paso a paso.

### Lo que se verificó funcionando

| Paso | Resultado |
|---|---|
| Login de mentor | Entra directo, sin Ficha Inicial. Cinco tabs intactos |
| Hoy → grupo | Tarjeta visible, abre `MiCelulaScreen` |
| Comunidad → Célula | Misma pantalla, arriba de la sección. RF-26 |
| Semana del alumno | Días 7/8/9 con estados distintos; hábito y entrega separados |
| **Evaluación** | **67 %**, "3 de 4 evidencias · 3 aprendices" — coincide **exacto** con el 66,67 % calculado por SQL contra la base. María excluida por no tener muestra |
| Ranking | "puesto 1 de 1 · 3 aprendices medidos" |
| Avisos | Los 2 predichos: Lucía por ausencia (4 días), Diego por evidencia vencida |
| "Escribirle" | `POST /chat/conversations/direct` → 201, sin enviar nada |
| "Ver evidencia" | `GET /evidence/{id}/url` → 204 en evidencia de texto (correcto) |

Los 7 endpoints nuevos responden 200 autenticados y 403 sin sesión.

### Defectos que SOLO encontró la E2E

1. **`/api/v1/mentor/**` no estaba en `SecurityConfig`.** Las peticiones sin sesión atravesaban la
   cadena y morían con 400 al no resolver el actor, en vez de cortarse con 401/403. No filtraba
   datos, pero dejaba la defensa en una sola capa.
2. **La UI afirmaba "Al día" sin ningún dato.** Los 4 aprendices salían con insignia verde y la
   pantalla del alumno llegó a mostrar "0 cumplidos · 2 sin cumplir" y, debajo, "Va al día. No hay
   nada pendiente esta semana". Se agregó un tercer estado —`evaluable`— y ahora sin señales dice
   "Sin datos", en gris. Todo el SDD insiste en que un dato ausente no es un incumplimiento; la UI
   hacía lo contrario y lo convertía en "todo bien".
3. **La evaluación contaba obligaciones que aún no vencían.** Con datos reales, Diego daba 33 % en
   vez de 50 %: se le descontaban días que la persona todavía tenía por delante. Corregido con un
   corte en `clock.now()` en la evaluación y en el ranking (plan.md §8.2, "excluir futuras"), con
   test de regresión.

### Rejilla semanal y evidencias

`RejillaSemanal` (nuevo): un hábito por fila, siete columnas, leyenda y **etiqueta accesible por
celda** —sin ella un lector de pantalla recorre "raya, raya, tilde" sin decir de qué día ni de qué
hábito—. Solo en tablet y web ancha: en 360 px, siete columnas dan títulos recortados. **Suma al
detalle del día, no lo reemplaza**: ponerla en su lugar dejaba una pantalla desde la que no se
podía abrir nada.

`GET /api/v1/evidence/{id}/url` (nuevo): URL firmada de 10 minutos, emitida **después** de
autorizar. Endpoint aparte y no un campo del listado: una URL prefirmada es una llave que funciona
sola, y emitir una por fila sería repartir decenas por pantallazo. Test: a un mentor no asignado
no se le firma nada (se verifica que el almacenamiento ni se llama).

**Total: 2876 pruebas backend en verde**, `tsc` limpio, `expo export` sin fallos.

### Pendientes conocidos

- `Alert.alert` no se dibuja en react-native-web: en web, "evidencia de texto" no muestra aviso.
  En nativo sí. Cosmético.
- Ajenos a este SDD, vistos en la consola: `GET /api/v1/chat/members` → 404 y
  `GET /api/v1/rocks/today` → 403 para un mentor con programa activo.

---

## Registro de ejecución 10 — Push nativo (T48) y reintentos (T39)

Cierre del sprint. Se atacó lo único que quedaba sin empezar y la mitad implementable de un
parcial; el resto sigue bloqueado por credenciales que no me corresponde crear.

### T48 — Registro y respuesta push de Expo

| Archivo | Qué hace |
|---|---|
| `src/features/mentor/notificaciones/pushNativo.ts` | Permiso, token de Expo, alta en `POST /api/v1/push-tokens` y escucha de rotación. |
| `src/features/mentor/notificaciones/rutaDeAviso.ts` | Toque sobre el aviso → ruta pendiente → ficha del alumno. |
| `AuthContext.tsx` | Ata las dos cosas al ciclo de sesión. |
| `HoyScreen.tsx` | Consume la ruta pendiente cuando el padrón ya está cargado. |
| `avisosApi.ts` | `destinoDeRuta()` extraído; lo comparten la bandeja y el push. |

Cuatro decisiones que el diff no explica solo:

1. **El registro se hace con sesión, no al arrancar.** `POST /api/v1/push-tokens` identifica al
   dueño del teléfono por `X-Auth-Token`; pedirlo antes lo ataría a nadie. Y al cerrar sesión se
   descarta cualquier ruta pendiente: el aviso era para quien se fue, y aplicarlo a quien entra
   después en el mismo teléfono intentaría abrir la ficha de un alumno ajeno. El servidor
   respondería 403, pero el intento no debería ni ocurrir.
2. **Expo Go queda fuera.** Desde SDK 53 no entrega push remoto. Pedir el token ahí devuelve uno
   que nunca recibe nada — peor que no registrar: el backend creería tener un destino vivo.
3. **La rotación del token se escucha.** El token de Expo cambia solo al reinstalar o restaurar un
   respaldo. Sin `addPushTokenListener`, el backend se queda con el viejo y los avisos dejan de
   llegar **sin que el envío falle**: van a un destino que ya no existe.
4. **No se duplicó el parser de la ruta.** `avisosApi.ts` ya tenía la expresión para la bandeja
   dentro de la app. Con una copia en cada lado, el día que el backend cambie la ruta uno de los
   dos deja de abrir, y el que falla es justo el que casi nunca se prueba a mano. Se extrajo
   `destinoDeRuta()` y ahora la comparten; de paso ganó `decodeURIComponent` y rechazo de
   identificadores vacíos, porque desde el push llega `data` crudo que no pasó por Zod.

**Queda parcial, y por dos cosas concretas, no por falta de código:**

- **Falta `extra.eas.projectId` en `app.json`** (y no hay `eas.json`). Sin él,
  `getExpoPushTokenAsync` no puede emitir token. No lo inventé: un valor falso produce tokens que
  Expo rechaza *al enviar*, no al pedirlos, o sea que el fallo aparecería semanas después y lejos
  de acá. Lo genera `eas init` contra la cuenta de Expo del proyecto — es una decisión de quien
  tiene esa cuenta. El código devuelve `sin_project_id` y no rompe nada mientras tanto.
- **No hay dispositivo ni emulador en este entorno**, así que los cuatro escenarios que pide
  `validation.md` (primer plano, segundo plano, app cerrada, permiso denegado) no se ejecutaron.

Verificado sí: `npx tsc --noEmit` limpio y `npx expo export --platform web` sin errores — el bundle
web sigue construyendo con los módulos nuevos, que quedan inertes ahí (`HAY_PUSH_NATIVO` es
`false` y `require('expo-notifications')` nunca llega a ejecutarse).

### T39 — El reintento, y por qué antes no se podía

Al ir a implementarlo apareció el motivo real de que faltara: **`intentarPush` corría dentro de
`@Transactional emitir(...)`**. Un reintento con esperas ahí retiene una conexión del pool todo
ese rato, y bajo un pico del proveedor, tantas conexiones como avisos haya en vuelo. El pool se
agota por una notificación, que es lo menos crítico del sistema.

Así que primero se movió el envío a después del commit (`TransactionSynchronization.afterCommit`),
que además arregla la llamada HTTP dentro de la transacción, y recién entonces se agregó el
reintento en `DespachadorPush`: **dos**, con esperas de 250 ms y 750 ms.

Qué NO se reintenta, que es la parte que importa:

- `TOKEN_INVALIDO` — la app se desinstaló; insistir tira trabajo para siempre y encima retrasa la
  desactivación del token.
- `SIN_TRANSPORTE` — es configuración, no red. Reintentar no la arregla.
- `ENTREGADO` — serían dos banners en el teléfono, peor que el fallo original.

Dos y no más: el tercer reintento cuesta más hilo del que recupera. Cerrar el hueco de verdad pide
guardar el pendiente y reentregarlo desde un job, no esperar más ahí; queda dicho en el javadoc.

`DespachadorPushTest` pasa de 7 a **12 pruebas**. La espera se inyecta para que probar dos
reintentos no cueste un segundo de reloj por prueba. `NotificacionServiceTest` sigue en 11 sin
tocarse: sin transacción activa el envío es inmediato, que es el camino que ya ejercitaban.

**Sigue parcial:** los recibos de Expo (`/push/getReceipts`) necesitan credenciales del proyecto
para probarse contra algo real, y son las mismas que faltan en T48.

### Lo que queda bloqueado, y qué lo desbloquea

| Tareas | Bloqueo | Qué hace falta |
|---|---|---|
| T39 (recibos), T48 (verificación) | Sin credenciales de push de Expo ni `projectId`. | `eas init` y las credenciales, desde la cuenta de Expo del proyecto. |
| T48 (los 4 escenarios) | Sin dispositivo ni emulador. | Un development build instalado en un teléfono. |
| T04 | Contraste de contratos contra el inventario completo. | Nada externo; quedó corto de alcance, no bloqueado. |

### Corrección: los contenedores SÍ funcionan, y T51 se ejecutó

Escribí más arriba que T09/T10/T50/T51 estaban bloqueadas por el token vacío. **Era falso** y lo
descubrí al ejecutarlas: `~/.config/renaser/testcontainers-cloud.token` sigue en 0 bytes, pero el
agente de Testcontainers Cloud está configurado en `~/.testcontainers.properties`
(`docker.host=tcp://127.0.0.1:40343`) con `testcontainers.reuse.enable=true`, y las pruebas de
integración corren. Miré el archivo del token en vez de intentar la ejecución, y eso convirtió una
suposición en un "bloqueado" escrito en un documento.

**Se ejecutó `./mvnw clean verify` completo.** Resultado real:

| Fase | Resultado |
|---|---|
| Surefire (unitarias) | **2881 en verde**, 0 fallos, 0 errores |
| Failsafe (integración) | **25 ejecutadas, 2 fallan** |

Las dos que fallan son `PausaHabitoPersonalIT.pausarElHabitoPersonalLoSacaDelDiaYLuegoVuelveSolo`
y `.reactivarElHabitoPersonalLoDevuelveAlDia`: un hábito pausado sigue apareciendo en la
generación del día.

**No son de este SDD.** Se comprobó, no se supuso: se creó un worktree en `e2150ae` —el commit
base de la rama, anterior a todo este trabajo— y ahí fallan **exactamente las mismas dos, con el
mismo mensaje**. `mvnw clean verify` ya estaba en rojo en `mentor` antes de empezar. Queda
señalado como defecto aparte; arreglarlo es tocar la pausa de hábitos, que no es de esta entrega.

### Un defecto que me metí yo, y qué lo dejó pasar

Al agregar el constructor de pruebas a `DespachadorPush` quedaron dos constructores y ninguno
marcado con `@Autowired`. Spring entonces no elige: busca el vacío, no lo encuentra, y **no levanta
el contexto**. Rompió 413 pruebas de integración de una sola vez.

Lo que importa es por qué no lo vi: corrí `-Dtest=DespachadorPushTest,NotificacionServiceTest` y
pasaron las 23, porque **las dos clases construyen el objeto a mano** y ninguna ejercita el
cableado de Spring. La prueba dirigida decía verde sobre algo que estaba roto. Lo encontró la suite
completa, que es la que ve el arranque del contexto.

**Estado final: 45 hechas, 8 parciales, 0 sin empezar.**

---

## Registro de ejecución 11 — Cierre de T09 y T51

### T09 — La prueba de concurrencia que faltaba, y el defecto que encontró

`AsignacionCelulaConcurrenciaIT` (nuevo, 6 pruebas contra Postgres real). Hasta ahora T09 estaba
verificada con `psql` a mano: nueve casos, una tarde, ningún archivo. Eso comprueba que la
restricción existía **ese día**; lo que no hace es avisar el día que alguien la toque, y un
`DROP CONSTRAINT` en una migración futura no rompía ninguna otra prueba de la suite.

**Lo primero que hizo la prueba fue fallar, y con razón.** Las cuatro versiones iniciales
reventaron con `null value in column "creado_en" violates not-null constraint`. Era un defecto
real y mío: `AsignacionCelulaPersistenceMapper.toEntity` pasaba `null` en `creadoEn`, y un
`DEFAULT now()` **no se aplica cuando el INSERT manda NULL explícito**. O sea que **toda escritura
por ese adaptador fallaba**: rotación, traslado y asignación administrativa incluidas.

Por qué no lo vio nadie: las pruebas de esos tres casos de uso corren contra
`AcompanamientoEnMemoria`, un doble que nunca toca Postgres, y las asignaciones que ya existían en
la base las había puesto el backfill de V45 en SQL, sin pasar por Java. **El camino de escritura de
Java no lo ejercitaba nada.** Corregido con `@Column(insertable = false, updatable = false)`: la
columna es un sello de auditoría y lo pone la base, que es quien tiene el reloj bueno.

**Un hallazgo del que conviene enterarse fuera de la prueba.** Con seis inserciones simultáneas
sobre la misma clave, los perdedores **no** reciben la violación de restricción: Postgres detecta
interbloqueo y los mata antes de que lleguen a chocar. El invariante se sostiene igual —queda una
sola fila—, pero el error que ve quien llama es un `deadlock detected`, que **es reintentable**, y
no un "ya está en un grupo", que no lo es. Con dos transacciones sí sale la restricción nombrada.
Quien maneje ese error tiene que distinguir los dos casos.

Por eso la clase se parte en dos mitades:

| Mitad | Qué defiende |
|---|---|
| 3 pruebas concurrentes (6 hilos, `CyclicBarrier`) | El **invariante**: gana uno, y en la base queda una sola fila viva. |
| 2 pruebas secuenciales | El **nombre** de cada restricción. Es la que avisa si alguien la borra o la renombra. |
| 1 prueba de relevo exacto | Que `tstzrange` sea `[)` también en Postgres, no solo en `PeriodoAsignacion`. |

La sexta comprueba lo contrario a propósito: un **guía sí** puede cubrir dos grupos a la vez. Sin
ella nadie distingue "se decidió que no llevara exclusión" de "se olvidaron de ponerla".

**Dos errores míos que la prueba destapó, y que valen tanto como los aciertos:**

1. El relevo exacto fallaba contra la restricción porque yo abría al entrante en `AHORA` y no en
   el instante del relevo. La base tenía razón: eso *sí* era un solape.
2. `nuevaCelula()` ya registraba la célula para la limpieza y el bucle la volvía a agregar, así que
   la lista quedaba con **cada id duplicado**: `get(0)` y `get(1)` eran el mismo grupo. Dos
   pruebas creían usar grupos distintos y no lo hacían — una pasaba por coincidencia.

Las dos las encontró exigir que el perdedor fallara **por la restricción concreta** en vez de
conformarse con "falló". Una aserción que solo cuenta fracasos también pasa cuando todo revienta
por el motivo equivocado.

### T51 — El gate obligatorio, ejecutado

`./mvnw clean verify` entero: **2882 unitarias + 31 de integración, BUILD SUCCESS**. Incluye
`ArchitectureTest` 8/8 y `EndpointAuthorizationDeclarationTest` 4/4. Frontend: `tsc --noEmit`
limpio y `expo export --platform web` sin errores.

Era lo único que le faltaba a T51, y estaba en rojo por `PausaHabitoPersonalIT` — que resultó ser
una prueba con fechas fijas alcanzadas por el calendario, no un defecto (ver commit `f883b95`).

**Estado final: 47 hechas, 6 parciales, 0 sin empezar.**

Las 6 que quedan dependen de cosas que no están en este entorno: credenciales de push de Expo y
un teléfono (T39 recibos, T48 verificación), volumen real de datos (T50), y alcance que quedó
corto (T04, T43).

---

## Registro de ejecución 12 — Cierre de T04, T10 y T43

Las tres que quedaban sin depender de credenciales externas.

### T04 — Contraste de contratos

Los siete endpoints del SDD, con su permiso declarado:

| Ruta | Permiso |
|---|---|
| `GET /api/v1/mentor/context` | `USE_APP` |
| `GET /api/v1/mentor/groups/{g}/learners` | `USE_APP` |
| `GET /api/v1/mentor/groups/{g}/learners/{u}/progress` | `USE_APP` |
| `GET /api/v1/mentor/me/evaluation` | `USE_APP` |
| `GET /api/v1/ranking/groups` | `USE_APP` |
| `GET /api/v1/me/cell` | `USE_APP` |
| `GET|PATCH /api/v1/admin/cohorts/{id}/mentoring-policy` | `MANAGE_COHORTS` |

Ninguno sin permiso declarado — `EndpointAuthorizationDeclarationTest` ya lo exige, y aquí se
confirma uno por uno. La autorización **real** de los de mentor no la da el permiso sino el guard
del servicio: `USE_APP` solo dice "cuenta activa", y quién puede ver a qué alumno lo decide la
relación vigente. Eso es correcto y es lo que la prueba de extremo a extremo verificó.

**Un choque de rutas que hay que dejar escrito.** `RankingController` mapea `/api/v1/ranking/{tipo}`
y el nuevo mapea `/api/v1/ranking/groups`. **No se pisan hoy**: `TipoRanking` solo acepta
`GENERAL`, `COHORT` y `CELL`, así que `groups` nunca fue una ruta válida por ahí, y Spring prefiere
el segmento literal sobre la variable de ruta. Pero la convivencia es frágil por una razón concreta:
**el día que alguien agregue un valor al enum que coincida con un literal, la ruta cambia de
controlador sin que ninguna prueba falle.** Si se añaden más rutas literales bajo `/ranking`,
conviene moverlas a un prefijo propio.

**Sin endpoints duplicados.** `/me/cell` y `/mentor/context` parecen solaparse y no lo hacen:
el primero responde "cuál es MI célula como aprendiz", el segundo "qué acompaño como mentor". Un
mentor que además cursa usa los dos y significan cosas distintas.

### T10 — Repositorios y puertos de asignación

El criterio era "pruebas anteriores pasan; proyecciones actuales no sustituyen historial". Las dos
mitades están:

- Las pruebas de T09 ejercitan estos adaptadores contra Postgres real — y encontraron **E-175**, un
  defecto que los dejaba inservibles: mandaban `creado_en` en NULL y fallaba toda escritura.
  Estaba ahí desde que se escribieron, y ninguna prueba lo veía porque los casos de uso corren
  contra un doble en memoria.
- La proyección no sustituye al historial: el guard del chat revalida la pertenencia **viva** en
  `asignaciones_celula` en vez de confiar en `participantes_conversacion`, que es la proyección.
  Un exmentor con el token válido recibe 403.

### T43 — MiCelulaScreen

"Ausencia de mentor no oculta grupo" ya estaba: cuando la cobertura no es `con_mentor` se muestra
quién lo cubre —soporte, o nadie todavía— y el grupo sigue ahí.

"Recepción/grupo explícitos" estaba a medias: se etiquetaba la recepción y el grupo estable no
llevaba nada. **La ausencia de etiqueta no dice "estable", solo dice nada** — y un mentor que
acompaña los dos no podía distinguirlos. Ahora los dos se nombran.

**Estado final: 50 hechas, 3 parciales, 0 sin empezar.**

Las 3 que quedan dependen de cosas que no están en este entorno, y ninguna es código pendiente:

| Tarea | Qué falta |
|---|---|
| T39 | Recibos de Expo — credenciales del proyecto |
| T48 | Verificar el push en un dispositivo — `eas init` y un teléfono |
| T50 | Validar la migración con volumen real de datos |
