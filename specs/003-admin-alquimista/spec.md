# Especificación funcional — revisión 2

Prioridad: clarifications.md resuelve las contradicciones con el plan anterior.
Actores: ADMIN y ALCHEMIST usan las mismas vistas de Administración bajo autorización del servidor; ambos pueden cursar opcionalmente.

## ARF-01 — Entrar a Administración y volver

Desde Hoy y Yo, el actor autorizado abre Administración. El acceso no depende de tener programa personal iniciado. No se agrega sexto tab ni se obliga a elegir un modo en cada sesión. Volver a Mi programa conserva la navegación y los borradores del propio usuario; la selección recordada queda aislada por cuenta.

## ARF-02 — Resumen de trabajo

Mostrar accesos claros a Solicitudes, Grupos, Personas, Hábitos, Evidencias y Más. Contadores solo si existe una lectura real; un error de un panel no borra los demás. Priorizar grupos por vencer y personas sin grupo vigente. Búsqueda global queda pendiente hasta disponer de un contrato que busque sobre todo el conjunto.

## ARF-03 — Aprobar solicitudes

Reutilizar listado paginado, aprobación y rechazo de account-requests. Respetar el body, respuesta y motivos existentes; no introducir una aprobación adicional de célula. Tras aprobar, mostrar el siguiente estado real: onboarding, bienvenida asignada o pendiente de asignación. No anunciar éxito de bienvenida solo porque se aprobó la cuenta.

## ARF-04 — Bienvenida de siete días

Usar un grupo de recepción vigente según su período de siete días. La incorporación automática inicial no activa los antiguos procesos de traslado ni rotación. Sin grupo vigente o con configuración ambigua, mostrar pendiente para administración y permitir resolverlo. Entrada tardía: respetar la decisión abierta en clarifications.md.

## ARF-05 — Crear y editar grupos manuales

Flujo: datos y período → mentor → aprendices → revisar composición.
- Nombre, cohorte y fechas inclusivas mediante el CRUD actual.
- Mostrar mentor y especialidad real; null se presenta Sin especialidad definida.
- Capacidad regular por defecto 10, configurable hasta 15, validada también en servidor.
- Soporte y mentor no consumen cupo.
- Período ausente en grupos anteriores significa Sin período; no adjudicar vencimiento a datos legacy.
- Cambiar nombre no borra fechas. Quitar período requiere una acción explícita.
- No presentar tipo/capacidad/filtro de especialidad como campos ya admitidos por el DTO: completar sus contratos donde falten.

## ARF-06 — Asignar y cambiar participantes

Toda asignación manual debe mantener, dentro del mismo resultado de negocio:
1. Intervalo de pertenencia y función en asignaciones_celula.
2. Punteros compatibles del participante y del mentor vigente.
3. Evento de cambio de composición que sincroniza el chat.
4. Cupo y restricciones de solapamiento.
5. Revocación efectiva del acompañante saliente y conservación del historial.

Reintentar una acción no genera membresías duplicadas. Retirar a un aprendiz valida que pertenece al grupo indicado. Los grupos futuros no activan hoy acceso, chat ni mentor. No escribir historia ficticia para reparar datos anteriores.

## ARF-07 — Personas y ficha individual

Lista paginada, búsqueda real cuando exista contrato. Mostrar nombre, grupo vigente o Sin grupo, día personal del programa y estado disponible. Detalle progresivo:
- Resumen.
- Hábitos y horario.
- Cumplimiento semanal.
- Evidencias.
- Programa y objetivos cuando el contrato administrativo los autorice.
- Contactar desde chat.

No usar los endpoints self del alumno con otro id para simular administración. No asumir que ver hábitos concede leer respuestas íntimas, firmas o todo su mapa.

## ARF-08 — Calendario de cumplimiento

Reutilizar RejillaSemanal y la lectura histórica de SeguimientoService bajo un alcance administrativo explícito. Siete días, fecha local del alumno, estados textuales de hábitos, entrega y revisión separados. Un día futuro o sin obligaciones no representa ausencia. Mantener Sin datos cuando no existan registros; frontend no calcula la evaluación.

## ARF-09 — Catálogo general

Conectar creación, edición, activación/desactivación, horarios, guías, adjuntos y audioterapias a los endpoints existentes. La edición actual usa POST y un formulario completo; no inventar PATCH ni edición de tipo/título si el contrato la impide. Proteger snapshots históricos. No mostrar selector de vigencia futura universal mientras no exista contrato para él.

