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

---

## Estado real de V01–V30 tras la implementación del 2026-09-10

`PASA` significa que hay una prueba automática que lo sostiene y que **corrió**. `IMPLEMENTADO`
significa que el comportamiento está y la prueba existe, pero no se ejecutó por el bloqueo de
entorno que detalla `E2E_RESULTADOS.md`. `PENDIENTE` es lo que no se hizo.

| Caso | Estado | Dónde |
|---|---|---|
| V01 · ADMIN/ALCHEMIST sin programa opera | **PASA** | Verificado en vivo: `canAdminister:true` con `personalProgram.enrolled:false` |
| V02 · Aprendiz/suspendido pide admin | IMPLEMENTADO | `E15`, `E15b`. Los guards ya existían y `AcompanamientoServiceTest` los cubre |
| V03 · Iniciar programa como staff | **PASA en parte** | La invitación aparece para un ADMIN (verificado en vivo). El recorrido completo es `E02b` |
| V04 · Contratos de fase del staff activo | **PASA** | `ContratoServiceTest`: firma con programa activado, 403 sin activar |
| V05 · "Ahora no" y cambio de cuenta | IMPLEMENTADO | Clave por `userId` en `useProgramaPersonal`; recorrido `E02` |
| V06 · Aprobar dos veces | IMPLEMENTADO | Guard preexistente; `SolicitudesAdminScreen` informa el estado real |
| V07 · Ingreso a bienvenida vigente | **PASA** | `IngresoARecepcionServiceTest` (preexistente) |
| V08 · Sin bienvenida o varias candidatas | **PASA** | `IngresoARecepcionServiceTest`: WARN y sin selección arbitraria. La UI lo dice al aprobar |
| V09 · Crear grupo con período | **PASA** | `CelulaServiceTest` + `Celula.periodoDe`: las dos fechas o ninguna |
| V10 · Renombrar / clearPeriod | **PASA** | `CelulaServiceTest`: un PATCH que solo renombra no borra el período |
| V11 · Cupo 10 y ampliado a 15 | **PASA** | `ComposicionDeCelulaIT.elCupoSeSostieneEnElServidor` y `elMentorNoOcupaLugar` |
| V12 · Alta manual coherente | **PASA** | `ComposicionDeCelulaIT.elAltaDejaHistorialPunteroYPertenencia` |
| V13 · Retirar de otro grupo | **PASA** | `ComposicionDeCelulaIT.retirarDesdeOtroGrupoNoLoSacaDelSuyo` |
| V14 · Dos asignaciones concurrentes | **PASA** | `AsignacionCelulaConcurrenciaIT` (preexistente) + `elAltaRepetidaNoDuplica` |
| V15 · Grupo futuro | **PASA** | `ComposicionDeCelulaIT.elGrupoFuturoNoDaAccesoTodavia` |
| V16 · Último día / madrugada | **PASA** | `PeriodoGrupoTest` y `Celula.vencidoEn` con día por parámetro |
| V17 · Cierre con caída/reintento | **PASA** | `ComposicionDeCelulaIT.elGrupoCerradoRevocaElAccesoSinJob`: las filas siguen abiertas y el acceso ya no existe |
| V18 · Grupo cerrado | **PASA en parte** | Administración lo consulta (`E13`); el aprendiz no lo ve (`CelulaService.miCelula`, preexistente) |
| V19 · Cambio manual de mentor | **PASA** | `ComposicionDeCelulaServiceTest.cambioDeMentorCierraAlSaliente` |
| V20 · Aviso por vencer repetido | **PASA** | `AvisoDeGrupoPorVencerIT` (preexistente): misma clave de dedupe en dos barridos |
| V21 · Push tras perder acceso | IMPLEMENTADO | La revalidación sale del período (V17); el recorrido `E12` no se implementó |
| V22 · Semana admin y semana mentor | **PASA en parte** | Comparten `armarSemana`; el guard del mentor no se relajó. El contraste vivo es `E08` |
| V23 · Sin registros / futuro | IMPLEMENTADO | `SIN_DATOS` viaja y la ficha lo dice con palabras; recorrido `E08c` |
| V24 · Hábitos personalizados | IMPLEMENTADO | Lectura del endpoint existente; la ficha no ofrece completar ni firmar (`E08b`) |
| V25 · Cambio de catálogo | PENDIENTE | El catálogo no entró en la app en este alcance |
| V26 · Evidencias | **PASA en parte** | La ficha abre la evidencia con URL firmada al momento. La bandeja con `review`/`void` no entró |
| V27 · Ranking y evaluación parcial | IMPLEMENTADO | Motor único reutilizado; no se recalcula en el cliente |
| V28 · Búsqueda paginada y fallo de panel | **PASA en parte** | El fallo de panel se verificó en vivo: "—" y "Sin datos", sin tocar los otros. La búsqueda es `E16` |
| V29 · Navegación móvil/tablet | **PASA en parte** | Cinco tabs y vuelta por niveles, verificados en vivo. Tablet y gestos nativos: `E16b` y Maestro |
| V30 · Período/especialidad legacy null | **PASA** | Verificado en vivo: "SIN PERÍODO" y "Sin especialidad definida", ninguno inventado |
