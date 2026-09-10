# Plan técnico y UX

## 1. Flujo completo
```text
MENTOR
Entrar → Acompañamiento disponible
       → Iniciar mi programa (opcional)
           → Onboarding existente → Hoy / Plan / Training / Comunidad / Yo

APRENDIZ
Programa día 1–3 → Recepción de cohorte + chat de consultas + guías/soporte
Programa día 4   → Grupo estable (10, configurable hasta 15)
                  → Mismos compañeros + mismo chat
                  → Mentor cambia mensual/semanalmente
                  → Soporte ADMIN/ALCHEMIST permanece

ACOMPAÑAMIENTO
Hoy o Comunidad → Mi grupo → Alumno → Semana → Día → Hábito → Evidencia
                                     └→ Enviar mensaje (chat existente)
Aviso en app/push → Detalle autorizado del alumno
Mi evaluación → Mes → Cumplimiento durante mis asignaciones
Comunidad → Ranking → Grupos (sin sustituir ranking de personas)
```

## 2. Responsabilidades y reutilización
| Módulo | Trabajo previsto |
|---|---|
| users | Reutilizar identidad, participación opcional, consulta por email/UUID y APIs de asignación actual. Distinguir participación personal de rol de acompañamiento. |
| community | Recepción, política de grupos, membresías temporales, asignación y rotación; contexto autorizado y composición actual. |
| chat | Reutilizar conversación CELULA, directos, media y lectura. Añadir consumo de cambios y comprobación de pertenencia vigente para grupos. |
| habits | Exponer por API pública obligaciones y estados históricos por alumno/fecha, incluyendo reglas especiales existentes. |
| evidence | Exponer entregas y estados por lotes con fechas; alinear lectura propia del mentor y lectura de alumnos asignados. |
| points | Consumir insumos por APIs públicas y reutilizar ranking_celulas. Compartir cálculo de cumplimiento con evaluación, sin alterar puntos individuales. |
| academy | Completar acceso de mentor a contenido publicado; no cambiar el día de la clase personal ni audiencias de eventos. |
| notifications | Reutilizar notificaciones, preferencias, tokens, outbox y PushPort; añadir entrega nativa y navegación contextual. |

La agregación de seguimiento puede vivir en application de community consumiendo habits.api/evidence.api/users.api. La fórmula pura de cumplimiento debe tener un único dueño y API pública, propuesto points, consumido también para la evaluación. No crear un módulo transversal que importe internals de todos los anteriores.

## 3. Persistencia mínima propuesta
Primero contrastar con las migraciones vigentes. Es diseño lógico, no un SQL para ejecutar.

| Recurso | Cambio justificado |
|---|---|
| celulas | Añadir tipo RECEPCION/REGULAR y, solo si es necesario, override de capacidad. Recepción reutiliza una célula y su conversación CELULA; mentor_id puede ser null. Mantener unicidad actual del mentor regular. |
| cohortes | Reutilizar configuración existente si aparece; en caso contrario campos pequeños de capacidad por defecto, cadencia, zona y programación siguiente. No tabla genérica de configuración por anticipación. |
| Nueva relación temporal de asignaciones en community | Una sola tabla propuesta para célula, usuario, función APRENDIZ/MENTOR/GUIA/SOPORTE, inicio, fin nullable, motivo/origen, actor técnico o humano y clave de operación. Hace falta porque los punteros actuales no conservan intervalos. No es una tabla de nuevos usuarios ni de roles globales. |
| participantes_programa | Mantener celula_id y mentor_id como proyección actual compatible, escrita mediante users.api; no duplicar progreso. |
| participantes_conversacion | Reutilizar pertenencia actual al chat. Mensajes permanecen al retirar un integrante. |
| ranking_celulas | Reutilizar snapshot mensual con fecha de cierre; ampliar solo metadatos necesarios para identificar fórmula, cobertura y corte, si no existen. |
| notificaciones / publicaciones de eventos / tokens_push | Reutilizar. Añadir metadatos mínimos de destino, deduplicación y resultado de entrega si faltan; no tablas paralelas de alertas por feature. |

Intervalos semiabiertos: [inicio, fin). Evitan atribuir dos mentores al mismo instante. Restringir una asignación activa de mentor por grupo regular y una célula regular activa por mentor; un aprendiz tiene un solo grupo de acompañamiento activo. Guías y soporte pueden cubrir varios grupos sin consumir cupos. Un mentor que cursa personalmente no entra como alumno de su propio grupo ni se incluye en sus KPI: su participación personal es independiente.

