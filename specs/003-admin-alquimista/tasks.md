# Tareas de implementación — revisión 2

La lista anterior mezclaba automatización superada con funciones existentes. Esta revisión reemplaza esa lista; ninguna casilla marcada implica implementación realizada. REPORT_ANALISIS.md distingue trabajo previo de tareas pendientes.

## Inventario y contrato

- [x] T01. Releer HEAD/diff de ambos repos y verificar qué avanzó después del corte. Salida: contratos reales actualizados, sin sobrescribir cambios locales. ARF-01–18.
- [x] T02. Inventariar autorización de cada ruta admin y contexto de programa; definir capacidades efectivas sin usar el all-true de UserRole.can. ARF-01/15. Prueba: admin, alchemist, aprendiz y suspendido.
- [ ] T03. Cerrar semántica de bienvenida tardía antes de su automatización; conservar tareas independientes en marcha. ARF-04.

## Backend de grupos — prioridad alta

- [x] T04. Integrar asignación/retirada manual con ConjuntoAsignaciones, CupoCelula, intervalos, punteros y evento de chat. No copiar TrasladoService. Depende T01. ARF-05/06. Pruebas: asignar, retirar, reintentar y conflicto.
- [x] T05. Completar períodos en CRUD/lecturas sobre trabajo V48 existente. Incluir tipo/capacidad solo con contrato explícito. Depende T04. ARF-05/18. Pruebas: crear, renombrar sin borrar fechas, clearPeriod y legacy.
- [x] T06. Completar especialidad de mentor y su lectura en candidatos, preservando null. Reusar cambios locales de perfiles_mentor. ARF-05. Prueba: persistencia, filtros y rechazo al mentor que modifica su propia especialidad sin permiso.
- [x] T07. Modelar vigencia futura/cierre y revocar acceso en app/chat manteniendo archivo administrativo. Depende T04/T05. ARF-18. Pruebas: límites de fecha, pertenencias futuras, cierre recuperado.
- [ ] T08. Implementar ingreso automático específico a bienvenida vigente; no habilitar schedulers legacy. Depende T03/T04/T07. ARF-03/04. Pruebas: ingreso repetido, ninguna bienvenida y múltiples candidatas.
- [ ] T09. Completar aviso por vencimiento reutilizando servicio/evento/listener/V49 en curso. Revisar adapter, paginación, zona y deduplicación. ARF-12/18. Pruebas: último día, reintento, cambio de fin, ya vencido.

## Backend de lectura y programa personal

- [x] T10. Exponer semana administrativa con guard propio y cálculo histórico compartido. Mantener 403 de mentor ajeno. ARF-07/08/15. Pruebas: admin global autorizado, exmentor, semana sin datos y zona del alumno.
- [x] T11. Verificar paridad de ADMIN/ALCHEMIST en todo el programa propio, especialmente phasecontracts. Corregir solo las barreras necesarias para participación propia activa. ARF-16. Pruebas: activado/no activado, firma propia y rechazo sobre otro.
- [ ] T12. Conectar hábitos personalizados y catálogo a contratos actuales; ampliar consultas faltantes sin crear otro modelo. ARF-09/10. Pruebas: personal vs general, horario efectivo e historia inmutable.
- [x] T13. Añadir búsqueda/filtros de aprendices/evidencias solo donde falten al flujo, con paginación real. ARF-02/07/11. Pruebas: coincidencia fuera de primera página, permisos y límites.
- [ ] T14. Revisar autorización de archivos, chat, avisos, soporte y ranking al operar como admin; reutilizar motores y transportes. ARF-11–15. Pruebas: lectura/mutación, enlaces de push y ausencia de métricas inventadas.

## Frontend

- [x] T15. Crear feature admin y acceso desde Hoy/Yo por capacidad, con estados loading/error/sin permiso. Depende T02. ARF-01/02/15/17.
- [x] T16. Habilitar programa personal para ADMIN/ALQUIMISTA sin cambiar rol; conservar/posponer por cuenta, abrir onboarding cuando elija cursar. Depende T11. ARF-16.
- [x] T17. Listado y formulario de grupos manuales: períodos, mentor/especialidad, aprendices y confirmación de composición. Depende T04–07. ARF-05/06/18.
- [x] T18. Recepción y solicitudes con estado separado de aprobación, ingreso y pendiente. Depende T08. ARF-03/04.
- [x] T19. Ficha de aprendiz: configurar lectura de hábitos, reutilizar RejillaSemanal y separar evidencias. Adaptar fuente admin sin copiar cálculos ni hooks completos. Depende T10/T12. ARF-07/08/10.
- [ ] T20. Catálogo general: formularios hidratados, guías, horarios y adjuntos con métodos HTTP verificados. Depende T12. ARF-09.
- [ ] T21. Evidencias, avisos y chat con filtros reales, lectura vs resolución y revocación de acceso. Depende T13/T14. ARF-11/12.
- [ ] T22. Más opciones: soporte, staff, roles, comunidad y conocimiento con rutas y permisos existentes. Cursos quedan en Comunidad. ARF-14/15.
- [x] T23. UX 50–60: un scroll, texto/contraste, targets, móvil compacto, Xiaomi, tablet, teclado y useSystemBackHandler. ARF-17.
- [x] T24. Revisar caché, logout/cambio de cuenta, borradores y entrada/salida de Administración. ARF-01/16/17.

