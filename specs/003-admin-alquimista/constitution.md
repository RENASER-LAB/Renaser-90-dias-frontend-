# Reglas autónomas para Claude — revisión 2

Aplican a ambos proyectos. No es necesario resolver una importación a AGENTS.md para leer las reglas siguientes.

## Alcance y colaboración

- Implementar el SDD 003 con siete días y grupos manuales. No reactivar rotación ni traslado automático.
- Inspeccionar rama y cambios locales antes de editar. Ambos repositorios estaban en mentor; no asumir master ni cambiar de rama por inercia.
- Preservar cambios sin commit, staging y archivos nuevos. No reset, stash, limpieza, commit, push o despliegue sin pedido.
- No lanzar subagentes para este trabajo salvo que el usuario cambie esa instrucción.
- No inventar permisos, estados o reglas nuevas. Resolver detalles rutinarios; documentar y preguntar solo lo que cambie el negocio.
- Si más adelante se pide un commit en master, seguir la regla backend de crear rama primero. Mensajes en español, imperativo, qué y por qué; sin atribuciones a IA.
- Actualizar documentos en el mismo cambio y registrar errores/decisiones en las bitácoras existentes cuando se toque código; consultar numeración antes de reservarla.

## Frontend

- Antes de escribir código Expo, leer https://docs.expo.dev/versions/v57.0.0/ y respetar package.json.
- Estructura por feature: src/features/<feature>/screens, components, types y data; api/hooks siguen el patrón existente.
- Reutilizar FormField, GoldButton, SliderRating, Checkbox, SignatureCanvas, Icon, tema, schemas y clientes existentes.
- Conservar Hoy, Plan, Training, Comunidad y Yo y sus funciones.
- Un único scroll de pantalla; no scroll interno ni maxHeight fijo dentro de otro ScrollView. Usar contentContainerStyle con flexGrow: 1 y paddingBottom: 36.
- useResponsive: ancho menor de 360 → paddingHorizontal 14; 360–440 → 18; tablet desde 768 → 32 y tarjeta centrada maxWidth 560.
- width: '100%', flexShrink: 1 y flexWrap: 'wrap' donde haga falta.
- Formularios con keyboardShouldPersistTaps="handled".
- Jost_400Regular, Jost_500Medium y Jost_700Bold; evitar pesos ultrafinos.
- Párrafos, cláusulas e inputs: 14–15.5 px como mínimo; ayudas 12–13.5; micro etiquetas 10–11.5 Medium/Bold. Preferir texto de acción mayor cuando el público lo requiera.
- Oscuro: principal #FFFFFF/#F6F4EE, secundario #C5BEB3. Claro: principal #1E1B18, secundario #4A453D.
- Objetivos táctiles 48–52 px. Estados identificables por texto además de color.
- Validar antes de avanzar o enviar; Alert.alert y errores de campo claros, color #E06A66.
- useSystemBackHandler en toda vista hija/modal/flujo: cerrar modal o volver al nivel anterior; no salir accidentalmente de la app.
- Si se toca firma: captura PanResponder=true, terminationRequest=false, shouldBlockNativeResponder=true; persistencia en estado raíz/contexto, modo dibujo y modo nombre, safeParsePaths al deserializar.
- No añadir librerías visuales ni cambiar sistema de diseño por este alcance.
- Ejecutar npx tsc --noEmit; no se afirma validación visual por una compilación.

## Backend

