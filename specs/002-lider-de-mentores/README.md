# SDD 002 · Rol Líder de Mentores

Fecha: 2026-09-09. Estado: especificación y plan. **Implementación pendiente: este paquete no
cambió una sola línea de código de aplicación.**

Paquete canónico para backend y frontend, hermano del
[SDD 001 · Mentoría y acompañamiento](../001-mentoria-acompanamiento/README.md). Se lee igual y
respeta sus decisiones; donde discrepa, lo dice a la cara (§ Frontera con el 001).

## Qué cubre este paquete

El rol `MENTOR_LEAD` tiene **dos mitades**, y solo una es trabajo:

1. **Recorrer el programa de 90 días como un aprendiz.** Ya funciona hoy y **no se toca**.
   `Permission.TRACK_PROGRAM_AS_STAFF` y `GET/POST /api/v1/mentor/activate-tracking` existen y
   admiten a `MENTOR_LEAD` desde `ParticipacionProgramaService:67`. Lo único que hace falta es
   que la app no lo trate como aprendiz sin programa — y eso ya lo resuelve el 001 para el
   mentor, con el mismo mecanismo. **Reutilizar, no duplicar.**
2. **Gestionar al cuerpo de mentores.** Esto sí es nuevo: ver a cada mentor, seguirlo contra el
   programa, hablarle cuando algo va bien o mal, dejar la observación registrada, y leer un
   reporte. **Es lo que especifica este paquete.**

## Qué NO cubre, a propósito

- **La lógica de mentoría en desarrollo**: recepción, grupos, cupos, rotación, sincronización de
  chat, fórmula de cumplimiento y evaluación mensual del mentor. Todo eso es del 001 y de otro
  agente. Este paquete **lee** ese resultado por API pública y **nunca lo recalcula ni lo escribe**.
- Convertir al líder en administrador. No recibe `MANAGE_STAFF`, `MANAGE_CELLS`, `MANAGE_ROLES`,
  `MANAGE_TRAINEES` ni `APPROVE_ACCOUNT_REQUEST`.
- Ver el expediente personal de los aprendices. El líder gestiona **mentores**, no alumnos.
- Rediseño global, sexta pestaña, IA, RAG, chatbot, pagos.

## Punto de partida real, verificado hoy

- Frontend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-frontend-`, `master`, HEAD `f076afd`.
  `specs/` y `docs/mockups/` están **sin versionar** (son del 001). Preservarlos.
- Backend: `/home/ricardo/Documentos/Renaser/Renaser-90-dias-backend`, `master`, HEAD `3c590ad`.
- **No existe ningún módulo de reportes en el backend.** Se buscó: cero coincidencias reales.
- El frontend menciona `MENTOR_LEAD` en **dos** lugares, ambos etiquetas de texto
  (`chat/api/chatMappers.ts:25`, `community/api/wallMappers.ts:31` → «Líder de Mentores»).
  No hay pantalla, hook, ni navegación para el rol.

## Frontera con el 001 (leer antes de escribir código)

| Zona | Dueño | Regla |
|---|---|---|
| `community` (células, recepción, cupos, rotación) | 001 | 002 **no** escribe. Lee por `community.api`. |
| `chat` (sincronización de miembros, permisos de grupo) | 001 | 002 solo **usa** el directo existente. |
| `evidence`, `habits`, `points` (fórmula de cumplimiento) | 001 | 002 **consume** el resultado. No hay segunda fórmula. |
| `notifications` (push nativo) | 001 | 002 reutiliza lo que quede. No abre un segundo transporte. |
| `users`: `ParticipacionPrograma*`, activación personal | 001 | 002 no toca esos archivos. |
| `users`: `Permission`, `UserRole`, `MentorProfileService` | **002** | El 001 no los modifica. |
| `support`: tickets de mentoría | **002** | El 001 no menciona `support` en ningún documento. |
| Módulo nuevo `leadership` | **002** | Archivos nuevos. Cero solapamiento. |
| `src/features/mentor/**` | 001 | 002 no lo abre. |
| `src/features/lider-mentores/**` | **002** | Carpeta nueva. |
| `HoyScreen.tsx`, `ComunidadScreen.tsx` | **compartido** | Único solape real. Ver [plan.md](plan.md) §7. |

**Discrepancia declarada.** `001/contracts.md` dice: *«MENTOR_LEAD usa permisos existentes: no
convertirlo en administrador por nombre»*. Este paquete comparte el fondo —el líder **no** se
vuelve admin— pero el dueño del proyecto acaba de definir un alcance de gestión para el rol, y
ese alcance necesita permisos **propios y estrechos**, no los de ADMIN. La reconciliación está en
[contracts.md](contracts.md) § Matriz.

## Lectura y ejecución

1. [Constitución y reglas](constitution.md)
2. [Inventario verificado y brechas](research.md)
3. [Requisitos funcionales](spec.md) — numerados **RL-nn** para no chocar con los RF-01..RF-30 del 001
4. [Decisiones y propuestas](clarifications.md)
5. [Plan técnico y de experiencia](plan.md)
6. [Contratos y permisos](contracts.md)
7. [Tareas ordenadas](tasks.md)
8. [Matriz de validación](validation.md)
9. [Prompt para el agente ejecutor](PROMPT_PARA_AGENTE.md)

## Método

Se adapta [Hello SDD de MoureDev](https://github.com/mouredev/hello-sdd): constitución →
especificación → clarificación → plan → tareas → implementación → validación. Los requisitos van
en notación EARS. El contenido de Renaser es propio.