Índices para célula/función/intervalo y usuario/intervalo. Invariantes temporales en dominio y restricciones/locks en persistencia, comprobadas con concurrencia. Una clave de operación estable impide duplicar efectos al repetir comando. No suponer que un simple check-then-insert evita carreras.

Migración: clasificar células actuales como regulares, conservar IDs y conversaciones, iniciar intervalos desde fecha verificable de transición. No deducir meses antiguos a partir de mentor_id. Reconciliar miembros/punteros con informe de anomalías; no sobrescribir datos conflictivos silenciosamente. Cabecera de migración explica por qué cada columna/tabla no puede reutilizar otra.

## 4. Recepción y traslado
1. Derivar día con el servicio de programa existente y zona del participante. Cuenta recién creada sin programa activo no inicia el reloj.
2. Asegurar recepción de cohorte idempotentemente. Dar acceso a guías y soporte configurados usando usuarios existentes.
3. Desde día 4, cargar candidatos de la misma cohorte con política vigente.
4. Bloquear grupo destino y comprobar ocupación real, seleccionando determinísticamente uno con cupo; reintentar si perdió la carrera.
5. En una transacción de asignación: cerrar recepción, abrir membresía regular, actualizar punteros mediante API de users y publicar cambio durable. Si falla, rollback conserva situación anterior.
6. Crear conversación por el flujo existente y sincronizar integrantes; frontend conserva acceso de acompañamiento mientras se resuelve una transición pendiente.
7. Si no hay mentor, grupo válido con soporte. Si no hay capacidad/provisión autorizada, estado ESPERANDO_GRUPO visible y aviso a soporte; nunca asignar por encima del límite.
8. Al bajar cupo por debajo de ocupación, conservar miembros y bloquear nuevas altas hasta quedar bajo el límite.

Job periódico paginado según reglas del backend, y recuperación de eventos pendientes. No depender exclusivamente de que el aprendiz abra la app. Recalcular elegibilidad a partir de fechas, no sumar un día por cada ejecución. Una corrección de fecha no devuelve automáticamente a recepción a quien ya tiene grupo estable.

## 5. Rotación resiliente
- Política por cohorte; default confirmado mensual, semanal disponible. El anclaje exacto es P-02.
- Obtener mentores activos y elegibles; respetar disponibilidad y una célula regular por mentor. No tomar el primer usuario de la base ni promover roles.
- Calcular conjunto determinista de cambios y validar cobertura de soporte antes de mutar.
- Intercambio A→B y B→A: dentro de una transacción del conjunto afectado, liberar primero referencias UNIQUE, hacer flush cuando corresponda, luego aplicar nuevas. No publicar estados intermedios ni cerrar una asignación si no puede completarse el conjunto.
- Cerrar intervalos y abrir nuevos con hora real de ejecución; sincronizar punteros de alumnos; publicar eventos en misma unidad transaccional.
- Idempotencia por cohorte/período/operación. ShedLock limita jobs simultáneos; constraints y locks cubren también acciones manuales.
- Si hubo varios períodos perdidos, aplicar una transición real al recuperar y registrar retraso; no fabricar rotaciones históricas.
- Sin sustituto: P-03. Registrar pendiente y reintentar según política sin generar un push por cada ejecución.
- Medir pendientes, errores, antigüedad de sincronización y falta de cobertura. Permitir reintento administrativo auditado sin cambiar manualmente SQL.

La transacción que cruza community/users lo hace por sus APIs y respetando la arquitectura existente. Si no es viable una unidad atómica, el diseño debe explicitar estado transicional durable y compensación antes de implementarlo; nunca aceptar punteros inconsistentes como estado final.

## 6. Chat y permisos durante cambios
Conservar conversationId del grupo. Evento durable dispara reconciliación de la lista deseada completa (alumnos + mentor actual + soporte), consultada a community.api. Así un evento viejo no reincorpora al mentor saliente.

Revalidar pertenencia actual en backend para leer/enviar, listar integrantes, marcar lectura y solicitar media de conversaciones de grupo. La proyección de participantes_conversacion acelera consultas pero no debe conceder acceso obsoleto. El nuevo mentor puede leer historial del grupo; mensajes viejos no se borran.

Los directos existentes conservan su política independiente; no borrar DMs porque alguien rotó. El botón de contacto desde seguimiento solo aparece para alumnos actuales. Un deep link antiguo revalida permisos y muestra “Tu asignación cambió” si corresponde.

