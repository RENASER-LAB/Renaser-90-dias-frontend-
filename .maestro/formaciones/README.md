# Formaciones (spec 022)

Flujos de Maestro de las tres formaciones: Escuela, Diplomado y Certificación, aisladas entre sí. **Escritos y sin correr**: piden el
backend con la spec 022 (V125–V128), un emulador libre y cuentas sembradas en la base **local** (nunca producción). Cada archivo dice
arriba su precondición.

`correr.sh` abre la sesión por adb con la cuenta de la ranura que pide cada flujo (`# cuenta: aprendiz|admin`). Las ranuras son solo
eso, ranuras: para estos flujos `E2E_APRENDIZ_*` apunta a la cuenta que el archivo dice (de la Escuela, del Diplomado, un mentor con
dos formaciones…) y `E2E_ADMIN_*` a Administración.

| Flujo | Ranura `aprendiz` apunta a | Qué prueba |
|---|---|---|
| `01-escuela-sin-rastro-del-diplomado` | un aprendiz de la Escuela | Hoy no nombra la formación y Yo no ofrece cambiarla |
| `02-diplomado-de-un-anio` | un aprendiz del Diplomado de 1 año, en su fase 1 | Hoy dice «Diplomado Renaser» y la tarjeta de fase usa el rango estirado (días 1–28) |
| `03-personal-con-dos-formaciones` | un mentor asignado a Escuela y Diplomado | la pregunta de la primera vez, el nombre fijo y «Cambiar de formación» |
| `04-personal-sin-formacion` | un mentor sin ninguna formación | el aviso «Administración todavía no te asignó una formación» |
| `05-admin-formaciones` | (ranura `admin`) | Administración → Formaciones: las tres, el detalle y las listas filtradas |
| `06-admin-traslado` | (ranura `admin`) | pasar a un aprendiz que terminó a otra formación, con su historial |

Sembrado mínimo (en la base local, con las cuentas de `~/.config/renaser-e2e/`): un aprendiz de la Escuela, uno del Diplomado de 365
días (`participantes_programa.formacion = 'DIPLOMADO'`, `duracion_dias = 365`), un mentor con filas en `formaciones_personal` para
`ESCUELA` y `DIPLOMADO`, otro mentor sin ninguna fila y un aprendiz de la Escuela con `programa_completado = true` para el traslado.
