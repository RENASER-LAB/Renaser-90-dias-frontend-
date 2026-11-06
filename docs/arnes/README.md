# El arnés de la app

Esta app es un **perfil** del arnés de agentes de Ricardo (núcleo genérico aparte, en `~/Documentos/arnes`): el
perfil es `arnes.perfil.yaml` y el mapa de las 14 fases del curso a este repositorio, `docs/arnes/fases.md`.

El documento completo (lo que recomienda la comunidad en 2026 con sus fuentes, la metodología —spec-kit con un camino
corto y la observación como paso obligatorio—, el ciclo spec → preguntas → plan → tareas → implementación → E2E → PR, qué
cargar según lo que se toca, y el grafo primero con lo medido) vive en el backend, donde están las specs:
`../Renaser-90-dias-backend/docs/arnes/README.md`.

Lo propio de la app:

| Si tocas… | Lee | Pregúntale al grafo |
|---|---|---|
| Un tab (`Hoy`, `Plan`, `Training`, `Comunidad`, `Yo`) | `docs/decisiones/<tab>.md` (y su fila en el índice) | `graphify query "<Pantalla> <tema>"` |
| Una funcionalidad de `src/features/<x>/` | su spec en el backend (`specs/NNN-…`) y sus pruebas en `__tests__/` | `graphify explain "<componente o hook>"` |
| Alarmas o avisos del teléfono | `docs/decisiones/alarmas.md` | `graphify query "alarma <tema>"` |
| Un error que ya pasó | `docs/arnes/familias-de-errores.md` y la bitácora del backend | — |

Scripts: `scripts/worktree-nuevo.sh <rama>` (worktree con el grafo armado antes que nada y `node_modules` enlazado si el
`package-lock.json` es igual), `scripts/grafo-al-dia.sh` (el hook de graphify no corre en worktrees),
`scripts/worktree-cerrar.sh <rama>` (solo si ya se fusionó y no hay cambios) y `scripts/worktree-viejos.sh`.
