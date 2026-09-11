# Especificación funcional

## Objetivo y actores
Acompañamiento continuo durante 90 días con recepción inicial, grupos estables y mentores rotativos, integrado en Renaser actual.

Actores: aprendiz; mentor; mentor líder según permisos existentes; guía de recepción como función asignada; alquimista/administrador de soporte; administrador configurador; scheduler técnico. El scheduler no es un usuario administrador ficticio.

Historias: como mentor quiero cursar opcionalmente y acompañar sin perder mi propio Plan/Yo; como aprendiz quiero saber dónde consultar y conservar compañeros/chat; como mentor quiero entender el avance de cada alumno antes de escribirle; como administrador quiero rotaciones recuperables y evaluaciones atribuibles al período real.

## Requisitos EARS
| ID | Requisito |
|---|---|
| RF-01 | CUANDO un mentor entra sin participación personal, EL SISTEMA permite acompañar y ofrece iniciar el programa opcionalmente sin bloquearlo con onboarding de aprendiz. |
| RF-02 | CUANDO el mentor activa su programa, EL SISTEMA reutiliza onboarding, Hoy, objetivos/horario de Plan, Training, Comunidad, Yo, Mapa y evidencias personales sin cambiar su rol. |
| RF-03 | MIENTRAS el usuario sea mentor autorizado, EL SISTEMA permite acceder a los cursos publicados del programa sin bloqueos de día; no concede edición ni acceso a borradores. |
| RF-04 | CUANDO un administrador configura guías por correo o usuario existente, EL SISTEMA valida identidad, estado y permisos y asigna función en recepción sin promover roles silenciosamente. |
| RF-05 | MIENTRAS el aprendiz curse días 1–3, EL SISTEMA le incorpora a recepción de su cohorte sin aplicar cupo de grupo estable. |
| RF-06 | CUANDO un miembro autorizado consulta en recepción, EL SISTEMA usa su chat existente y permite responder a guías y soporte asignados. |
| RF-07 | CUANDO el aprendiz alcanza día 4, EL SISTEMA tramita una única asignación a grupo estable de su cohorte, conservando acceso de acompañamiento ante fallos. |
| RF-08 | CUANDO se asigna un aprendiz, EL SISTEMA aplica capacidad configurable, inicialmente 10 y ampliable hasta 15; personal de soporte y mentor no consume cupos. |
| RF-09 | CUANDO se completan cupos, EL SISTEMA aplica la política de provisión acordada y muestra cualquier espera operativa; nunca duplica membresía estable ni deja al aprendiz sin acompañamiento. |
| RF-10 | ~~CUANDO vence el período de rotación, EL SISTEMA cambia automáticamente solo al mentor…~~ **SUPERADO el 2026-09-11** — ver `decisions.md`. Los grupos los arma el administrador con nombre y período; no hay rotación automática. El código de rotación queda apagado por configuración, no borrado. |
| RF-11 | SI falta sustituto o falla una rotación, ENTONCES EL SISTEMA conserva cobertura, registra el estado recuperable y avisa a soporte sin simular una asignación exitosa. |
| RF-12 | CUANDO cambia una asignación, EL SISTEMA conserva intervalos reales e identidad del grupo/chat, mantiene alumnos y soporte y sincroniza punteros actuales. |
| RF-13 | CUANDO se actualiza la composición de un grupo, EL SISTEMA sincroniza integrantes del chat con reintentos idempotentes y revoca acceso del mentor saliente incluso ante proyecciones atrasadas. |
| RF-14 | MIENTRAS el usuario acompañe un grupo, EL SISTEMA muestra únicamente alumnos autorizados, con fecha de actualización y estados de dato desconocido. |
| RF-15 | CUANDO el mentor abre un alumno, EL SISTEMA presenta día del programa, semana seleccionada y hábitos por día con cumplido, pendiente, no cumplido, no programado o sin datos. |
| RF-16 | CUANDO un día aún no vence, EL SISTEMA distingue pendientes de incumplimientos; usa zona y programación histórica del alumno. |
| RF-17 | CUANDO consulta evidencias, EL SISTEMA distingue entregada de verificada/rechazada y permite abrir detalle/archivo solo dentro del alcance autorizado. |
| RF-18 | CUANDO se cumple una regla de ausencia o pendiente vencido, EL SISTEMA crea un aviso en app y solicita push a destinatarios actuales, respetando preferencias y deduplicación. |
| RF-19 | CUANDO una entrega push falla, EL SISTEMA conserva el aviso en app, registra el resultado y reintenta fallos transitorios sin confundir aceptación del proveedor con recepción. |
| RF-20 | CUANDO el mentor decide contactar al alumno, EL SISTEMA abre/reutiliza su conversación directa y envía solo el mensaje que el mentor confirma. |
| RF-21 | CUANDO se calcula evaluación mensual del mentor, EL SISTEMA considera únicamente evidencias entregadas atribuibles al período real de su asignación y expone numerador, denominador y cobertura. |
| RF-22 | SI no existen oportunidades evaluables o historial fiable, ENTONCES EL SISTEMA muestra sin calificación o historial no disponible, nunca 0 inventado. |
| RF-23 | CUANDO un mentor rota dentro de un mes, EL SISTEMA separa sus intervalos y no le atribuye el trabajo anterior/posterior de otro mentor; verificación no sustituye entrega. |
| RF-24 | CUANDO se consulta ranking de grupos, EL SISTEMA reutiliza la misma definición de cumplimiento de evidencias, excluye recepción y conserva el ranking de puntos existente. |
| RF-25 | CUANDO cambia o termina una asignación, EL SISTEMA aplica permisos en listado, detalle, archivos, mensajes y enlaces de notificación, manteniendo auditoría y mensajes históricos. |
| RF-26 | CUANDO el mentor navega en móvil, EL SISTEMA conserva los cinco tabs y ofrece Mi grupo de forma visible en Hoy y Comunidad; Miembros mantiene acceso a chats personales. |
| RF-27 | CUANDO el usuario amplía texto, usa pantalla estrecha o gesto atrás, EL SISTEMA conserva lectura, acciones y retorno sin desbordes ni pérdida de formularios. |
| RF-28 | CUANDO se edita configuración, EL SISTEMA valida cambios y aplica nuevos cupos/cadencia prospectivamente sin expulsar aprendices ni borrar historial. |
| RF-29 | CUANDO jobs/eventos se repiten o compiten, EL SISTEMA mantiene una sola transición/asignación/aviso lógico y permite reconciliar operaciones incompletas. |
| RF-30 | CUANDO se despliega sobre datos existentes, EL SISTEMA conserva usuarios/grupos/chats/progreso y diferencia historia importada verificable de historia desconocida. |

