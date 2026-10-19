# Specs

| Spec | Dónde vive | Qué es |
|---|---|---|
| 001 – 003 | esta carpeta | Mentoría, líder de mentores, admin y alquimista (formato propio, anterior a spec-kit) |
| 001-habitos-por-rol | **backend**: `Renaser-90-dias-backend/specs/001-habitos-por-rol/` | Hábitos globales por rol (D-264), flujo spec-kit. Cubre los dos repos; la parte de la app es «Hábitos del programa» en Administración |
| 002-soporte-ti-interruptores | **backend**: `Renaser-90-dias-backend/specs/002-soporte-ti-interruptores/` | Rol Soporte TI, interruptores por funcionalidad y rol, apagado de la IA, despliegue progresivo y roles personalizados. En la app: lectura de interruptores, aviso «En mantenimiento» y la consola |
| 003-kilometros-medidos | **backend**: `Renaser-90-dias-backend/specs/003-kilometros-medidos/` | Km del día medidos por el teléfono sin instalar otra app (Recording API de Play services) y sesión con GPS. En la app vive casi todo: módulo nativo `renaser-pasos`, sincronización y pantallas |
| 002-habitos-cambio-de-dia | [Backend: spec](../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/spec.md) | Cierre en la zona del participante, actualización de Training y protección de envíos antiguos (D-268/E-615); [plan](../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/plan.md), [tareas](../../Renaser-90-dias-backend/specs/002-habitos-cambio-de-dia/tasks.md) |
| 006-mensaje-semaforo-y-podio | [Backend: spec](../../Renaser-90-dias-backend/specs/006-mensaje-semaforo-y-podio/spec.md) | Mensaje del día en la tarjeta del semáforo de Hoy, con sticker del búho y elegido por el servidor (V110), y «Descargar» la imagen 9:16 del podio en Comunidad → Ranking para Líder de mentores, Alquimista, Administrador y Soporte TI (permiso `EXPORT_RANKING`); [plan](../../Renaser-90-dias-backend/specs/006-mensaje-semaforo-y-podio/plan.md), [tareas](../../Renaser-90-dias-backend/specs/006-mensaje-semaforo-y-podio/tasks.md). En la app: `semaforo/` (mensaje y stickers) y `ranking/` (imagen y compartir) |

Las specs nuevas se arman con spec-kit (`/speckit-specify`, `/speckit-plan`…; constitución en
`.specify/memory/constitution.md`, la misma en los dos repos). Una spec que toca los dos repos vive en el backend y
se anota acá, sin copiarla.
