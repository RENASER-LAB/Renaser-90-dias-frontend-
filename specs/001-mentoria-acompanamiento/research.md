# Inventario observado y brechas

Lectura de repositorios locales en master; no se consultaron datos de producción. Las rutas del backend se expresan relativas a src/main/java/com/renaser/os cuando se indica el módulo.

## Frontend
| Pieza existente | Reutilización y brecha |
|---|---|
| src/features/mentor/api/mentorApi.ts | Encadena cohorts → cells → detalle y selecciona el primero. No sirve como selector explícito de recepción/grupo ni como calendario; conservar cliente HTTP y validación, sustituir la selección implícita. |
| src/features/mentor/screens/MiCelulaScreen.tsx y AlumnoScreen.tsx | Base real para Mi grupo y detalle. Métricas sin endpoint están null; no rellenarlas con números ficticios. |
| src/features/mentor/hooks/useCelulaQueAcompano.ts y useEsMentor.ts | Reutilizar gestión de carga y detección, centralizar normalización de roles API/BD. |
| src/features/mentor/reglas.ts | Umbral de ausencia de 3 días existente. El resumen suma totales; no equivale al nuevo promedio por alumno. No tratar datos desconocidos como “al día”, ni futuros como incumplidos. |
| TarjetaMentorHoy y navegación local de Hoy | Extender acceso visible; compartir el detalle con Comunidad evitando dos estados de navegación incoherentes. |
| RootNavigator | El gate general de onboarding debe distinguir mentor sin programa personal de aprendiz. Backend ya permite activación opcional; no basta ocultar una pantalla. |
| Comunidad / useMiCelula | Existe integración de chat. La condición de grupo depende también de tener mentor: debe admitir grupo con soporte y mentor vacante. Revisar datos estáticos residuales del roster. |
| src/features/chat/api/chatApi.ts | Conversaciones, mensajes, directos, lectura y media reales. Reutilizar, no otro chat ni SDK. |
| Plan / Yo / mapa-renacimiento | Plan de objetivos semanales/diarios y Mapa existentes. Evidencias personales reales. Algunas otras acciones de Yo son placeholders; no anunciarlas como funcionalidades terminadas. |
| src/features/habits/notificaciones/webPush.ts | Base web existente; no demuestra integración push nativa. |

El Mapa solicitado se interpreta como el Mapa de Renacimiento existente. No incluye un nuevo grafo de conocimiento, RAG ni funcionalidad de IA generativa.

## Backend
| Pieza existente | Consecuencia para el plan |
|---|---|
| community/application/services/CelulaService.java | CRUD y asignaciones disponibles; falta cupo/recepción/rotación temporal coordinada. |
| community/domain/model/celula/Celula.java y tabla celulas | Mentor opcional; mentor_id UNIQUE limita a una célula regular por mentor. Un intercambio debe respetar esa restricción. |
| users/.../ParticipacionProgramaController.java | GET/POST /api/v1/mentor/activate-tracking y activación de programa existen. Participación personal separada del rol. DELETE elimina participación: no usar para “ahora no”. |
| participantes_programa | Conserva usuario, mentor/célula actual y programa. Son punteros actuales, no historial de asignaciones. |
| perfiles_mentor, cohortes | Reutilizar perfil y cohorte, no crear tablas paralelas de tutores. |
| chat/.../CelulaCreadaChatListener.java | Crea conversación de célula, pero no sincroniza altas/bajas de integrantes de asignaciones. |
| chat/.../ConversacionService.java | Directos con par canónico, conversación estable por célula. Mantener identidad e historial. |
| participantes_conversacion | Pertenencia actual. No sustituye intervalos de tutoría ni basta para revocar si una proyección queda atrasada. |
| evidence/application/services/EvidenciaService.java | Filtro de mentor por participante asignado. Revisar caso de evidencia propia del mentor y coherencia lista/detalle: no resolver elevando permisos. |
| evidence API / RegistrosConEvidenciaFinder | Reutilizar consulta por lotes, ampliar marcas temporales/estados cuando falten. No evaluar solo primera página de evidencias. |
| habits / registros_habito | Estados y fecha del registro, snapshot de día de programa. Usar programación histórica; hábitos especiales pueden acreditar cumplimiento fuera de una fila de evidence. |
| academy | Algunas restricciones por día ya se omiten para staff, pero permanecen roles/publicación/estado. Verificar acceso efectivo a lecciones y recursos, no solo tarjetas. |
| points / RankingAgregadoService | Ranking CELL actual ordena aprendices dentro de célula; no es el ranking entre grupos solicitado. |
| ranking_celulas | Tabla existente de snapshots por fecha/célula/puntaje/posición; reutilizarla para ranking de grupos con semántica explícita. |
| notifications / PushPort / WebPushAdapter | Notificaciones y tokens existentes, adaptador observado envía WEB. IOS/ANDROID en enum no equivale a entrega implementada. |
| Spring Modulith, publicaciones de eventos, ShedLock | Reutilizar para sincronización, reintentos y jobs. No añadir una segunda cola por defecto. |

## Riesgos concretos que esta ampliación debe resolver
1. Asignar mentor a celulas sin actualizar participantes_programa.mentor_id puede dejar evidencias autorizadas al mentor equivocado.
2. Cambiar asignación sin sincronizar chat deja accesos obsoletos.
3. Elegir la primera cohorte/célula oculta asignaciones y falla con recepción más acompañamiento.
4. Un mentor sin programa personal no debe quedar encerrado en onboarding.
5. Evaluar su propia evidencia no debe recibir el 403 destinado a alumnos ajenos.
6. No se puede reconstruir un calendario fiable desde contadores actuales ni afirmar incumplimiento cuando falta historial.
7. No se puede prometer push móvil porque exista registro de token.
8. No usar GLOBAL como recepción: es una conversación general compartida y con restricción de unicidad.

## Antes de implementar
Revalidar HEAD, reglas y contratos exactos. Si apareció una pieza equivalente después de esta revisión, reutilizarla y reducir el plan. Si se necesitan correcciones adyacentes que no son requisito de mentoría, documentarlas aparte sin ampliar el alcance.

