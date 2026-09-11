# Decisiones — revisión 2

## Confirmado por el usuario en esta revisión

AD-01. Bienvenida de siete días y grupos creados manualmente, de acuerdo con el cambio reciente del repositorio.
AD-02. El administrador define nombre, fechas, mentor y aprendices. La rotación y el traslado automático antiguos permanecen apagados.
AD-03. ADMIN y ALQUIMISTA pueden hacer su propio programa de 90 días opcionalmente y operar sin haberlo iniciado.

## Confirmaciones anteriores que siguen vigentes

AD-04. Capacidad regular inicial 10, configurable hasta 15. Soporte y mentor no consumen plazas de aprendiz. Recepción sin tope comercial, con paginación técnica.
AD-05. Evaluación del mentor según evidencias entregadas durante su asignación, con verificadas aparte. Reutilizar el motor actual.
AD-06. Avisos in-app y notificaciones push. El mensaje de chat lo envía una persona, cuando lo decide.
AD-07. Reutilizar código, contratos y tablas; conservar los cinco tabs y la experiencia personal.

## Cambio documentado que se adopta en el plan

AD-08. Período de grupo en días inclusivos: el último día sigue activo. Las asignaciones históricas usan instantes con fin exclusivo. No intercambiar ambos convenios.
AD-09. Los grupos vencidos permanecen consultables por administración. En el programa del aprendiz dejan de ser grupos activos. Se conserva identidad e historial, sin borrar ni reutilizar la conversación para un grupo diferente.
AD-10. Mentor con especialidad NEGOCIO, MENTE o RELACIONES, conservando null para perfiles anteriores. Reutilizar V48 y el trabajo local sobre perfil de mentor.
AD-11. La entrada a la bienvenida vigente se automatiza por separado; programar un grupo regular o mover sus aprendices sigue siendo una decisión humana.
AD-12. La nueva regla de aviso por vencimiento propone una ventana de siete días contando hoy. Mantenerla como configuración/regla existente del trabajo en curso; no crear otro sistema de alertas.

## Correcciones a suposiciones de la versión 1

- Retirada la jerarquía inventada ALQUIMISTA superior a ADMIN: los guards inspeccionados permiten ambas identidades.
- No tratar VIEW_OPERATIONS_HUB o VIEW_PERSONAL_HABITS como permisos existentes: no aparecen en Permission.
- El CRUD general no tiene vigencia editable universal, ni todos los DTO tienen etag, motivo o versión. Esas garantías se deben verificar operación por operación.
- El catálogo de cursos ya vive en Comunidad. Training conserva su función actual.
- La documentación previa de SDD 001 fecha el cambio como 2026-09-11, aunque el commit es de 2026-09-10. La confirmación de esta sesión elimina la duda del modelo; no se usa esa fecha futura como prueba de despliegue.

## Decisiones de UX propuestas para este alcance

- Entrada Administración visible en Hoy y Yo; sin pantalla obligatoria de selección ni sexto tab.
- Dentro de Administración: acceso a Mi programa y encabezado claro del espacio actual.
- Hábitos personales se consultan sin cambiar respuestas o registros de un alumno.
- Datos inexistentes se muestran como Sin datos; cero significa un valor medido.
- Búsqueda, filtros y contadores se respaldan por backend; no buscar solo en la página descargada.
- Funciones institucionales poco frecuentes se agrupan en Más.

## Cuestión abierta que no impide las tareas independientes

El modelo nuevo tiene un período de siete días para el grupo de bienvenida; no demuestra que cada alumno reciba siete días personales si entra al final del período. No alterar silenciosamente el reloj del programa para resolverlo. Antes de cerrar la automatización de ingreso tardío, definir la regla con el usuario. Mientras tanto, mostrar las fechas reales y una cola operativa cuando no exista bienvenida vigente.

“No hay grupo vigente”, “hay más de una bienvenida candidata” y “cupo completo” son estados operativos distintos. No crear grupos, cambiar cohortes ni mover personas al azar.
