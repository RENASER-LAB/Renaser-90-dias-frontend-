# Ficha con diagnóstico (spec 026)

Flujos de Maestro del recorrido de la persona por el diagnóstico (01–04), de Administración → Fichas (10–13) y de Plan, Hoy y el Mapa retirado (20–22). **Escritos y sin correr**: piden el backend con la spec 026, el
diagnóstico del dueño (`diagnostico-inicial.csv` de `specs/026-ficha-con-diagnostico/` del backend) importado y publicado, un
emulador libre y cuentas sembradas en la base **local** (nunca producción). Cada archivo dice arriba su precondición.

| Flujo | La ranura `aprendiz` apunta a | Qué prueba |
|---|---|---|
| `01-persona-completa-el-diagnostico` | una cuenta nueva, aceptada «con diagnóstico» | portada, pasos, falta la edad, cierre y que sigue Términos (no la ficha estándar) |
| `02-persona-retoma` | la misma, sin pasos guardados | lo escrito sobrevive a que Android mate la app; un paso guardado se retoma |
| `03-persona-condicional` | la misma | el negocio con «Sí.» / «No.», casillas con máximo 2 y una obligatoria sin responder |
| `04-persona-ya-dentro-completa-el-diagnostico` | una cuenta con el onboarding terminado y el diagnóstico asignado después | la tarjeta de Hoy, el recorrido y el cierre hacia Plan |
| `10-admin-fichas-y-editor` | `admin` | Más opciones → «Fichas», la lista, el editor y que el atrás sube un nivel por vez |
| `11-admin-quitar-preguntas` | `admin` | el modo «Quitar preguntas» y cancelar sin tocar nada |
| `12-admin-publicar-pide-la-declaracion` | `admin` | publicar bloqueado hasta que la declaración deje de ser de relleno |
| `13-admin-asigna-el-diagnostico-a-varias` | `admin` | «Asignar a varias personas»: buscar, marcar y volver |
| `20-plan-objetivos-por-confirmar` … `22-sin-diagnostico-escribe-objetivos-en-plan` | `aprendiz` | Plan con los objetivos por confirmar, Hoy sin el Mapa y escribir los objetivos sin diagnóstico |

`comun/diagnostico-responder-el-paso.yaml` contesta lo que se ve con la respuesta más corta válida (reconoce cada pregunta por su
texto, así que no depende de cómo se reparte en pasos). Los textos que se escriben son de una letra: `inputText` tarda ~10 s por
letra (Maestro #3667, ver el README de `.maestro`).

Los flujos 01 a 03 NO empiezan con `ya-adentro`: la cuenta aún no completó su ingreso y `correr.sh` la deja en la ficha de ingreso. Se
corren de a uno y cada uno necesita una cuenta SIN avance: `.maestro/correr.sh .maestro/ficha-con-diagnostico/01-…yaml`, con una
base recién clonada o reiniciando `diagnostico_respuestas`/`estado_onboarding` de esa cuenta entre uno y otro.
