# Validación — revisión 2

## Resultado real de esta auditoría

- Frontend: npm run typecheck, que ejecuta tsc --noEmit, completó con exit 0 y sin errores.
- Backend: inspección estática de controllers, servicios, DTO, guards, migraciones y cambios locales. No se ejecutó un build ni se enviaron mensajes/push.
- Al inspeccionar target no había reportes TEST-*.xml en surefire-reports ni failsafe-reports. No se puede afirmar que la integración actual esté en verde.
- Hay cambios concurrentes en backend; la foto del reporte no certifica archivos posteriores.
- No se modificó código funcional ni se validaron pantallas nuevas: el alcance fue auditar y corregir documentos.

## Casos que debe ejecutar la implementación

| Caso | Escenario | Resultado esperado |
|---|---|---|
| V01 | ADMIN/ALCHEMIST sin programa | Puede operar; inicio personal opcional |
| V02 | Aprendiz/suspendido solicita admin | Acceso denegado sin datos privados |
| V03 | Iniciar programa como staff | Misma identidad; onboarding/objetivos/hábitos/evidencias utilizables |
| V04 | Pactos de fase propios de staff activo | Firma/consulta dentro de reglas de día; no firma ajena |
| V05 | Ahora no y cambio de cuenta | Sin DELETE y preferencia aislada |
| V06 | Aprobar dos veces | Sin duplicar cuenta ni bienvenida |
| V07 | Ingreso a bienvenida vigente | Única pertenencia inicial conforme a decisión de siete días |
| V08 | Sin bienvenida o varias candidatas | Pendiente explícito, sin selección arbitraria |
| V09 | Crear grupo con período | Fechas inclusivas correctas; ambas o ninguna |
| V10 | Renombrar / clearPeriod | Nombre no borra fechas; borrado de período explícito |
| V11 | Cupo 10 y ampliado a 15 | Límite en servidor; soporte/mentor no consumen cupo |
| V12 | Alta manual de alumno | Historial, punteros y chat coherentes |
| V13 | Retirar alumno de otro grupo | Rechazo; no borrar su pertenencia real |
| V14 | Dos asignaciones concurrentes | Sin solapamientos ni mentor duplicado |
| V15 | Grupo futuro | No concede hoy pertenencia ni chat activos |
| V16 | Último día / siguiente madrugada | Fin inclusivo en zona correcta; caso 00–05 UTC |
| V17 | Cierre con caída/reintento | Historial conserva datos y acceso se revoca sin depender solo del job |
| V18 | Grupo cerrado | Administración lo consulta; aprendiz no lo ve como activo |
| V19 | Cambio manual de mentor | Ventanas reales, revocación y atribución correctas |
| V20 | Aviso por vencer repetido | Una notificación por grupo/período según deduplicación |
| V21 | Push abierto tras perder acceso | Revalidación; no filtra datos |
| V22 | Semana admin y semana mentor | Misma fuente; guard de mentor no se relaja |
| V23 | Sin registros / futuro | Sin datos o pendiente; no incumplimiento inventado |
| V24 | Hábitos personalizados | Configuración y cuota correctas; sin completar por el alumno |
| V25 | Cambio de catálogo | Snapshots históricos permanecen; DTO completo válido |
| V26 | Evidencias | Entrega/revisión separadas, review/void y archivo autorizados |
| V27 | Ranking y evaluación parcial | Motor único; entregadas dentro de asignación, verificadas aparte |
| V28 | Búsqueda paginada y fallo de panel | Resultados globales reales; error no convertido en cero |
| V29 | Navegación móvil/tablet | Cinco tabs, un scroll, targets y vuelta por gestos correctos |
| V30 | Período/especialidad legacy null | Sin vencimiento ni especialidad inventados |

## Evidencia de cierre requerida

Backend: ./scripts/test-cloud.sh ejecuta clean verify; revisar Surefire/Failsafe y pruebas de arquitectura/autorización. No ejecutar sobre un target en uso ni sustituir Cloud por Docker local. Reportar credenciales o conexión ausentes.

Frontend: npx tsc --noEmit y validación manual de flujos en compacto, Android/Xiaomi, iOS y tablet. La prueba de TypeScript por sí sola no verifica UX, permisos del servidor ni push real.

## E2E obligatorio añadido después de la auditoría

Implementar y ejecutar [e2e.md](e2e.md): E01–E17 recorren la app y el backend reales, con smoke nativo para las funciones de dispositivo. Relacionar sus resultados con V01–V30 sin confundir pruebas de API con pruebas de interfaz.

La implementación entrega E2E_RESULTADOS.md con estado PASADO/FALLIDO/BLOQUEADO por escenario, comandos exactos, fecha, HEAD de ambos repos, runId y evidencias. Estado actual: E2E planificado, todavía no implementado ni ejecutado. El typecheck de la auditoría previa no cubre este agregado.
