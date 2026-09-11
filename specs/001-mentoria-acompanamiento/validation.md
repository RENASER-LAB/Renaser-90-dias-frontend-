# Validación y criterios de aceptación

Estado: **plan de pruebas; no ejecutado en esta entrega documental**. Registrar nombre real de test, resultado y evidencia al implementar.

| Caso | RF | Prueba esperada / resultado |
|---|---|---|
| V01 | RF-01, RF-02 | Mentor sin tracking entra a acompañamiento; opta por no iniciar. Luego activa una sola participación y usa objetivos, horario, Mapa y evidencias propias. Aprendiz sigue obligado a su onboarding. |
| V02 | RF-03 | Mentor abre curso, lección y recurso publicado antes del día requerido al aprendiz. Borrador no visible; programa diario propio mantiene orden. |
| V03 | RF-04, RF-28 | Admin asigna guías por UUID/email; duplicados idempotentes, inactivo/rol no elegible rechazado; mentor común no modifica política. |
| V04 | RF-05, RF-06 | Aprendices de distinta fecha ingresan según su propio día 1–3; recepción admite más de 15 y pagina. Guía asignado responde; ajeno no lee. |
| V05 | RF-07, RF-29 | A las 04:59 UTC en Lima aún puede ser día local previo. Cambio al día4 se procesa una vez; no depende de apertura de app. |
| V06 | RF-08, RF-09 | Dos transacciones compiten por último cupo; una usa otro grupo/espera, ninguna excede 10. Soporte y mentor no consumen lugares. |
| V07 | RF-09, RF-11 | Grupo lleno, falta de tutor o soporte: estados de cobertura/provisión visibles; no chat inaccesible ni membresía perdida. |
| V08 | RF-10, RF-12 | Rotación mensual/semanal cambia mentor, conserva grupo/chat/alumnos y soporte. Cambio de mes corto y anclaje probados. |
| V09 | RF-10, RF-11, RF-29 | Intercambio A/B bajo UNIQUE; fallo entre pasos hace rollback. Repetir operación no abre otros intervalos. |
| V10 | RF-12, RF-29 | Job atrasado varias semanas registra transición real al recuperar; no atribuye días pasados a sustitutos que no acompañaron. |
| V11 | RF-13, RF-25 | Exmentor con token y conversationId válidos no lee/envía/marca leído/obtiene media. Evento viejo no lo reincorpora. Nuevo mentor ve historia y soporte permanece. |
| V12 | RF-14, RF-25 | Manipular groupId/userId no devuelve nombre, métricas, evidencia ni adjunto de otro grupo. Evaluación histórica propia no filtra expedientes. |
| V13 | RF-15, RF-16 | Semana combina cumplido, pendiente futuro, no cumplido vencido, no programado y sin datos. Reprogramar hoy no reescribe semana anterior. |
| V14 | RF-17 | Evidencia entregada pendiente/rechazada cuenta como entrega según fórmula, revisión separada. Mentor lee propia y alumno actual; no obtiene aprobación administrativa. |
| V15 | RF-18, RF-29 | Ausencia con 3 días completos y pendiente vencido generan aviso lógico único. Sin historial/programa o día futuro no dispara falso aviso. |
| V16 | RF-19 | Transporte WEB continúa; IOS/ANDROID usan proveedor correcto. Error temporal reintenta; token inválido se desactiva; aviso en app permanece. |
| V17 | RF-20 | “Mensaje” abre directo existente; cancela sin envío; envío manual genera solo el mensaje confirmado. |
| V18 | RF-21 | Ana 2/4 y Luis 3/3 produce 75%, no 71,43%. Múltiples archivos para una obligación cuentan una vez. |
| V19 | RF-22 | Sin obligaciones devuelve NO_SAMPLE; sin historia NO_HISTORY; cobertura parcial identificada. Ningún null se convierte a 0 o “al día”. |
| V20 | RF-23 | Rotación a mitad de mes, alumno que entra después, reingreso y entrega tardía: atribución exacta al intervalo acordado; sin crédito doble ni deuda ajena. |
| V21 | RF-24 | Ranking entre grupos usa mismo motor, excluye recepción; empate y muestra correctos. Ranking de puntos CELL/GENERAL permanece idéntico. |
| V22 | RF-25 | Push viejo después de rotación o sesión caducada revalida destino; pantalla segura. URL de archivo no se emite sin permiso. |
| V23 | RF-26 | Desde Hoy y Comunidad se llega al mismo grupo. Plan/Training/Yo y cinco tabs siguen disponibles con y sin programa personal. |
| V24 | RF-27 | 320/360/390/440/768 px, Android alto/Xiaomi e iOS; fuente ampliada, teclado, gesto atrás y modales sin doble scroll, recorte ni pérdida de datos. |
| V25 | RF-28 | Cambiar capacidad de 15 a 10 con 12 integrantes no expulsa a nadie; bloquea altas. Cambio de cadencia es prospectivo. |
| V26 | RF-29, RF-30 | Publicaciones duplicadas/fuera de orden, reinicio de worker, reconciliación y migración conservan datos. Aislar fallo de un grupo permite procesar otros. |

## Checks de implementación
- Backend: usar JDK 25 real del entorno; leer ./scripts/test-cloud.sh y reglas de pruebas antes de ejecutar ./mvnw clean verify con Testcontainers Cloud. Inspeccionar pruebas efectivas, no solo exit code. No lanzar dos builds sobre target simultáneamente.
- Deben pasar ArchitectureTest y EndpointAuthorizationDeclarationTest y las pruebas de reglas/adaptadores afectadas.
- Frontend: npx tsc --noEmit con cero errores; export web si se modifican rutas/render compatible web; registrar errores preexistentes separadamente, sin ocultarlos.
- Verificación funcional en dispositivo/build compatible para push nativo: foreground, background, app cerrada, permiso denegado, token renovado y deep link.
- Registrar capturas de pantallas resultantes al implementar y datos de prueba controlados; los mockups previos no sustituyen esta evidencia.

## Comprobación documental actual
Verificar archivos, enlaces relativos, RF referenciados y que solo haya documentos nuevos en Git. No ejecutar suites de aplicación para una entrega exclusivamente Markdown. La validación funcional permanece pendiente hasta implementación.

Resultado documental: 10 archivos canónicos y una referencia en backend; enlaces locales existentes, bloques Markdown cerrados y RF-01 a RF-30 presentes en especificación, tareas y matriz. 53 tareas sin marcar como implementadas. No se ejecutaron pruebas de aplicación. Los dos archivos Redis modificados concurrentemente en backend se dejaron intactos; no pertenecen a esta entrega documental.
