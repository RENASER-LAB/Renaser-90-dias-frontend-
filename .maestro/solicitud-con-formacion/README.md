# Aceptar una solicitud con formación (spec 025)

Flujos de Maestro de Administración → Solicitudes. **Escritos y sin correr**: piden el backend con la spec 025 (V140–V141), un emulador libre y solicitudes
PENDIENTES sembradas en la base **local** (nunca producción). Cada archivo dice arriba su precondición y su cuenta (`# cuenta: admin`).

| Flujo | Qué prueba |
|---|---|
| `01-aceptar-aprendiz-de-la-escuela-en-dos-toques` | todo viene marcado (Escuela, Aprendiz, sin diagnóstico): «Aceptar» y «Aceptar»; luego «Aceptadas» dice qué se eligió |
| `02-aceptar-aprendiz-del-diplomado-de-un-anio` | el Diplomado pide la duración, «Con diagnóstico», la frase del resumen y el filtro por formación |
| `03-aceptar-mentor-en-dos-formaciones` | el personal marca varias formaciones; Administración no pide ninguna |
| `04-aceptar-varias-a-la-vez` | selección múltiple con una misma elección |
| `05-cambiar-la-duracion-de-quien-ya-empezo` | de 3 meses a 1 año con motivo, conserva su día |
| `06-la-ficha-dice-como-entro` | la ficha de la persona dice lo mismo que la lista de «Aceptadas»: quién, cuándo, formación, duración, rol y diagnóstico |

Criterio de aislamiento (SC-007), para el E2E: una persona aceptada en el Diplomado no aparece en ninguna lista, grupo ni chat de la Escuela, y entra a la recepción de **su** formación.
`comun-abrir-solicitudes.yaml` solo lo incluyen los demás flujos de la carpeta.
