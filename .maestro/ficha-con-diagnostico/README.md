# Ficha con diagnóstico (spec 026) — la persona

Flujos de Maestro del recorrido de la persona por el diagnóstico. **Escritos y sin correr**: piden el backend con la spec 026, el
diagnóstico del dueño (`diagnostico-inicial.csv` de `specs/026-ficha-con-diagnostico/` del backend) importado y publicado, un
emulador libre y cuentas sembradas en la base **local** (nunca producción). Cada archivo dice arriba su precondición.

| Flujo | La ranura `aprendiz` apunta a | Qué prueba |
|---|---|---|
| `01-persona-completa-el-diagnostico` | una cuenta nueva, aceptada «con diagnóstico» | portada, pasos, falta la edad, cierre y que sigue Términos (no la ficha estándar) |
| `02-persona-retoma` | la misma, sin pasos guardados | lo escrito sobrevive a que Android mate la app; un paso guardado se retoma |
| `03-persona-condicional` | la misma | el negocio con «Sí.» / «No.», casillas con máximo 2 y una obligatoria sin responder |
| `04-persona-ya-dentro-completa-el-diagnostico` | una cuenta con el onboarding terminado y el diagnóstico asignado después | la tarjeta de Hoy, el recorrido y el cierre hacia Plan |

`comun/diagnostico-responder-el-paso.yaml` contesta lo que se ve con la respuesta más corta válida (reconoce cada pregunta por su
texto, así que no depende de cómo se reparte en pasos). Los textos que se escriben son de una letra: `inputText` tarda ~10 s por
letra (Maestro #3667, ver el README de `.maestro`).

Los flujos 01 a 03 NO empiezan con `ya-adentro`: la cuenta aún no completó su ingreso y `correr.sh` la deja en la ficha de ingreso. Se
corren de a uno y cada uno necesita una cuenta SIN avance: `.maestro/correr.sh .maestro/ficha-con-diagnostico/01-…yaml`, con una
base recién clonada o reiniciando `diagnostico_respuestas`/`estado_onboarding` de esa cuenta entre uno y otro.
