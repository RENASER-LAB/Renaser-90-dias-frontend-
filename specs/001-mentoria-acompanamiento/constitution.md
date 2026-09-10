# Constitución de esta entrega

## C-01 · Alcance y trazabilidad
Planificar y después implementar únicamente la mentoría descrita. Esta entrega es documental. Leer AGENTS.md y CLAUDE.md del frontend, CLAUDE.MD y .claude/rules del backend. Si cambian respecto al inventario, registrar las diferencias antes de ejecutar. No crear subagentes. No modificar reglas del repositorio para evitar cumplirlas.

## C-02 · Reutilización verificable
Buscar primero servicios, puertos, componentes, tablas, validadores y pruebas existentes. Cada pieza nueva debe justificar qué capacidad falta. No crear otros sistemas de usuarios, chat, hábitos, evidencia, ranking o notificaciones. No duplicar reglas de negocio en frontend ni consultar tablas de otro módulo con SQL nuevo. La prohibición es crear tablas innecesarias: un historial temporal no representable en las tablas actuales sí requiere persistencia justificada.

## C-03 · Trabajo sobre el estado actual
Ambos repositorios se revisaron en master. No hacer reset, checkout destructivo, pull con sobrescritura, commit ni push por este documento. Preservar cambios locales, el commit local del backend y docs/mockups. Si luego se solicita un commit, aplicar las reglas de rama del repositorio antes de hacerlo.

## C-04 · Backend
Conservar la arquitectura hexagonal y límites Spring Modulith. Comunicación entre módulos mediante sus APIs públicas; controlador delega en un caso de uso. Dominio sin Spring, JPA o Jackson. Inyectar Clock e IdGenerator. Operaciones temporales usan zona del participante y fechas reales, sin incrementar contadores a ciegas.
Usar tareas paginadas, ShedLock y aislamiento por operación; no envolver todo un lote en una transacción. Mantener contratos existentes compatibles. Migraciones Flyway nuevas, nunca editar una aplicada ni V1. Resolver la próxima versión libre al implementar; el inventario llegó a V44.

## C-05 · Frontend
Conservar Hoy, Plan, Training, Comunidad y Yo, su identidad visual y su funcionamiento. Reutilizar src/features/mentor y componentes de src/components. Features con screens, components, types y data; lógica de dominio en backend.
Cumplir AGENTS.md: Expo 57; un único scroll por pantalla, sin scroll interno con maxHeight fijo; flexGrow: 1 y paddingBottom: 36; useResponsive; márgenes 14/18/32 según los tamaños definidos; tablet maxWidth 560 centrado; width 100%, flexShrink y wrap. Formularios con keyboardShouldPersistTaps="handled". Mantener integridad de firmas y safeParsePaths cuando se reutilicen.
Jost 400/500/700; contraste del tema; controles de 48–52 px como mínimo. Para este público priorizar cuerpo 16 px cuando el diseño lo permita, títulos claros y escalado de fuente sin recortes. Microtexto no puede contener instrucciones esenciales.
Cada subpantalla o modal utiliza useSystemBackHandler y el mecanismo del navegador/Modal que corresponda; comprobar gesto real de iOS y Android, no asumir que un handler Android cubre ambos.

## C-06 · Autorización
Rol de identidad, participación personal y asignación a grupo son conceptos separados. Toda consulta, mensaje y archivo se autoriza en servidor. Las capacidades del frontend son informativas. Un cambio de mentor revoca permisos sobre el grupo y los detalles de sus alumnos, conservando mensajes y auditoría. No conceder permisos administrativos al mentor para resolver un 403.

## C-07 · Comprobación
Backend: pruebas de dominio y adaptadores según reglas; ./scripts/test-cloud.sh y ./mvnw clean verify con JDK 25 y Testcontainers Cloud, respetando el procedimiento real del script. No sustituir por Docker local. Revisar surefire/failsafe, ArchitectureTest y EndpointAuthorizationDeclarationTest; exit 0 sin pruebas no basta.
Frontend: npx tsc --noEmit, export web si corresponde y verificación funcional en Android/iOS/tablet. Si no existen herramientas de pruebas UI, no incorporar un framework completo sin justificarlo.
No afirmar que push funciona sin comprobar recepción y navegación en un dispositivo con build compatible. Registrar bloqueos externos sin dar la validación por aprobada.