- Java 25, Spring Boot 4.1.1 según pom y arquitectura hexagonal/Spring Modulith.
- Dominio sin Spring, JPA ni Jackson. Raíces mutan con intención de negocio, no setters públicos.
- Controller solo deserializa, valida, autoriza, llama un caso de uso y mapea. Sin repositorios, transacciones ni orquestación de varios casos en controller.
- Módulos consumen únicamente <otro>.api. No importar RequireAdminGuard de users.application desde otro módulo ni hacer SQL contra tablas ajenas.
- Reutilizar casos, puertos y eventos. No duplicar motor de cumplimiento, tablas, catálogos, contratos o chats.
- DTO explícito y mapper manual cuando hay traducción de enums/zonas; no MapStruct automático a respuesta HTTP.
- Métodos cortos: objetivo ≤20 líneas, techo40; clases objetivo≤150, techo300; parámetros≤3, anidación≤2, públicos≤7. Extraer operaciones por intención sin crear jerarquías inútiles.
- No llamadas de IA dentro de @Transactional.
- Permisos por endpoint con @RequiresPermission/@PublicEndpoint y guards efectivos. Negativas: rol sin acceso y cuenta suspendida.
- Nueva matriz de roles se deriva de la existente y sus guards; cualquier ampliación general se trata aparte, no como “cerrar todos los permisos” dentro de una pantalla.

## Fechas y persistencia

- Clock del dominio, nunca now() estático para reglas de negocio.
- Día del alumno = instante en su timezone. Grupo = fechas inclusivas y zona de backend definida. PeriodoAsignacion mantiene fin exclusivo.
- Derivar estados del calendario, no incrementar contadores de vida de grupo.
- Jobs por día local: barrido horario, paginado, aislamiento por entidad, recuperación idempotente y SchedulerLock salvo justificación. Sin transacción global del padrón.
- No duplicar @EnableScheduling. Consultar el inventario de schedulers existente.
- V1 y migraciones aplicadas no se editan. Releer últimas versiones: V48/V49 ya están ocupadas por trabajo del grupo.
- Registros de hábito conservan snapshot histórico; ajustes del día/points son append-only. No recalcular retrospectivamente obligaciones.
- Una nueva migración justifica problema y por qué no basta el modelo actual; no obligación artificial de cero tablas si falta un concepto real.

## Validación

- Frontend: typecheck y escenarios de navegación/accesibilidad apropiados. No inventar un script npm test que no existe.
- Backend: JDK25 y ./scripts/test-cloud.sh, que ejecuta clean verify. No repetir automáticamente ./mvnw clean verify: el wrapper ya lo invoca.
- Usar Testcontainers Cloud. Si falta conexión/token, ejecutar lo verificable sin contenedores e informar el bloqueo; no cambiar a Docker local.
- Verificar Tests run de Surefire y Failsafe, ArchitectureTest y EndpointAuthorizationDeclarationTest; exit0 solo no prueba ejecución.
- No ejecutar dos builds sobre el mismo target. Con trabajo concurrente, usar copia aislada que incluya cambios locales, o esperar el recurso.
- Dominio nuevo tiene pruebas puras; adaptadores tienen integración. Regresión debe fallar frente al código previo.
- Incluir fechas UTC entre 00:00 y 05:00 que aún sean el día anterior en Lima.

## E2E solicitado expresamente

- Implementar y ejecutar e2e.md contra app/backend/datos de prueba reales. No sustituir aceptación por mocks de permisos, historial o cumplimiento.
- Preparar entorno aislado, cuentas por ejecución y login real X-Auth-Token. Usar Clock de pruebas y mantener servicios vivos hasta terminar los runners.
- Añadir dependencias/herramientas de test compatibles solo durante la implementación; no modificar dependencias de producto por comodidad.
- Reportar E2E web, nativo, integración y servicios externos por separado. Capturas y trazas no deben contener tokens ni datos reales.
- Sin infraestructura/dispositivo, registrar escenarios bloqueados; no declarar suite completa ni habilitar pruebas sobre producción.

## Grafo local

Si existe graphify-out/graph.json, consultar graphify para orientación y contrastarlo con archivos/diff: puede no incluir cambios locales. Tras modificar código, graphify update . es AST. Una actualización documental con LLM requiere solicitud específica; no ejecutarla por esta revisión. No borrar etiquetas ni commitear graphify-out.
