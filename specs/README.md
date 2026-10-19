# Specs

| Spec | Dónde vive | Qué es |
|---|---|---|
| 001 – 003 | esta carpeta | Mentoría, líder de mentores, admin y alquimista (formato propio, anterior a spec-kit) |
| 001-habitos-por-rol | **backend**: `Renaser-90-dias-backend/specs/001-habitos-por-rol/` | Hábitos globales por rol (D-264), flujo spec-kit. Cubre los dos repos; la parte de la app es «Hábitos del programa» en Administración |
| 002-soporte-ti-interruptores | **backend**: `Renaser-90-dias-backend/specs/002-soporte-ti-interruptores/` | Rol Soporte TI, interruptores por funcionalidad y rol, apagado de la IA, despliegue progresivo y roles personalizados. En la app: lectura de interruptores, aviso «En mantenimiento» y la consola |
| 003-kilometros-medidos | **backend**: `Renaser-90-dias-backend/specs/003-kilometros-medidos/` | Km del día medidos por el teléfono sin instalar otra app (Recording API de Play services) y sesión con GPS. En la app vive casi todo: módulo nativo `renaser-pasos`, sincronización y pantallas |
| 002-habitos-cambio-de-dia | [Backend: spec](../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/spec.md) | Cierre en la zona del participante, actualización de Training y protección de envíos antiguos (D-268/E-615); [plan](../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/plan.md), [tareas](../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/tasks.md) |
| 005-lider-cumplimiento-por-persona | **backend**: `Renaser-90-dias-backend/specs/005-lider-cumplimiento-por-persona/` | El líder de mentores ve el cumplimiento de cada persona por grupo, con sus evidencias. Cubre los dos repos; la parte de la app son las dos pantallas de `features/lider-mentores` (grupo y persona), las tarjetas abribles del semáforo por grupos, «Ver publicación» en las fichas y el aviso en Yo → Notificaciones |

Las specs nuevas se arman con spec-kit (`/speckit-specify`, `/speckit-plan`…; constitución en
`.specify/memory/constitution.md`, la misma en los dos repos). Una spec que toca los dos repos vive en el backend y
se anota acá, sin copiarla.