## Validación y entrega

- [ ] T25. Ejecutar pruebas de dominio y adaptadores de los cambios; ArchitectureTest y EndpointAuthorizationDeclarationTest. Validar casos V01–V30.
- [ ] T26. Ejecutar backend ./scripts/test-cloud.sh con JDK25/Testcontainers Cloud en target no compartido y frontend npx tsc --noEmit. Registrar evidencias reales.
- [ ] T27. Cerrar después de T28–T33: probar flujos autorizados en dispositivos, actualizar contratos/resultados y entregar E2E_RESULTADOS.md; informar pendientes sin declararlos terminados.

Lectura de mapa/objetivos ajenos queda condicionada a inventario y autorización específica (E-06); no es permiso para inventar un endpoint ni copiar respuestas del onboarding.

## E2E solicitado por el usuario — ejecutar antes de T27

- [x] T28. Preparar runner y entorno coordinado: app Expo, backend real, Cloud, login X-Auth-Token, Clock y fixtures aislados por ejecución. Reutilizar infraestructura; documentar un comando reproducible. Depende T01/T02; puede avanzar antes de las pantallas.
- [x] T29. Implementar E01–E07 de e2e.md: acceso, programa propio, bienvenida y grupos manuales. Ejecutar contra backend/DB reales; parametrizar ADMIN/ALCHEMIST.
- [x] T30. Implementar E08–E14: hábitos, semana, evidencias, chat, avisos, cierre y métricas; comprobar persistencia y sesiones distintas.
- [x] T31. Implementar E15–E17 y comprobaciones de API complementarias: autorización, responsive, cambio de cuenta, reintentos y concurrencia.
- [x] T32. Implementar y ejecutar smoke nativo Maestro E01/E02/E04/E08/E10/E11/E16. Registrar Android/iOS, teclado, volver y evidencia; separar ejecución pendiente por host/dispositivo.
- [ ] T33. Ejecutar suite integrada, revisar fallos/reintentos y entregar E2E_RESULTADOS.md con comandos, contadores, capturas/trazas y bloqueos específicos. No marcar E2E terminado con pruebas simuladas o solo typecheck.


---

## Estado tras la implementación del 2026-09-10

Marcado `[x]` = **implementado**, no necesariamente **ejecutado**. La distinción importa y
`E2E_RESULTADOS.md` la sostiene caso por caso.

### Terminadas y verificadas

T01, T02, T04, T05, T06, T07, T10, T11, T13, T15, T16, T17, T18, T19, T23, T24. La evidencia es
2951 pruebas unitarias, ArchitectureTest (8) y EndpointAuthorizationDeclarationTest (4) en verde,
y `npx tsc --noEmit` sin errores.

### Implementadas pero NO ejecutadas

T28–T32. La suite se recoge entera (`npx playwright test --list` → 24 casos en 4 archivos) y no
corrió ninguno: falta navegador, entorno aislado y cuentas de prueba. Los tres bloqueos con su
salida real están en `E2E_RESULTADOS.md` §3.

### Parciales, con motivo

- **T08** (ingreso automático a bienvenida): el servicio ya existía del SDD anterior
  (`IngresoARecepcionService`). Lo que faltaba y ahora está es poder CREAR el grupo de recepción
  desde la API — antes el DTO no admitía `type`, así que el administrador no podía armar la
  bienvenida que ese ingreso necesita.
- **T09** (aviso por vencimiento): el servicio, el evento, el listener y V49 venían del trabajo
  anterior y se conservan. Lo que se corrigió acá es que un grupo fuera de su período deja de
  generar avisos de inactividad.
- **T12** (hábitos personalizados y catálogo): el GET administrativo de hábitos ya existía y se
  consume desde la ficha. La EDICIÓN del catálogo no entra en la app: son formularios largos de
  pantalla grande, y ofrecer una entrada que lleva a una pantalla a medias es peor que decir dónde
  está (ver `MasOpcionesScreen`).
- **T14** (autorización de archivos, chat, avisos, soporte y ranking): se revisó y se reutiliza lo
  existente (evidencia con URL firmada al abrir, chat 1 a 1 sin envío automático). No se amplió
  ninguna superficie.
- **T20, T21, T22**: catálogo, bandeja de evidencias y opciones institucionales quedan listadas en
  "Más opciones" con su lugar real, sin duplicar el editor de cursos ni inventar una analítica
  nueva. Es una decisión de alcance, no un olvido.

### Sin cerrar

- **T03** (semántica de bienvenida tardía): sigue siendo una decisión de negocio. No se automatizó
  y no se alteró el reloj del programa para disimularla.
- **T25, T26**: las pruebas de dominio y arquitectura corrieron; las de integración **no**, por
  falta de token de Testcontainers Cloud.
- **T27, T33**: el cierre no se declara. `E2E_RESULTADOS.md` dice exactamente qué falta.
