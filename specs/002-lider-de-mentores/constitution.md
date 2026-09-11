# Constitución de esta entrega

Seis principios innegociables. Si una tarea obliga a romper uno, se detiene la tarea y se
actualiza este documento primero — no al revés.

## CL-01 · No tocar lo que está en obra
La mentoría del 001 está en desarrollo por otro agente. Este paquete **no escribe** en
`community`, `chat`, `evidence`, `habits`, `points`, `notifications` ni en
`src/features/mentor/**`. Los consume por su API pública y por endpoints ya existentes. Si un
dato que hace falta todavía no existe ahí, **no se inventa ni se copia la lógica**: se muestra
como dato no disponible y se anota la dependencia. Antes de ejecutar, releer la tabla «Frontera
con el 001» del README y comprobar el estado real de ambos repos.

## CL-02 · La mitad de aprendiz del líder no es trabajo
`MENTOR_LEAD` ya puede recorrer el programa: `TRACK_PROGRAM_AS_STAFF`,
`/api/v1/mentor/activate-tracking` y `ParticipacionPrograma` lo admiten hoy. Ninguna tarea de
este paquete modifica ese camino. Lo único admisible es reutilizar el mismo gate de navegación
que el 001 construya para el mentor sin programa personal — **compartirlo, no clonarlo**.

## CL-03 · Reutilización verificable
Antes de crear algo, buscarlo. Ya existen: perfil de mentor con nivel y semáforo operativo
(`perfiles_mentor`), padrón de staff (`ListStaffUseCase`), bandeja completa de tickets de
mentoría (`VIEW_ALL_MENTOR_TICKETS`, que **ya es del líder**), chat directo canónico,
notificaciones, y el tema visual completo. Cada pieza nueva justifica por escrito qué capacidad
falta. No se crea un segundo sistema de usuarios, chat, notificaciones ni ranking.

## CL-04 · Gestionar no es administrar
El líder de mentores **no** obtiene `MANAGE_STAFF`, `MANAGE_ROLES`, `MANAGE_CELLS`,
`MANAGE_TRAINEES`, `APPROVE_ACCOUNT_REQUEST` ni acceso al expediente de ningún aprendiz. Sus
permisos son nuevos y estrechos, con nombre propio, y se declaran en la matriz de
`UserRole`/`Permission` — no en `if` sueltos dentro de servicios. Un 403 no se resuelve dándole
un permiso de administrador.

## CL-05 · Backend: arquitectura intacta
Hexagonal por módulo y Spring Modulith entre módulos. Un módulo importa solo `<otro>/api`. El
dominio no conoce Spring, JPA ni Jackson. El controlador delega en **un** caso de uso. `Clock` e
`IdGenerator` inyectados; el día de una persona se deriva de su zona, nunca de `clock.today()`.
Migraciones Flyway **aditivas**, numeradas a partir de la primera versión libre (el inventario
llegó a **V44**), con cabecera que explica por qué no se reusa una columna existente. Nunca se
edita una migración aplicada. Pruebas obligatorias: dominio sin Spring, adaptadores con
Testcontainers, `ArchitectureTest` y `EndpointAuthorizationDeclarationTest` en verde.

## CL-06 · Frontend: la app sigue siendo la misma
Cinco pestañas: Hoy, Plan, Training, Comunidad, Yo. **Ninguna sexta.** Identidad crema/carbón/
dorado y componentes de `src/components` conservados. Se cumple `AGENTS.md`: Expo 57, un único
scroll por pantalla (`flexGrow: 1`, `paddingBottom: 36`, sin `maxHeight` anidado), `useResponsive`
con 14/18/32 y tablet a `maxWidth: 560` centrado, `keyboardShouldPersistTaps="handled"`, Jost
400/500/700, controles de 48–52 px, `useSystemBackHandler` en toda subpantalla y modal con gesto
real comprobado en Android e iOS. **Público de 50 a 60 años: cuerpo a 16 px**, jerarquía por
tamaño y espacio, y ningún estado comunicado solo por color. `npx tsc --noEmit` en cero.

## CL-07 · Un dato ausente nunca es un cero
Sin muestra, sin historial o sin cobertura se muestran como tales y se distinguen entre sí. Está
prohibido pintar 0 %, «al día» o un semáforo verde por falta de datos — es el error que ya se
pagó dos veces en este proyecto (D-120 y E-166). Todo número aparece con su denominador y con la
fecha de corte. El frontend no recalcula ninguna métrica.

## CL-08 · Comprobación honesta
Backend: `./scripts/test-cloud.sh` / `./mvnw clean verify` con JDK 25 y Testcontainers Cloud,
avisando y esperando a que el dueño apague la aplicación antes de correrlo. La verificación es la
línea `Tests run:` de surefire **y** de failsafe, no el código de salida. Frontend: `tsc` en cero
y recorrido real en dispositivo. Un bloqueo externo se registra como bloqueo; no se declara
aprobado nada que no se haya ejecutado.