## 7. Calendario y evidencias
Consulta semanal autorizada por grupo/alumno, con fechas locales y día de programa histórico. Respuesta incluye:
- obligaciones programadas y vencimiento;
- estado de cumplimiento de hábito;
- entrega de evidencia y estado de revisión por separado;
- origen de la información y disponibilidad histórica;
- última actividad relevante y fecha de actualización.

No reconstruir la semana pasada con hábitos activos hoy. Reutilizar snapshots y semántica existente para clases, publicaciones, pastilla, despertar/dormir o Santuario. Cada obligación declara si requiere evidencia y qué entrega existente la acredita; no exigir archivo a hábitos que se acreditan de otro modo ni mezclar rocas/objetivos con hábitos.

Datos ausentes no significan “no cumplió”. Para futuros: pendiente/no programado. Para días cerrados con obligación conocida sin cumplimiento: no cumplido. Para fuentes incompletas: sin datos. El mentor no edita respuestas, hábitos ni Mapa personal del alumno por este alcance.

## 8. Fórmula propuesta de evaluación y ranking
Unidad: obligación de evidencia única, vinculada al registro/actividad existente, no cantidad de archivos. “Entregada” no depende de validación; verificada/rechazada se presenta aparte. Reenvíos de la misma obligación no suman otra entrega.

Para mentor M, alumno A y mes:
1. Intersectar mes local, pertenencia real del alumno y asignaciones reales de M.
2. Denominador E(A): obligaciones que requerían evidencia y vencieron en esa intersección; excluir futuras, no programadas y días no exigibles conforme al programa existente.
3. Numerador D(A): esas obligaciones con entrega acreditable dentro de la ventana atribuible, hasta su corte. No sumar deudas del tutor anterior a la calificación del nuevo.
4. Porcentaje alumno = 100 × D(A) / E(A).
5. Calificación mentor = promedio de porcentajes de alumnos con E(A)>0; si hay varios intervalos con el mismo alumno en el mes, unirlos antes de calcular su porcentaje.
6. Mostrar alumnos evaluables, obligaciones, entregas, verificación aparte, período, zona, versión de fórmula y corte.

Ejemplo: Ana 2/4 = 50%; Luis 3/3 = 100%; mentor = 75%. No usar 5/7 = 71,43%, porque sería ponderar alumnos por número de obligaciones. El frontend no recalcula.

Entregas tardías: mostrar en historial siempre que exista permiso. La propuesta P-05 cuenta para calificación solo obligaciones y entregas dentro de la ventana atribuible; fuera de ella se muestran como tardías fuera de corte y no se trasladan al nuevo mentor. Esta política y el promedio exacto requieren cerrar P-05 antes de fijar tests de negocio; la decisión confirmada del usuario es medir entrega durante asignación.

Para grupos: mismo motor por alumno/mes/pertenencia, sin filtrar por un mentor. Por ello el ranking mensual de un grupo puede diferir del porcentaje de un mentor que estuvo solo parte del mes. Ranking entre grupos de misma cohorte; períodos sin mentor siguen midiendo al grupo pero no se atribuyen a una persona. Orden por valor sin redondear; mostrar redondeo solo en UI. Empates comparten posición según P-08.

Historial anterior no fiable => SIN_HISTORIAL; E=0 => SIN_MUESTRA. Cobertura parcial se etiqueta, no se oculta. Snapshots mensuales con corte y versión; correcciones auditadas recalculan explícitamente. No atribuir resultados retroactivos con la membresía actual.

## 9. Avisos y push
Reutilizar umbral existente como base de P-06, reglas en backend. Un aviso activo explica causa, fechas y acción “Ver alumno”. No avisar por días futuros, persona sin programa ni períodos desconocidos.

Deduplicar por destinatario vigente, alumno, motivo y ventana de evaluación. Resolver condición antes de crear otro aviso, y cancelar/reasignar pendientes cuando cambia mentor. Soporte recibe faltas de cobertura y fallos de asignación, no cada mensaje del chat.

Persistir aviso en app antes de solicitar push. Extender PushPort/adapter para WEB y transporte nativo (Expo Push propuesto), distinguir proveedor del token, añadir destino lógico y soporte de recibos. Reintentar fallos temporales con espera creciente y límite; desactivar tokens inválidos según respuesta; mantener fallos visibles para soporte. Entrega push es best effort y puede duplicarse externamente: garantizar un aviso lógico idempotente, no prometer recepción exactamente una vez.

Contenido discreto: “Hay novedades de acompañamiento”; cargar detalle autorizado dentro de app. Integrar preferencias y permiso del sistema. Negar permiso push no bloquea programa ni avisos en app. Probar foreground, background, app cerrada y toque con sesión caducada. SDK 57 y build de desarrollo/producción compatible; Expo Go no es criterio de aceptación para push remoto nativo.

