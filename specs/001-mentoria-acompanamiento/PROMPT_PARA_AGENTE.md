# Prompt para tu agente ejecutor

Copia el siguiente bloque a tu agente cuando quieras iniciar la implementación.

---

Trabaja en Renaser usando el SDD guardado en:
`/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-/specs/001-mentoria-acompanamiento/README.md`.

Frontend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-`.
Backend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-backend`.

Ambos estaban en master al planificar. El backend tenía un commit local adelantado. Verifica el estado actual y conserva todo cambio del usuario. No hagas reset, cambios destructivos, commit, push ni despliegue. No uses subagentes.

Lee AGENTS.md/CLAUDE.md del frontend y CLAUDE.MD/.claude/rules del backend. Lee el paquete completo en el orden del README. Sigue SDD: especificación primero; registra aclaraciones; implementa tareas pequeñas con pruebas; valida cada RF. No reemplaces el diseño del sistema con otra arquitectura.

Decisiones confirmadas:
- Mentor puede hacer opcionalmente el programa de 90 días completo, con su Hoy, Plan, horarios/objetivos, Training, Comunidad, Yo, Mapa y evidencias. Acompañar no depende de activar su programa.
- Recepción sin límite de aprendices durante sus primeros tres días individuales, atendida por guías/mentores configurados por correo o usuario existente.
- Desde día 4, grupos estables de 10 aprendices, configurables hasta 15.
- Rotación mensual de mentor, configurable a semanal; alumnos, grupo y chat permanecen.
- ADMIN/ALCHEMIST asignados mantienen soporte, incluso sin tutor.
- Mentor ve avance diario/semanal, hábitos y evidencias de alumnos actuales, y puede escribirles manualmente por el chat existente.
- Evaluación mensual por evidencias entregadas durante su asignación; verificadas aparte. Ranking de grupos reutiliza la fórmula.
- Avisos en app y push están incluidos. Mentor accede a cursos publicados del programa sin bloqueo por día.
- Preserva diseño actual y cinco tabs. Público de 50–60 años: acciones claras, letra legible, Mi grupo visible, detalles en una columna.

Distingue las decisiones confirmadas de P-01 a P-08 en clarifications.md. Resuelve solo las ambigüedades que afecten reglas de negocio antes de programarlas; no pidas nuevamente confirmar las decisiones ya respondidas. Continúa con tareas independientes mientras falta una respuesta. No marques las propuestas como aprobadas por inferencia.

Primero compara el inventario research.md con el código actual. Ya existen src/features/mentor, asignaciones de célula, chat, programa opcional, evidencias, academy, ranking_celulas y notificaciones. Extiende lo existente. No crees tablas de usuarios/mentores/chats/evidencias/rankings alternativas, no reescribas lógica ni la copies al frontend. La única nueva relación propuesta es el historial temporal de asignaciones, si sigue sin existir una equivalente; justifica toda migración aditiva.

Prioriza consistencia entre celulas.mentor_id, participantes_programa y miembros del chat. Una rotación debe cerrar/abrir intervalos reales, revocar accesos del saliente y conservar mensajes. No confundas alumno sin datos con incumplidor ni evidencia entregada con aprobada. No derives meses históricos usando el mentor actual.

Implementa tasks.md en orden de dependencias, una tarea cada vez, subdividiendo las que excedan 30 minutos. Para reglas y adaptadores, escribe pruebas primero. Actualiza estado y evidencia real de cada tarea. No pares para pedir permiso tras cada cambio reversible dentro del alcance.

Antes de escribir código Expo lee https://docs.expo.dev/versions/v57.0.0/. Respeta useResponsive, tipografía Jost, controles táctiles, scroll único y useSystemBackHandler, incluyendo comprobación real de gestos/modales. No instales Mantine web ni skills/MCP solo por aparecer como inspiración en conversaciones anteriores.

Backend conserva arquitectura hexagonal/APIs públicas y pruebas con Testcontainers Cloud según las reglas; no sustituir Cloud por Docker local. Frontend debe pasar npx tsc --noEmit. Para push, reutiliza notifications y PushPort: el adaptador observado solo enviaba WEB, por lo que debes completar y probar la entrega nativa y recibos. Si faltan credenciales/build de dispositivo, indica el bloqueo exacto y sigue lo independiente; no inventes pruebas aprobadas.

Al terminar, entrega archivos cambiados, trazabilidad RF→prueba, comprobaciones ejecutadas, capturas de UI verificadas, migraciones justificadas y dependencias externas pendientes. No declares terminado el SDD de implementación si faltan requisitos o pruebas obligatorias. Ante cambio de alcance, actualiza primero spec/plan/tasks y después código.

---

