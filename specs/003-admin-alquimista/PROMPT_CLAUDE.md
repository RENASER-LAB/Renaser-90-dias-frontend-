# Prompt autónomo para Claude — SDD 003, revisión 2

Implementa este SDD en los dos proyectos:
- /home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-
- /home/ricardo/Documentos/Renaser/Renaser-90-dias-backend

El paquete canónico es /home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-/specs/003-admin-alquimista/.
Lee REPORT_ANALISIS.md, README.md, constitution.md, clarifications.md, research.md, contracts.md, spec.md, plan.md, tasks.md, validation.md y e2e.md. constitution.md incluye las reglas completas para trabajar sin depender de AGENTS.md.

## Decisiones vigentes

El usuario confirmó siete días de bienvenida y grupos manuales con nombre, fechas, mentor y aprendices. NO volver a tres días ni activar la rotación/traslado automático antiguos. Programar el siguiente grupo y cambiar mentor es una decisión humana. La entrada inicial a bienvenida es una automatización específica.

Grupo regular: 10 plazas de aprendiz por defecto, hasta 15 configurables; soporte y mentor no consumen cupo. Período inclusivo por días; asignaciones históricas con fin exclusivo por instante. Grupo cerrado conserva historia administrativa. Especialidad de mentor: reutilizar NEGOCIO, MENTE y RELACIONES con null legacy.

ADMIN y ALQUIMISTA comparten Administración según guards reales; no inventes una jerarquía superior para ALQUIMISTA. Ambos pueden hacer el programa propio de 90 días opcionalmente sin cambiar el rol.

La UX conserva Hoy, Plan, Training, Comunidad y Yo. Administración se abre desde Hoy/Yo, sin sexto tab ni pregunta de modo en cada login. Cursos siguen donde están, en Comunidad. Hábitos personales de alumnos se consultan, sin completar o firmar por ellos.

## Prioridades encontradas en la auditoría

1. CelulaService/ParticipacionProgramaService actualizan punteros legacy; conectar operaciones manuales al historial asignaciones_celula, cupos, proyecciones y ComposicionDeCelulaCambiadaEvent. No asumir que los EXCLUDE protegen operaciones que no escriben esa tabla.
2. Completar vigencia, cierre, chat y avisos sobre V48/V49 y cambios locales, sin duplicarlos.
3. Hoy usa useProgramaPersonal(esMentor), que excluye ADMIN/ALQUIMISTA. Resolver por capacidad.
4. phasecontracts restringe contratos propios a TRAINEE/MENTOR; completar paridad de staff activo con pruebas.
5. GET admin de hábitos devuelve configuración, no cumplimiento. La semana necesita lectura administrativa que reutilice SeguimientoService sin relajar permisos de mentor.
6. UserRole.can aún devuelve true para ADMIN/ALCHEMIST: no serializarlo como matriz efectiva.
7. El DTO de mentor candidato no trae especialidad y crear grupo aún no admite todos los controles deseados. Ampliar contratos reales antes de dibujar controles.

## Reglas técnicas que debes aplicar

- Conserva código y cambios locales. Inspecciona ramas: ambos estaban en mentor, NO master. No cambies rama ni hagas reset, stash, commit, push o deploy por este pedido.
- No uses subagentes salvo autorización posterior.
- Frontend Expo57: lee documentación versionada antes de código; feature modular, componentes existentes, un scroll, márgenes 14/18/32, maxWidth560 en tablet, Jost400/500/700, contraste y controles48–52. Usa keyboardShouldPersistTaps y useSystemBackHandler. Reglas de firma/persistencia completas en constitution.md.
- Reutiliza RejillaSemanal, clientes HTTP/Zod, AuthContext, capacidades, useProgramaPersonal, chat, evidencia, hábitos, objetivos, mapa y notificaciones. No copiar motores ni hooks completos por cambiar un endpoint.
- Backend Java25/Spring Boot4.1.1/Modulith: dominio puro, controller llama un caso de uso, módulos por APIs públicas; no repositorios en controllers, SQL contra tablas ajenas ni importación de users.application desde community/mentoring.
- Clock y zona correcta; jobs horarios para cambios de día, paginados, aislados por entidad y con SchedulerLock. Nunca activar schedulers legacy por comodidad.
- Preserva historial y contratos: no edites V1 ni migraciones aplicadas; V48/V49 están ocupadas. No crees tablas espejo ni uses una auditoría de roles para eventos ajenos.
- No inventes endpoints, q/filtros que no existen, estados Atendido, etags universales, effectiveFrom del catálogo o nuevos permisos sin necesidad verificada.
- El cumplimiento/evaluación usa motor actual de points y obligaciones históricas. Entregadas durante asignación; verificadas aparte. Sin datos no significa cero.
- Push y chat reutilizados; nunca mensajes automáticos como sustituto de intervención humana.

## Ejecución y validación

Comienza T01/T02: relee cambios concurrentes y marca solo lo realmente resuelto. Ejecuta las tareas por dependencias. Resuelve la cuestión de bienvenida tardía de clarifications.md antes de automatizar ese caso; continúa las demás tareas.

Mantén los contratos y documentos alineados al código real. No conviertas propuestas de contracts.md en rutas “existentes”.

Al modificar backend, usa ./scripts/test-cloud.sh con JDK25/Testcontainers Cloud en un target libre; ya ejecuta clean verify. Revisa Tests run de Surefire y Failsafe, ArchitectureTest y EndpointAuthorizationDeclarationTest. Si falta infraestructura, reporta el bloqueo y lo que sí probaste, sin cambiar a Docker local.

Frontend: npx tsc --noEmit y comprobación de navegación/accesibilidad en dispositivos. No declares un flujo completo porque compile una clase o exista una migración.

El usuario pidió E2E explícitamente: implementa y ejecuta e2e.md, no te limites a escribir el plan. Reutiliza runners si aparecieron desde la auditoría; si no, añade Playwright para la app web con backend/DB reales y Maestro para recorridos nativos esenciales. Ejecuta E01–E17, parametriza ADMIN/ALCHEMIST donde corresponde y completa T28–T33 antes del cierre T27.

Mantén un único entorno de pruebas vivo durante la suite y usa cuentas/fixtures aislados, login real X-Auth-Token y Clock de pruebas. El script test-cloud.sh termina sus recursos al salir: no des por disponible la base después. No uses el panel administrativo simulado como prueba de la app.

Entrega E2E_RESULTADOS.md con comandos reproducibles, versiones/HEAD de ambos proyectos, casos pasados/fallidos/bloqueados y evidencias. Pruebas web no certifican gestos nativos ni push real. Si falta infraestructura o dispositivo, reporta exactamente la parte pendiente sin declarar éxito total. No contratar servicios, desplegar ni enviar avisos a usuarios reales para probar.

Entrega archivos modificados, comportamiento logrado, pruebas ejecutadas y pendientes. No solicites confirmación para lo ya decidido. No publiques ni hagas commits.