## 10. Frontend: pantallas a lograr
Conservar crema/carbón/dorado y componentes existentes. No adoptar Mantine web en React Native por usarlo como inspiración. No instalar taste-skill ni 60fps como dependencia del trabajo: sus referencias visuales no sustituyen contratos ni componentes reales.

### Hoy del mentor
Encabezado sencillo; tarjeta visible “Mi grupo · 10 aprendices” con acción “Ver grupo” y contador descriptivo de avisos. Si también atiende recepción, tarjeta “Consultas de bienvenida” con acceso directo. No esconder acompañamiento al final de una página larga.
Si no participa personalmente: invitación secundaria “Hacer mi programa de 90 días”, con explicación y “Ahora no” sin eliminar datos.
Si participa: mantener sus hábitos y día de programa; sección “Mi programa” claramente propia. Nunca mezclar sus métricas con alumnos.

### Plan, Training y Yo
Plan conserva objetivos, organización semanal y horarios personales. Yo conserva Mapa, perfil y evidencias propias. Training abre cursos publicados del programa. Sin activación personal, Plan/Mapa explica cómo comenzar y Training sigue disponible. El mentor no pierde estos tabs al acompañar.

### Comunidad
“Mi grupo” visible arriba, con acceso a chat del grupo y aprendices; recepción separada si tiene esa asignación. “Miembros” conserva conversaciones personales/directorio. Mantener muro y demás secciones existentes con sus etiquetas; no una sexta pestaña inferior.
Cuando falta tutor: “Grupo acompañado por soporte” y personas de contacto. No mostrar “No tienes grupo” si ya existe membresía.

### Mi grupo
```text
‹ Comunidad           Mi grupo
Grupo Amanecer        10 aprendices
Tu asignación: 1–30 septiembre
[Chat del grupo]       [Mi evaluación]
Avisos: 2 requieren revisión

Aprendices
Ana Pérez
Hoy: 2 de 3 hábitos · 1 evidencia pendiente
[Ver avance] [Mensaje]

Luis Gómez
Sin actividad registrada hace 3 días
[Ver avance] [Mensaje]
```
Texto de datos solo ilustrativo, nunca fixture de producción. Tarjetas verticales, nombres completos, acciones táctiles. Recepción usa listado paginado y búsqueda; no renderizar a todos de golpe.

### Detalle de alumno
```text
‹ Mi grupo             Ana Pérez
Día 24 de su programa
Semana del 7 al 13 de septiembre
[‹ Anterior]           [Siguiente ›]

Lun 7 · Mar 8 · Mié 9 … (selección de día adaptable)
Miércoles 9
Caminar       Cumplido
Evidencia     Entregada · Pendiente de revisión
[Ver evidencia]

Lectura       Pendiente hasta las 21:00
[Enviar mensaje]
```
En 320–360 px, fechas en filas que envuelven o selector de día; no tabla de siete columnas con hábitos minúsculos ni scroll anidado. Resumen semanal numérico sencillo y leyenda textual, no solo verde/rojo. “Ver avance” abre este detalle, no un dashboard administrativo.

### Evaluación y ranking
“Mi evaluación · Septiembre”: porcentaje, entregadas/esperadas, alumnos incluidos, tramo asignado y “Cómo se calcula”. Verificadas aparte. Historial agregado propio accesible después de rotar.
Ranking en Comunidad: selector Personas / Grupos conservando rankings actuales. Mostrar nombre de grupo, posición, porcentaje y muestra; nunca evidencias privadas de sus miembros.

### Avisos
Lista en app con causa y acceso a alumno/grupo. Push abre la misma ruta. Si rotó el mentor, aviso histórico permanece legible como evento agregado pero no permite abrir datos personales revocados.

## 11. Integración y despliegue futuro
Orden: contratos y permisos → historial/configuración → asignación/chat → seguimiento/evaluación → avisos/push → UI integrada → validación.
Migración aditiva compatible antes de activar jobs. Preparar primero soporte/guías y validar reconciliación; activar jobs una sola vez bajo lock. Si hay feature flags existentes, reutilizarlos, no crear infraestructura propia de flags.
Rollback operativo: desactivar jobs/entrada de feature y conservar tablas/eventos/historial; no borrar datos nuevos. Activar código anterior solo si sigue siendo compatible con esquema y autorizaciones.
Deploy no forma parte de esta entrega de planificación.

