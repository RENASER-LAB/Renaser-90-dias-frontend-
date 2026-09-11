# SDD 001 · Mentoría y acompañamiento Renaser
Fecha: 2026-09-09. Estado: especificación y plan; implementación pendiente.

Este paquete prepara el trabajo de frontend y backend para el agente ejecutor. No acredita funcionalidades implementadas ni pruebas aprobadas. Las decisiones confirmadas y las propuestas operativas se distinguen en [clarifications.md](clarifications.md).

## Punto de partida real
- Frontend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-`, rama `master`, HEAD observado `f076afd`.
- Backend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-backend`, rama `master`, HEAD observado `3c590ad`, un commit local por delante de origin/master.
- En la comprobación final aparecieron cambios concurrentes en `RedisSessionConfig.java` y `RedisSessionConfigTest.java` del backend. Esta entrega no los realizó ni los modificó; el agente debe preservarlos y volver a comprobar Git antes de ejecutar.
- El frontend ya contiene pantallas y API de mentor. El backend ya contiene células, participantes, chat, evidencias, cursos y notificaciones. Ampliar esas piezas.
- No se modificó código de aplicación, no se instalaron skills/MCP y no se hicieron commits, push ni cambios de base de datos al elaborar este paquete. Los mockups preexistentes no son contratos de funcionalidades disponibles.

## Resultado que se busca
El mentor puede acompañar sin inscribirse en su programa personal, o realizar los mismos 90 días que el aprendiz. Los aprendices reciben consultas en una recepción durante sus días 1–3; desde el día 4 pasan a un grupo estable. El grupo y su chat permanecen; rota el mentor. Soporte ADMIN/ALCHEMIST mantiene la continuidad.

Confirmado por el usuario: capacidad inicial **10**, configurable; rotación **mensual**, configurable; evaluación por **evidencias entregadas durante la asignación**; avisos **en app y push**. El máximo ampliado solicitado es 15.

## Lectura y ejecución
1. [Constitución y reglas](constitution.md).
2. [Inventario del código y brechas](research.md).
3. [Requisitos funcionales](spec.md).
4. [Decisiones y aclaraciones](clarifications.md).
5. [Plan técnico y experiencia de usuario](plan.md).
6. [Contratos y permisos](contracts.md).
7. [Tareas ordenadas](tasks.md).
8. [Matriz de validación](validation.md).
9. [Prompt listo para el agente](PROMPT_PARA_AGENTE.md).

Los requisitos RF tienen trazabilidad a tareas y validaciones. El agente debe actualizar primero la especificación cuando una decisión de negocio cambie.

## Método y fuentes
Se adapta el flujo de [Hello SDD de MoureDev](https://github.com/mouredev/hello-sdd): constitución, especificación, clarificación, planificación, tareas, implementación y validación. Se consultaron su [plantilla de requisitos](https://github.com/mouredev/hello-sdd/blob/main/samples/spec.md) y [prompts de fases](https://github.com/mouredev/hello-sdd/blob/main/samples/prompts.md). Los requisitos y decisiones de Renaser son propios de este paquete.

Antes de escribir código Expo, consultar la [documentación exacta de SDK 57](https://docs.expo.dev/versions/v57.0.0/). Para push nativo: [Notifications SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) y [envío y recibos de Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/). La disponibilidad real de credenciales y builds deberá comprobarse en implementación.
