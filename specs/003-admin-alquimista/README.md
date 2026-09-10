# SDD 003 — ADMIN y ALQUIMISTA · revisión 2

Fecha: 2026-09-10. Estado: especificación revisada; implementación pendiente por tareas.
Alcance: los dos proyectos, frontend Expo y backend Spring Modulith.
Referencia de revisión: frontend mentor / 121e141; backend mentor / 0318e21, incluyendo cambios locales.
Consulta REPORT_ANALISIS.md para las pruebas, límites de verificación y el inventario al corte.

> Corrección de la primera versión: proponía recepción de tres días y rotación automática mensual/semanal. El usuario confirmó en esta revisión siete días de bienvenida y grupos manuales con nombre y fechas. Las instrucciones anteriores que contradigan esta decisión quedan superadas. No reactivar los schedulers antiguos.

## Producto a construir

ADMIN y ALQUIMISTA tendrán acceso a Administración desde Hoy y Yo, y podrán iniciar o continuar su programa personal de 90 días de forma opcional. Se mantienen Hoy, Plan, Training, Comunidad y Yo. No habrá una elección obligatoria de modo en cada inicio de sesión.

Administración concentra:
- Solicitudes, incorporación y bienvenida.
- Grupos manuales: nombre, período, mentor, especialidad, aprendices y soporte.
- Grupos próximos a vencer y cerrados, conservando historia.
- Ficha de aprendiz: programa, hábitos configurados, cumplimiento diario/semanal, evidencias y contacto.
- Catálogo general, guías, horarios y audioterapias mediante contratos existentes.
- Avisos, soporte y ranking.
- Staff y roles según autorización ya implementada.

ADMIN y ALQUIMISTA comparten estas vistas. No se inventa una jerarquía adicional para ALQUIMISTA ni nuevos privilegios globales. Las diferencias solo se muestran si un contrato y su guard las sostienen.

## Qué existe y qué falta

Hay backend administrativo y seguimiento de mentor reutilizable. Falta la feature administrativa móvil y la integración del modelo manual con historial, cupos, chat, vencimiento y permisos de seguimiento. Existen endpoints para hábitos personales configurados; no son un calendario de cumplimiento.

El programa personal del staff existe parcialmente: Hoy usa useProgramaPersonal solo para roles reconocidos por useEsMentor, que excluye ADMIN/ALQUIMISTA. Además, phasecontracts todavía restringe firma a TRAINEE y consulta a TRAINEE/MENTOR. La paridad completa debe verificarse y completarse.

## Leer y ejecutar

1. REPORT_ANALISIS.md — evidencia del estado real.
2. constitution.md — reglas técnicas autónomas.
3. clarifications.md — decisiones vigentes y cuestiones abiertas.
4. research.md y contracts.md — reutilización y contratos reales.
5. spec.md y plan.md — comportamiento esperado y UX.
6. tasks.md, validation.md y e2e.md — implementación, comprobación y pruebas de extremo a extremo.
7. PROMPT_CLAUDE.md — entrada autónoma para el agente.

El SDD 001 aporta dominio de asignaciones, seguimiento y métricas; sus reglas antiguas de traslado/rotación no se deben restaurar. El SDD 002 mantiene su alcance de líder de mentores.

[Entrada backend](../../../Renaser-90-dias-backend/docs/spec/SDD_ADMIN_ALQUIMISTA.md)

Ampliación solicitada: [E2E](e2e.md), con 17 recorridos y tareas T28–T33. El agente debe implementar y ejecutar la suite, además de frontend/backend. El reporte previo conserva su foto histórica de 27 tareas; el plan ahora contiene 33.
