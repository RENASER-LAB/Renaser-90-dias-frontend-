# Plan técnico y UX — revisión 2

## 1. Navegación a lograr

Mi programa conserva los cinco tabs. Añadir una entrada Administración en Hoy y Yo, visible por capacidad. Dentro de Administración, el encabezado ofrece volver a Mi programa. No duplicar los tabs dentro de cada subpantalla ni forzar un selector al iniciar.

Mockup estructural propuesto, con cifras de ejemplo que no son datos del sistema:

    Hoy                         [Administración]
    Mi día y mi progreso personal
    Hoy · Plan · Training · Comunidad · Yo

    Administración              [Mi programa]
    Pendientes
    Grupos por vencer                 Ver grupos
    Personas sin grupo                Ver personas
    Solicitudes                       Revisar
    Grupos
    Personas
    Hábitos generales
    Evidencias
    Más opciones

    Grupos                   [Crear grupo]
    Vigentes · Programados · Cerrados
    Fénix
    1–30 de septiembre · 8 de 10 aprendices
    Mentor: [nombre] · Mente
    [Abrir grupo]

    Fénix
    Resumen
    Aprendices
    Chat
    Configuración
    [Programar siguiente grupo]

    Aprendiz: [nombre]
    Día del programa · Grupo · Mentor
    Resumen semanal
    [Ver cumplimiento de esta semana]
    [Ver hábitos y horarios]
    [Ver evidencias]
    [Ver programa y objetivos] si hay permiso/contrato
    [Enviar mensaje]

Los filtros se ajustan en una hoja/modal; no usar varias filas de tabs estrechos. RejillaSemanal ya permite plegar la semana en móvil: reutilizar ese comportamiento. Tablet conserva tarjeta centrada hasta 560 px.

## 2. Backend primero: completar coherencia del grupo manual

CelulaService y ParticipacionProgramaService actualizan actualmente los punteros antiguos. Las lecturas nuevas de mentor usan asignaciones_celula. Conectar las operaciones manuales a una única operación de composición en community:

- Reutilizar ConjuntoAsignaciones, CupoCelula, PeriodoAsignacion y los puertos de persistencia.
- Consultar y validar pertenencias, cupo, estado de usuarios y compatibilidad de períodos.
- Escribir los intervalos reales; sincronizar después los punteros mediante users.api.
- Publicar ComposicionDeCelulaCambiadaEvent y reutilizar su listener.
- Mantener restricciones EXCLUDE de V45 y manejar concurrencia.
- Diferenciar programar una pertenencia futura de activarla hoy.
- Validar el grupo de origen al retirar; no confiar solo en traineeId.

No copiar los algoritmos de TrasladoService o RotacionService. Extraer únicamente la operación de composición compartida que haga falta, conservando sus pruebas. No habilitar sus schedulers.

## 3. Período, bienvenida y cierre

Reutilizar V48, PeriodoGrupo, nuevas propiedades de Celula y el trabajo local de DTO/JPA. Completar:
- Lecturas vigentes/programadas/cerradas para administración y filtro de vigencia para app.
- Cierre de asignaciones y proyecciones, con conservación de historia.
- Revocación de acceso al chat revalidada en servidor.
- Ingreso a bienvenida vigente por un mecanismo específico y recuperable, sin reactivar traslado.
- Avisos previos con servicio/evento/notificación V49 ya en curso.

Comparar días del grupo en una zona definida de backend; no recibir una zona arbitraria del teléfono para decidir vigencia. La semana personal conserva la zona del alumno. Los barridos que dependan del cambio de día son horarios, paginados y aislados por grupo; no una transacción masiva.

## 4. Programa propio de ADMIN/ALQUIMISTA

Reusar capacidadesDePrograma, useProgramaPersonal y activarProgramaPersonal. Separar “puede iniciar programa” de “es mentor”. Auditar activación → onboarding → mapa → objetivos → horarios/hábitos → evidencias → contratos de fase.

ContratoService todavía excluye estos roles: completar permisos del programa propio sin habilitar firma sobre otra persona. Conservar el avance y usar los mismos módulos. Revisar claves de almacenamiento por userId: un “Ahora no” de una cuenta no debe ocultar la opción de otra.

## 5. Lecturas de operación

- Preferir listados existentes por sección antes de agregar un resumen global.
- Si falta contexto, añadir una lectura pequeña de capacidades efectivas en users o ampliar la existente de forma compatible.
- No convertir el true general de UserRole.can en capacidades de UI.
- La consulta administrativa de semana usa una autorización distinta de mentor y reutiliza el armado histórico y el motor. No agregar un parámetro “soyAdmin” ni relajar el guard de mentor.
- Consulta de hábitos personales usa su endpoint específico; semana y evidencias usan fuentes separadas.
- Búsqueda general, filtros por grupo y métricas no soportadas se implementan como ampliaciones justificadas de consultas. No cargar todo el padrón en el móvil.

## 6. Frontend por fases

F0. Tipos, cliente Zod, capacidades y acceso Administración; cubrir programa opcional.
F1. Grupos y recepción: listar, ver período/especialidad, crear, editar, asignar, retirar y archivar mediante contratos reales.
F2. Personas: lista, detalle, configuración personal, semana reutilizada, evidencias y chat.
F3. Catálogo: formularios de creación/edición hidratados, guías, horarios y adjuntos.
F4. Avisos y Más: soporte, staff, roles, comunidad y conocimiento existentes.
F5. Integración en dispositivos, errores, permisos, caché por cuenta y restauración de navegación.

Una feature src/features/admin puede contener api y hooks además de screens, components, types y data, siguiendo el patrón existente. Extraer UI compartida solo cuando haya consumo real; no renombrar features enteras.

## 7. Persistencia y contratos

No crear por defecto tablas admin_groups, admin_habits, admin_dashboard o admin_progress. No reutilizar tablas semánticamente ajenas solo para evitar una migración. Si falta un dato persistente, justificarlo y usar la siguiente versión libre de Flyway; V48/V49 ya existen o están ocupadas por trabajo local.

No añadir etag, idempotency key, motivo y auditoría genéricos a todos los DTO como obligación indiscriminada: primero comprobar la estrategia existente. Las garantías de no duplicación e historial sí son obligatorias en la operación de asignación.

## 8. Entrega

Trabajar sobre las ramas actuales verificadas; no asumir master. Preservar trabajo concurrente y revisar nuevamente el diff antes de cada cambio. Entregar por bloques con sus pruebas y reportar qué sigue pendiente. La tarea de esta revisión solo modifica documentos.

## 9. E2E incorporado al alcance de implementación

Leer e2e.md. Preparar entorno/fixtures con T28 mientras avanza el producto; añadir recorridos al cerrar cada flujo. Ejecutar T29–T33 antes de T27. Playwright valida la app web con backend real y Maestro cubre los recorridos nativos; ambos reutilizan las reglas y datos de prueba del mismo sistema.

El coordinador de pruebas debe mantener backend/Cloud/frontend vivos durante la suite y aislar cuentas, reloj y archivos. No levantar la suite sobre datos de trabajo del usuario. Entregar comandos y resultados E2E, además de pruebas de dominio/integración y TypeScript.
