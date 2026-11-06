# Las 14 fases del arnés, en la app

El arnés de agentes tiene un **núcleo genérico** fuera de este repositorio (`~/Documentos/arnes`: el grafo del flujo,
los bucles con su presupuesto, el validador, las plantillas y un documento por cada lección del curso
*learn-harness-engineering*). Este repositorio es un **perfil**: `arnes.perfil.yaml` dice cómo se hace aquí cada nodo.

El mapa completo de las 14 fases a los dos repositorios está en el backend: `../Renaser-90-dias-backend/docs/arnes/fases.md`.
Lo propio de la app:

| Fase | Aquí |
|---|---|
| 04 · instrucciones divididas | `AGENTS.md` ≤ 200 líneas (`src/__tests__/harness/agentsCorto.test.ts`) y `docs/decisiones/` por tab |
| 05 · continuidad | `PROGRESO.md` (`progreso.test.ts`) y el hook de inicio `scripts/inicio-de-sesion.mjs` |
| 06 · inicialización | `scripts/worktree-nuevo.sh` (grafo de código primero, `node_modules` enlazado si el lock coincide) |
| 09 · no declarar victoria | `npm run verificar`: sale con 2 si algo quedó sin correr; `familiasDeErrores.test.ts` |
| 10 · E2E | `.maestro/` y `npm run verificar -- --e2e`; `scripts/flujos-sin-correr.mjs` cuenta la deuda |
| 12 · estado limpio | `scripts/worktree-cerrar.sh`, `scripts/worktree-viejos.sh`, `scripts/grafo-al-dia.sh` |
| 13–14 · bucles y grafo | `arnes.perfil.yaml`, validado en cada `npm run verificar` (paso «Grafo de agentes y perfil del arnés») |

graphify sigue siendo la herramienta de **búsqueda** en el código (`graphify query`); no es el grafo del flujo de agentes.
