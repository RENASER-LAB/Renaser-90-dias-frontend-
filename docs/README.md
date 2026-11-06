# Documentos de la app

Mapa de esta carpeta. **Lo vigente** se mantiene al día; **lo histórico** se guarda para entender por qué algo es como
es, pero puede estar desactualizado: no lo tomes como regla sin compararlo con el código y con `docs/decisiones/`.

## Vigente

| Documento | Para qué |
|---|---|
| [`decisiones/README.md`](decisiones/README.md) | Lo que el dueño autorizó, decidió o mandó corregir, con fecha y tabs. Leer antes de tocar un tab. |
| [`PUBLICAR_EN_PLAY_STORE.md`](PUBLICAR_EN_PLAY_STORE.md) | Cómo se arma y publica el APK/AAB. |
| [`../.maestro/README.md`](../.maestro/README.md) | Cómo correr la suite de Maestro y qué precondición pide cada carpeta. |
| [`../e2e/`](../e2e/) | E2E web con Playwright. |
| `mockups/` | Imágenes de referencia de diseño. |

Las **specs** (qué se construye y cómo se acepta) y la **bitácora de errores** viven en el backend:
`../Renaser-90-dias-backend/specs/` y `../Renaser-90-dias-backend/docs/BITACORA_ERRORES.md`.

## Histórico (no vigente)

[`historial/`](historial/): avances, informes, planes y pendientes fechados de septiembre y octubre de 2026 (por
ejemplo, el Mapa de Renacimiento, que se retiró el 2026-10-31, o el build en Windows, que ya no se usa). Se movieron
ahí el 2026-11-06 sin cambiarles nada (también `AVANCES_RENASER_90_DIAS.md` y `SCHEMA_ARCHITECTURE.md`, que estaban en la
raíz y describían el plan con Supabase, descartado); los enlaces entre ellos siguen funcionando porque se movieron juntos.