## ARF-10 — Hábitos personales

GET /api/v1/admin/trainees/{traineeId}/habits muestra horarios efectivos, título propio, origen, preferencias, desbloqueos, cambios pendientes y cuota de edición. Esta vista es de lectura. El cumplimiento se abre desde ARF-08; no inferirlo desde la preferencia. No ofrecer completar, editar o firmar por el alumno.

## ARF-11 — Evidencias

Bandeja con los filtros realmente admitidos: participante, estado, destino, fechas y cursor. Filtro por grupo solo después de ampliar el contrato de consulta. Reusar review y void, presentar el cambio y conservar autoría, archivo e historial. Abrir contenido privado solo mediante URLs y autorización del backend.

## ARF-12 — Avisos y contacto

Reutilizar notificaciones, lectura, deduplicación, tokens y push. Para grupo por vencer, enlazar al grupo y a Programar siguiente o Reasignar. Abrir un push revalida permisos. Evitar nombres y hábitos sensibles en la pantalla bloqueada. Leído no significa resuelto; no crear un estado Atendido sin contrato. Mensajes de chat siempre decididos por una persona.

## ARF-13 — Evaluación y ranking

Mantener fórmula y denominadores de points, con obligaciones históricas y pertenencias intersectadas. Evaluar evidencias entregadas durante el tramo, verificadas aparte. Grupo y mentor son métricas diferentes; no atribuir al mentor la totalidad del mes si acompañó solo una parte. No inventar retención, asistencia a sesiones o puntuaciones sin fuente.

## ARF-14 — Más opciones institucionales

Entradas para soporte, staff, roles, comunidad y conocimiento cuando sus endpoints estén autorizados. Acceso a cursos desde el lugar actual en Comunidad, sin bloqueo por día para staff según contrato. No incluir un editor de cursos ni analítica global nueva en este alcance.

## ARF-15 — Autorización efectiva

Usar capacidades derivadas de reglas y guards comprobados. No serializar UserRole.can para ADMIN/ALCHEMIST como si fuera una matriz auditada: hoy responde true a todo. El guard RequireAdminGuard es interno de users; otros módulos acceden por API pública o su propio guard existente. Mantener 403 de mentor fuera de su relación vigente al agregar lectura administrativa.

## ARF-16 — Programa personal completo y opcional

Iniciar o continuar desde Mi programa utilizando activación, onboarding, mapa, objetivos, horarios, hábitos, evidencias, comunidad y contratos existentes.
- No cambiar el rol a TRAINEE.
- Habilitar entrada por capacidad aunque useEsMentor sea false.
- Revisar y completar guards de contratos de fase para participación propia activa.
- Ahora no no llama DELETE ni borra progreso.
- El rechazo o fallo de una consulta de capacidades no se interpreta como permiso.
- Programa personal y métricas de alumnos mantienen identidades y claves de caché distintas.

## ARF-17 — UX y accesibilidad

Público de 50 a 60 años: una columna, títulos explícitos, texto legible, controles grandes, filtros simples y resumen antes del detalle. Rejilla plegable en móvil con detalle de día. Un solo scroll, márgenes responsive, teclado correcto y useSystemBackHandler en hijos y modales. Conservar tema y tipografía actual.

## ARF-18 — Vencimiento y grupos futuros

La aplicación no muestra como vigente un grupo fuera de su período. El último día completo sigue activo en la zona definida por el backend. Al cerrar:
- Administración conserva la consulta de historia.
- Se resuelven pertenencias vigentes, punteros y acceso al chat conforme al cierre.
- No se reutiliza DELETE para archivar ni se elimina contenido.
- El siguiente grupo es una decisión manual y tiene su propia identidad y conversación.
- Una caída del proceso de cierre se recupera de forma idempotente; la autorización no depende únicamente de que haya corrido el job.

## Finalización

Cada requisito se valida mediante validation.md. Una migración, controller o componente aislado no equivale a flujo completo. Si un dato/endpoint falta, registrar el contrato pendiente y no llenar la UI con datos ficticios.

El usuario añadió pruebas E2E al alcance: implementar los recorridos E01–E17 de e2e.md y el smoke nativo definido allí. El cierre requiere evidencias reales de ejecución y reporte de bloqueos por entorno; no basta una lista de escenarios.