## No funcionales
- RNF-01: cumplimiento de constitution.md y reglas de ambos repositorios.
- RNF-02: autorización en backend por rol más relación actual; mínimos datos en push; ninguna evidencia pública por aparecer en ranking.
- RNF-03: contratos paginados, consultas por lotes sin N+1; recepción ilimitada comercialmente, nunca respuesta de tamaño ilimitado.
- RNF-04: operaciones temporales con Clock y zonas; logs estructurados por operación sin contenido privado.
- RNF-05: carga, vacío, error, permiso revocado, sin mentor, sin programa, sin muestra y desconexión diferenciados.
- RNF-06: una sola fórmula de métricas y fuentes originales; no duplicar puntos, registros ni notificaciones.

## Casos límite y límites
Cubrir activación repetida, día 0, fin del día 3, zonas distintas, mes corto, caída del scheduler, cambio de hora, dos altas por último cupo, intercambio de mentores con índice UNIQUE, ausencia de sustituto, alumno transferido excepcionalmente, mensajes en vuelo, múltiples evidencias de un hábito, entrega tardía y evidencia borrada/rectificada conforme a políticas existentes.

Fuera de alcance: rediseño global, cambiar tabs, construir chatbot/IA/RAG, nuevo sistema de cursos, pagos, mensajes automáticos de mentor, calificar calidad pedagógica o permitir revisión administrativa de evidencias por ser mentor. Alertas y push sí están dentro.

## Finalización
Todos los RF cuentan con evidencia de validación; backend mantiene arquitectura y pruebas obligatorias; frontend compila y se verifica en dispositivos; migración conserva datos; rotación recupera fallos; push se prueba de extremo a extremo. Un mockup, un token registrado o un build exitoso por sí solos no completan el requisito.

