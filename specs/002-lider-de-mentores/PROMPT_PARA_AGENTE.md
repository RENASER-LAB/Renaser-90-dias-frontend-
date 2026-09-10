# Prompt para el agente ejecutor

Copiá el bloque de abajo a tu agente cuando quieras empezar la implementación.

---

Trabajás en Renaser sobre el SDD guardado en:
`/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-/specs/002-lider-de-mentores/README.md`.

Frontend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-`.
Backend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-backend`.

Ambos estaban en `master` al planificar. Verificá el estado actual y conservá todo cambio del
usuario, incluidos los archivos sin versionar de `specs/` y `docs/mockups/`. No hagas reset,
checkout destructivo, pull con sobrescritura, commit, push ni despliegue. No uses subagentes.

Leé `AGENTS.md` y `CLAUDE.md` del frontend, y `CLAUDE.MD` y `.claude/rules/` del backend. Después
leé el paquete completo en el orden del README.

**Lo primero y más importante: este paquete convive con el SDD 001, que otro agente está
implementando.** Leé la tabla «Frontera con el 001» del README antes de abrir un archivo. No
escribas en `community`, `chat`, `evidence`, `habits`, `points`, `notifications` ni en
`src/features/mentor/**`. Si necesitás un dato de ahí, se consume por API pública; si todavía no
existe, se muestra como no disponible y se anota la dependencia. **Nunca copies ni reimplementes
la fórmula de cumplimiento del 001.**

Alcance, confirmado por el dueño del proyecto el 2026-09-09:

- El líder de mentores hace lo mismo que un aprendiz y puede llevar el programa de 90 días. **Esa
  parte ya funciona y no se toca**; solo se reutiliza el gate de navegación que el 001 define para
  staff sin programa personal.
- El rol es gestionar mentores y darles seguimiento de acuerdo al programa.
- Les habla cuando algo está mal o está bien, con el mensaje que él escribe y confirma.
- Hay un módulo de reporte para la gestión de mentores y las observaciones.
- El frontend lleva diseño de experto en UX que no parezca hecho por IA, coherente con la app
  actual, para un público de 50 a 60 años.
- El alcance es **solo ese rol**. Nada de administración: el líder no recibe `MANAGE_STAFF`,
  `MANAGE_CELLS`, `MANAGE_ROLES`, `MANAGE_TRAINEES` ni `APPROVE_ACCOUNT_REQUEST`, ni ve el
  expediente de ningún aprendiz.

Distinguí esas decisiones (DL-01..DL-07) de las propuestas PL-01..PL-10 de `clarifications.md`.
Resolvé con el dueño solo las que afecten una regla de negocio antes de programarla —en
particular **PL-01** (cerrar el falla-abierto A-1 para este rol) y **PL-02** (si el líder mueve el
semáforo operativo). No vuelvas a preguntar lo ya respondido, no des una propuesta por aprobada
por inferencia, y seguí con las tareas independientes mientras esperás.

Empezá comparando `research.md` con el código real. Si el 001 ya aterrizó el historial de
asignaciones, el motor de cumplimiento o el gate de navegación, **reutilizalo y recortá el plan**.

Orden de trabajo: `tasks.md`, por dependencias, una tarea a la vez. **El bloque 1 (autorización)
va primero**: escribí la fila de permisos derivándola del inventario de endpoints, no de memoria,
y desplegala en modo sombra antes de hacerla cumplir. El riesgo real está explicado en
`research.md` §5: hoy `UserRole.can()` devuelve `true` para `MENTOR_LEAD` en todo, y cerrarlo mal
le rompe su propio programa de 90 días.

Para reglas de dominio y adaptadores, la prueba se escribe primero y **tiene que fallar contra el
código viejo**. Backend: hexagonal, Modulith, dominio sin Spring, `Clock` inyectado, migraciones
aditivas desde V45 con cabecera justificada, `ArchitectureTest` y
`EndpointAuthorizationDeclarationTest` en verde. `./mvnw clean verify` con Testcontainers Cloud,
**avisando y esperando a que el dueño apague la aplicación**; la verificación es la línea
`Tests run:`, no el código de salida.

Frontend: antes de escribir Expo, leé https://docs.expo.dev/versions/v57.0.0/. Respetá
`useResponsive`, Jost, un solo scroll, `useSystemBackHandler` con gesto real comprobado, controles
de 48–52 px y **cuerpo de 16 px**. Carpeta nueva `src/features/lider-mentores/`. Cinco pestañas,
ninguna sexta. `npx tsc --noEmit` en cero. No instales librerías ni skills por inspiración visual.

Un dato ausente **nunca** es un cero, un «al día» ni un verde. Todo número lleva su denominador,
su período, su zona y su corte.

Al terminar: archivos cambiados, trazabilidad `RL` → prueba, comprobaciones ejecutadas con su
salida real, capturas de la UI verificada, migraciones justificadas y dependencias externas
pendientes. No declares terminado nada que no haya pasado sus pruebas. Si el alcance cambia,
actualizá primero `spec.md`, `plan.md` y `tasks.md`, y después el código.

---
