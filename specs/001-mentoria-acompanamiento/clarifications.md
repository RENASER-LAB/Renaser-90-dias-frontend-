# Aclaraciones y decisiones

## Confirmadas por el usuario
| ID | Decisión |
|---|---|
| D-01 | Grupo estable de 10 aprendices inicialmente; capacidad configurable, ampliable a 15. |
| D-02 | Rotación mensual del mentor inicialmente; opción semanal. |
| D-03 | Calificación basada en evidencias entregadas durante la asignación del mentor. La verificación se muestra aparte. |
| D-04 | Alertas dentro de la app y notificaciones push. |
| D-05 | Recepción sin límite de aprendices durante los primeros tres días individuales del programa. |
| D-06 | Rotan mentores; alumnos, identidad del grupo y chat permanecen. ADMIN/ALCHEMIST son soporte. |
| D-07 | Mentor conserva funciones del aprendiz y puede realizar el programa personal de 90 días opcionalmente. Cursos desbloqueados. |
| D-08 | Seguimiento por alumno, hábitos por día/semana, evidencias, contacto manual y ranking entre grupos. |
| D-09 | Respetar diseño actual, cinco tabs, público de 50–60 años, reutilización y planificación sobre master. |

## Propuestas operativas explícitas
Estos detalles completan el diseño; no fueron respuestas expresas del usuario. El agente debe registrar su aceptación o ajuste en la fase de clarificación antes de implementar la regla afectada, sin detener el inventario, contratos o trabajo independiente.

| ID | Propuesta | Qué afecta |
|---|---|---|
| P-01 | Recepción por cohorte. Día 1–3 inclusivos según día real del programa y zona del participante; transferencia desde día 4. | Personas que ingresan en fechas distintas; no usar fecha de creación de cuenta. |
| P-02 | Rotación mensual el primer día del mes, semanal el lunes, en zona de la cohorte (Lima como valor inicial). Efecto real al procesar, sin retrofechar. | No es equivalente a 30 días desde cada asignación. |
| P-03 | Si no hay mentor alternativo, mantener al actual y marcar rotación pendiente; si no hay ninguno, soporte cubre sin fingir un mentor. | Continuidad y evaluación de intervalos sin tutor. |
| P-04 | Al llenarse grupos, crear uno regular en la misma cohorte reutilizando el caso de uso y soporte configurado. Si falta soporte/configuración, conservar acceso transitorio a recepción y alertar al administrador. | Excepción operativa visible a la salida del día 3, nunca dejar a alguien sin chat. |
| P-05 | Medir con promedio de porcentajes individuales; solo obligaciones de evidencia vencidas en la ventana evaluada. No atribuir al mentor nuevo deudas anteriores. | Fórmula y entregas tardías, detalladas en plan.md. |
| P-06 | Ausencia: 3 días locales completos sin actividad relevante, reutilizando el umbral existente; pendientes solo después de vencer. Parámetros configurables. | Frecuencia, falsos positivos y ruido de push. |
| P-07 | Recepción deja de ser accesible al aprendiz tras traslado; nuevo mentor ve el historial del chat estable. El mentor saliente conserva su resumen agregado de evaluación, no el expediente del alumno. | Privacidad e historial. |
| P-08 | Ranking mensual dentro de cohorte, recepción excluida, empate comparte posición; grupos sin muestra aparecen sin calificación. | Comparabilidad y presentación. |

No inventar correos de guías ni asignaciones reales. El administrador proporciona usuarios existentes. El nombre “guía” describe una función de acompañamiento; no presupone un nuevo rol global.

## Dependencias de puesta en marcha
- Usuarios reales para guías, soporte y mentores; cohorte y zona configuradas.
- Credenciales y build nativo para push; no guardar secretos en documentos ni pedirlos en texto público.
- Acceso al entorno de pruebas Cloud exigido por backend.
- Datos históricos: el estado actual de mentor_id no demuestra quién estuvo asignado meses atrás. Empezar historial verificable desde la migración o importar solo fuentes auditables. Marcar períodos anteriores como no disponibles.

