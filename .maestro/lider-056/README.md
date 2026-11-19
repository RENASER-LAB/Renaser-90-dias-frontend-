# Maestro — rediseño del líder de mentores (spec 056)

Yo → «Mis mentores» y lo que cuelga de él, con la cuenta del **líder** (`e2e-lider@renaser.test`; en `correr.sh`, la ranura `E2E_ADMIN_*`) y,
para el último, la de un **mentor** (`e2e-mentor@renaser.test`). Base local `renaser_e2e_056`, nunca producción. Antes: `siembra.sql`.
Cada archivo dice arriba qué FR / SC verifica y si crea o cambia algo.

| Flujo | Qué prueba | Cambia datos |
|---|---|---|
| `01-mis-mentores` | «Por resolver», cupo y colores de cada mentor, accesos del pie (FR-001 a FR-005, SC-001) | no |
| `02-ficha-del-mentor` | la ficha del mentor, «Como mentor» y sus botones (FR-021 a FR-024, FR-026) | no |
| `03-grupo-y-ficha-del-aprendiz` | el grupo y la ficha del aprendiz, con la evidencia y «Avisar a su mentor» (FR-011 a FR-016, FR-019, FR-020) | un mensaje al chat del mentor |
| `04-grupos-y-crear-grupo` | Grupos y el asistente hasta crear «E2E 056 M» (FR-006 a FR-008, SC-003) | crea un grupo |
| `05-consultas` | consultas de todos y de un mentor (FR-028) | no |
| `06-reporte-del-mes` | el reporte del mes (FR-031) | no |
| `07-mentor-abre-la-ficha-desde-el-chat` | el mentor abre la ficha desde el aviso del líder (FR-019) — cuenta del mentor | no |
| `08-asignar-un-grupo-sin-mentor` | asignar en cuatro toques (SC-002, FR-009) | le pone mentor a un grupo |

`04` y `08` cambian datos: `limpiar.sql` los devuelve a como estaban para poder repetirlos. Se corren de a uno con
`.maestro/correr.sh .maestro/lider-056/<flujo>.yaml` (limpia la app con `pm clear`: si la build debug apunta a un Metro que no es el 8081, esa preferencia se pierde) o, sin limpiar,
con `~/.config/renaser-e2e/herramientas/correr-sin-borrar.sh` (o `cambiar-cuenta.sh` + `maestro test`). El orden recomendado: 01, 02, 05, 06, 03, 07 (necesita el mensaje que deja el 03), 04, 08, y `limpiar.sql`.

No se prueba con Maestro lo que manda mensajes o genera documentos en el servidor (guardar una observación, «Recordar al mentor», «Responder yo», «Descargar semana»,
«Exportar el reporte»): lo cubren Jest y el E2E del backend.

Lo que se aprendió corriéndolos (2026-11-18):

- El texto de `inputText` va de a ~10 s por letra y se corta a los 120 s: nombres de hasta ~9 letras («E2E 056 M»).
- Maestro no distingue mayúsculas: «Hoy» también es la pestaña «HOY». Para el rótulo de un día se usa el nombre accesible («Hoy\\. .*»).
- Las líneas de confirmación duran 4 s y Maestro tarda ~10 s por toque: no se comprueban; se comprueba lo que queda (la hoja cerrada, el mensaje en el chat del mentor).
- El botón de la hoja «Asignar mentor» dice «Asignar a <mentor>» cuando hay uno elegido.
