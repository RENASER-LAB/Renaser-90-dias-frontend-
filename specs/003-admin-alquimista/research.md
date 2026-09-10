# Estado inspeccionado — revisión 2

La evidencia detallada y el inventario sin commit están en REPORT_ANALISIS.md. No usar comentarios, migraciones o nombres de pruebas como evidencia de flujo terminado.

## Frontend comprobado

- package.json: Expo ~57.0.18, React Native 0.86.3, React 19.2.3, TypeScript ~6.0.3.
- RootNavigator: cinco tabs y flujo de mapa separado.
- AuthContext: consulta capacidadesDePrograma desde /api/v1/mentor/context para exención de onboarding.
- HoyScreen: useProgramaPersonal(esMentor). useEsMentor reconoce MENTOR, MENTOR_LEAD y LIDER_MENTORES; no ADMIN ni ALQUIMISTA.
- No existe feature admin ni consumo funcional del CRUD administrativo en este frontend. Los schemas legacy de mentor con rutas admin en comentarios no son pantallas de administración.
- Reutilización directa: RejillaSemanal, useSemanaDelAlumno, hooks de evidencias, chat, avisos, pushNativo y rutaDeAviso.
- Comunidad contiene catálogo de cursos, detalles y reproductor. Training contiene hábitos y acciones de objetivos.
- No hay contratos frontend para periodStart, periodEnd, clearPeriod o especialidad del mentor.

## Backend comprobado

| Superficie | Estado |
|---|---|
| Solicitudes, staff, aprendices, cohortes, células | Controllers y casos de uso existentes |
| Período de grupos y especialidad | V48 y PeriodoGrupo confirmados en HEAD; integración CRUD/JPA y especialidad en cambios locales |
| Rotación y traslado automáticos | Schedulers condicionados a enabled=true y apagados por omisión |
| Política antigua | Aún conserva diaTraslado=4; no representa por sí sola la nueva bienvenida |
| Historial de acompañamiento | asignaciones_celula, ConjuntoAsignaciones y APIs existentes |
| CRUD manual de miembros | Actualiza punteros anteriores; falta integración demostrada con historial y evento de composición |
| Vencimiento | Reglas y nuevos servicio/evento/scheduler/listener en trabajo local; integración pendiente de verificar |
| Hábitos de aprendiz | GET administrativo de configuración efectiva, horarios, cuota y personalización |
| Semana del aprendiz | SeguimientoService exige relación vigente de acompañamiento; no es lectura admin global |
| Permisos | ADMIN y ALCHEMIST aún devuelven true en UserRole.can; hay guards específicos |
| Programa de staff | Activación y varias funciones disponibles; contratos de fase todavía excluyen ADMIN/ALCHEMIST |
| Push | Transporte Expo, registro nativo, avisos y web push existentes; entrega real no probada en esta auditoría |

## Reutilización de datos

- celulas y su período: identidad del grupo.
- asignaciones_celula: intervalos y funciones; autoridad para seguimiento, chat y atribución.
- participantes_programa: participación personal y punteros de compatibilidad.
- perfiles_mentor: especialidad; no crear tabla espejo de mentores.
- registros_habito: obligaciones y estados históricos.
- preferencias, cambios pendientes y horarios: configuración personal; no equivalen a cumplimiento.
- evidence: entregas y revisión; points: evaluación/ranking.
- notifications: avisos y transporte; no duplicar con tabla de alertas de admin.

No reutilizar una tabla de auditoría de roles para almacenar cualquier acción: su significado se conserva. Usar eventos o auditoría del dominio correspondiente; justificar únicamente la persistencia que falte.
