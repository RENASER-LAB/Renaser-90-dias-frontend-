# Pruebas E2E — ampliación del SDD 003

Pedido explícito del usuario: implementar las pruebas de extremo a extremo junto al frontend y backend. Estado de este documento: plan de pruebas; suite todavía no implementada ni ejecutada.

## Alcance y herramientas

No se encontró runner E2E en el frontend inspeccionado. El smoke test del backend admin-panel/scripts/prueba-local.mjs usa un backend simulado y un panel distinto: no sustituye esta suite.

Usar Playwright para recorrer la versión web de esta misma app Expo contra el backend Spring real. Su configuración admite coordinar el servidor de la aplicación y esperar disponibilidad. [Documentación de webServer](https://playwright.dev/docs/test-webserver).

Usar Maestro para los recorridos nativos esenciales en Android y iOS. Expo documenta su uso para E2E; la automatización nativa complementa las pruebas web. [Guía oficial de Expo](https://docs.expo.dev/eas/workflows/examples/e2e-tests/).

Antes de introducir dependencias, releer los repositorios y reutilizar cualquier runner que otro agente haya incorporado. Verificar compatibilidad y versiones con Expo57; no actualizar React Native/Expo para montar los tests. No activar servicios de CI nuevos, contratar EAS/Maestro Cloud ni desplegar por esta tarea.

## Entorno real, aislado y reproducible

1. Backend Spring real, migraciones Flyway reales y PostgreSQL/Redis de pruebas en Testcontainers Cloud. Sesión real mediante login y X-Auth-Token, sin inventar JWT, cookies ni roles inyectados en el navegador.
2. Frontend de pruebas con URL de backend explícita y modo demo desactivado. Comprobar que cada runner puede llegar al servidor, especialmente desde emulador. No hardcodear localhost para Android.
3. Un único coordinador mantiene vivos backend, contenedores y frontend hasta terminar los runners. Puede reutilizar el ciclo de SpringBootTest con puerto real y ejecutar el runner como proceso hijo desde un perfil E2E. No asumir que test-cloud.sh deja recursos vivos después de terminar Maven.
4. Reutilizar test-cloud.sh para conexión a Cloud y los fixtures existentes. No arrancar otra sesión simultánea del agente Cloud bajo el mismo usuario ni otro build en el mismo target.
5. Fixtures por ejecución: ADMIN y ALCHEMIST con/sin programa; mentor actual y saliente; aprendices activos y cuenta suspendida; cohorte, bienvenida, grupos vigentes/futuros/cerrados; hábitos generales/personales, evidencias y sesiones.
6. Usar runId para aislamiento. Preparar y limpiar solo datos del entorno de pruebas mediante utilidades de test; nunca truncar una base compartida. Los casos son independientes y no necesitan ejecutarse en un orden global.
7. Fechas deterministas mediante Clock sustituido únicamente en configuración de pruebas. Incluir antes/durante/después del período y medianoche local; no cambiar el reloj del sistema ni esperar días reales.
8. Credenciales, sesiones, archivos de evidencia y tokens de prueba fuera de Git y de trazas compartibles. No invocar contactos reales.
9. Autenticación, permisos, composición, historial, hábitos y evidencias no se simulan en los recorridos de aceptación. Las inyecciones de error de red se reservan para los casos de resiliencia y se etiquetan.
10. Correo/push y servicios externos usan destinos propios de prueba o dobles en el límite del proveedor, declarados en el reporte. Una entrega capturada por un doble no demuestra entrega real al dispositivo. Para evidencias, probar subida/confirmación/lectura mediante almacenamiento de pruebas que respete el contrato.

Los cambios de datos que se están probando deben realizarse desde la UI. Usar API/utilidades para preparación y comprobación posterior no convierte un test de API en un recorrido de interfaz.

## Matriz de recorridos

Ejecutar E01–E17 en web contra backend real. Parametrizar ADMIN/ALCHEMIST en accesos, programa y operación principal. Los casos nativos mínimos son E01, E02, E04, E08, E10, E11 y E16; el resto comparte la lógica validada en web y API.

| ID | Recorrido y preparación | Comprobación final | Referencia |
|---|---|---|---|
| E01 | Login ADMIN/ALCHEMIST sin programa → Hoy → Administración → Mi programa | Acceso permitido, cinco tabs intactos y ningún programa creado automáticamente | ARF-01/16, V01/29 |
| E02 | Ahora no → logout → otra cuenta → iniciar programa → onboarding/mapa/objetivos/hábitos; fixture para fase de firma | Preferencia por cuenta, progreso persiste tras recargar/reabrir, contrato propio permitido y rol conservado | ARF-16, V03–05 |
| E03 | Revisar solicitud → aprobar → consultar bienvenida; repetir con reintento y con bienvenida ausente | Cuenta única, ingreso/pendiente real y grupo de siete días; no regreso al traslado automático | ARF-03/04, V06–08 |
| E04 | Crear grupo con fechas → elegir mentor/especialidad → agregar aprendices → reabrir | Datos persistidos, cupo y miembros correctos; mentor/aprendiz ven el grupo correspondiente en sesiones separadas | ARF-05/06, V09/12 |
| E05 | Llenar grupo de 10 → intentar uno más → ampliar a 15 → repetir límite | Rechazo del exceso también en servidor; soporte no consume cupo | ARF-05, V11 |
| E06 | Renombrar sin cambiar fechas → programar grupo futuro → quitar período explícitamente en fixture separado | Fechas preservadas, grupo futuro no da acceso hoy y legacy no vence por accidente | ARF-05/18, V10/15/30 |
| E07 | Cambiar mentor o retirar aprendiz desde UI; consultar con sesiones anterior/nueva | Historial y punteros consistentes, acceso al chat actualizado; API negativa valida retirada desde grupo incorrecto | ARF-06/15, V12–14/19 |
| E08 | Aprendiz modifica hábito/horario y registra cumplimiento → ADMIN consulta semana → abre día | Configuración separada del cumplimiento; misma fecha/estado real en ambas sesiones; sin completar por el alumno | ARF-08/10, V22–24 |
| E09 | Crear hábito general → editar detalles/guía/horario → consultar historial previo | Contratos reales, formulario completo y snapshots conservados | ARF-09, V25 |
| E10 | Aprendiz sube evidencia → ADMIN la abre y revisa → aprendiz recarga | Archivo y estado persistidos, entrega distinta de revisión; probar void en fixture independiente | ARF-11, V26 |
| E11 | ADMIN abre hilo permitido → envía texto a cuenta de prueba → destinatario responde → volver y reabrir | Mismo hilo, mensajes persistidos, borrador conservado y sin envío automático | ARF-07/12, V12/19 |
| E12 | Ejecutar detección de vencimiento con Clock controlado → abrir aviso → repetir detección | Aviso único por grupo/período, enlace correcto y estado de lectura real | ARF-12/18, V20/21 |
| E13 | Grupo en último día → avanzar Clock al cierre → consultar como admin/aprendiz/mentor | Último día inclusivo, archivo admin y revocación de acceso; recuperación tras ejecución omitida | ARF-18, V16–18 |
| E14 | Fixture de dos mentores con tramos y entregas dentro/fuera de ventana → consultar ranking/evaluación | Totales y atribución coinciden con valores esperados predefinidos, sin usar la propia función como oráculo | ARF-13, V27 |
| E15 | Login aprendiz/suspendido y exmentor → intentar ruta/recurso administrativo | Denegación también en API y ausencia de datos; falsear UI no concede acceso | ARF-15, V02/22 |
| E16 | Lista con varias páginas → detalle → modal/formulario con teclado → volver → cambio de cuenta | Búsqueda real, un scroll, datos aislados, botones alcanzables y salida correcta | ARF-01/17, V28/29 |
| E17 | Interrumpir red en envío/consulta → reconectar/reintentar/recargar | Borrador conservado, mensaje accionable, sin duplicación ni error convertido en cero | ARF-02/06/17, V14/28 |

E03 no inventa la regla pendiente de entrada tardía: ejecutar la variante inequívoca y registrar esa subvariante bloqueada hasta decidirla.

Complementar con integración de API para carreras concurrentes, invariantes SQL y permisos negativos difíciles de provocar desde UI. No duplicar toda esa matriz en varios runners.

## Cobertura de dispositivos

- Web: Chromium en móvil 360px; smoke responsive en 320px y tablet 768px o más. Anchos de viewport no certifican comportamiento nativo.
- Android: build de pruebas de esta app en emulador/dispositivo; cubrir teclado, selector de evidencia, persistencia y volver.
- iOS: build de pruebas en simulador/dispositivo en host compatible. Si no hay host, entregar los flujos y documentar la ejecución pendiente; no declarar iOS validado.
- Gesto lateral, Xiaomi y fuentes ampliadas: comprobar físicamente cuando el runner no pueda reproducirlos con fiabilidad. Registrar qué fue automático y qué fue manual.
- Push real: prueba adicional con token/dispositivo de prueba y proveedor configurado. Un deep link abierto manualmente solo valida la ruta, no el transporte.

## Automatización mantenible

- Localizadores por rol accesible, etiqueta y testID estable cuando haga falta. Evitar índices, coordenadas y XPath ligado al diseño.
- Esperas por estado observable o polling con límite para chat/eventos; sin sleeps fijos ni reintentos que oculten fallos.
- Una sesión/contexto por actor; no compartir storageState entre usuarios.
- Assertions sobre UI y persistencia después de reabrir. Una captura sin aserciones no prueba el flujo.
- Registrar fallos iniciales y reintentos; un resultado flaky queda señalado y requiere análisis.
- No añadir endpoints de prueba accesibles en producción. El seed/Clock de pruebas viven en test sources/perfil aislado, sin relajar guards.

## Archivos y comandos a entregar

Son propuestas a crear durante la implementación; hoy no existen:

- Frontend: playwright.config.ts, e2e/admin-alquimista/, fixtures y soporte compartido; .maestro/admin-alquimista/ para recorridos nativos.
- Backend: reutilizar src/test, TestcontainersConfiguration y Clock/fixtures; agregar las pruebas de API y el coordinador mínimo para mantener el entorno.
- Scripts documentados con un comando raíz E2E y un comando nativo. Si se eligen npm run test:e2e y npm run test:e2e:native, primero implementarlos; no listarlos como ejecutados antes.
- tests/results o artifacts/e2e ignorados por Git; reportes JUnit/HTML, capturas y trace/video de fallos donde el runner lo soporte.
- E2E_RESULTADOS.md dentro de este paquete con fecha, HEAD de ambos repos, estado de working tree, comando exacto, entorno, fixtures/runId, navegador/dispositivo, ejecutadas/pasadas/fallidas/bloqueadas y enlaces a evidencia.

## Criterio de cierre

Entregar código, fixtures, comandos reproducibles y resultados reales. Las pruebas unitarias, de API, de UI con mocks y E2E se reportan separadas. No declarar completado el E2E por tsc, clean verify sin runner de UI, una captura o el panel de solicitudes simulado.

Si falta Cloud, build nativo, proveedor o dispositivo, registrar el escenario concreto como bloqueado y completar los demás. No convertir un bloqueo en skip silencioso ni declarar todo el rol validado.
